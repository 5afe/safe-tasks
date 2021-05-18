import { calculateSafeTransactionHash, EIP712_SAFE_TX_TYPE } from '@gnosis.pm/safe-contracts'
import { getSafeL2SingletonDeployment } from '@gnosis.pm/safe-deployments'
import { BigNumber, ethers } from 'ethers'
import { EtherDetails, EventTx, ModuleTx, MultisigTx, MultisigUnknownTx, TransferDetails, TransferTx } from './types'

const erc20InterfaceDefinition = [
    "event Transfer(address indexed from, address indexed to, uint256 amount)"
]
const erc20OldInterfaceDefinition = [
    "event Transfer(address indexed from, address to, uint256 amount)"
]
const erc721InterfaceDefinition = [
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
]
const erc20Interface = new ethers.utils.Interface(erc20InterfaceDefinition)
const erc20OldInterface = new ethers.utils.Interface(erc20OldInterfaceDefinition)
const erc721Interface = new ethers.utils.Interface(erc721InterfaceDefinition)
// The same for all interfaces as `indexed` has no impact on the topic
const transferTopic = erc20Interface.getEventTopic("Transfer")

const safeAbi = getSafeL2SingletonDeployment({ released: undefined })!!.abi
const safeInterface = new ethers.utils.Interface(safeAbi)
const successTopic = safeInterface.getEventTopic("ExecutionSuccess")
const failureTopic = safeInterface.getEventTopic("ExecutionFailure")
const multisigDetailsTopic = safeInterface.getEventTopic("SafeMultiSigTransaction")
const moduleSuccessTopic = safeInterface.getEventTopic("ExecutionFromModuleSuccess")
const moduleFailureTopic = safeInterface.getEventTopic("ExecutionFromModuleFailure")
const moduleDetailsTopic = safeInterface.getEventTopic("SafeModuleTransaction")
const etherReceivedTopic = safeInterface.getEventTopic("SafeReceived")
// Failure topics cannot generate sub events, we should remove them in the future
const parentTopics = [successTopic, moduleSuccessTopic, failureTopic, moduleFailureTopic]
const detailsTopics = [multisigDetailsTopic, moduleDetailsTopic]

const loadBlock = async (provider: ethers.providers.Provider, blockHash: string): Promise<ethers.providers.Block> => {
    return await provider.getBlock(blockHash)
}

const loadEthTx = async (provider: ethers.providers.Provider, txHash: string): Promise<ethers.providers.TransactionResponse> => {
    return await provider.getTransaction(txHash)
}

export interface DecodedMultisigTx {
    to: string
    value: string
    data: string
    operation: number
    safeTxGas: string
    baseGas: string
    gasPrice: string
    gasToken: string
    refundReceiver: string
    signatures: string
    nonce?: number
}

const decodeTx = (account: string, tx: ethers.providers.TransactionResponse): DecodedMultisigTx | undefined => {
    try {
        const result = safeInterface.decodeFunctionData("execTransaction", tx.data)
        if (tx.to !== account) return undefined
        return {
            to: result.to,
            value: result.value.toString(),
            data: result.data,
            operation: result.operation,
            safeTxGas: result.safeTxGas.toString(),
            baseGas: result.baseGas.toString(),
            gasPrice: result.gasPrice.toString(),
            gasToken: result.gasToken,
            refundReceiver: result.refundReceiver,
            signatures: result.signatures,
        }
    } catch (e) {
        // TODO: try to decode other ways 
        console.log("Unknown function", tx.data.slice(0, 10))
        return undefined
    }
}

const decodeMultisigDetails = (log: ethers.providers.Log | undefined): DecodedMultisigTx | undefined => {
    if (!log) return undefined
    const event = safeInterface.decodeEventLog("SafeMultiSigTransaction", log.data, log.topics)
    return {
        to: event.to,
        value: event.value.toString(),
        data: event.data,
        operation: event.operation,
        safeTxGas: event.safeTxGas.toString(),
        baseGas: event.baseGas.toString(),
        gasPrice: event.gasPrice.toString(),
        gasToken: event.gasToken,
        refundReceiver: event.refundReceiver,
        signatures: event.signatures,
        nonce: BigNumber.from(event.additionalInfo.slice(0, 66)).toNumber()
    }
}

const mutlisigTxEntry = async (provider: ethers.providers.Provider, account: string, nonceMapper: NonceMapper, log: ethers.providers.Log, safeTxHash: string, success: boolean, subLogs: ethers.providers.Log[], details: ethers.providers.Log | undefined): Promise<MultisigTx | MultisigUnknownTx> => {
    let decodedTx: DecodedMultisigTx | undefined
    decodedTx = decodeMultisigDetails(details)
    if (!decodedTx) {
        console.log("Fallback to transaction decoding")
        const ethTx = await loadEthTx(provider, log.transactionHash)
        decodedTx = decodeTx(account, ethTx)
    }
    const block = await loadBlock(provider, log.blockHash)
    if (!decodedTx) return {
        type: "MultisigUnknown",
        id: "multisig_" + safeTxHash,
        timestamp: block.timestamp,
        logs: subLogs,
        txHash: log.transactionHash,
        safeTxHash,
        success
    }
    return {
        type: "Multisig",
        id: "multisig_" + safeTxHash,
        timestamp: block.timestamp,
        logs: subLogs,
        txHash: log.transactionHash,
        safeTxHash,
        success,
        ...decodedTx,
        nonce: decodedTx.nonce || await nonceMapper.map(safeTxHash, decodedTx)
    }
}

const decodeModuleDetails = (log: ethers.providers.Log | undefined): any => {
    if (!log) return undefined
    const event = safeInterface.decodeEventLog("SafeModuleTransaction", log.data, log.topics)
    return event
}

const moduleTxEntry = async (provider: ethers.providers.Provider, log: ethers.providers.Log, moduleAddress: string, success: boolean, subLogs: ethers.providers.Log[], details: ethers.providers.Log | undefined): Promise<ModuleTx> => {
    console.log("Module details:", decodeModuleDetails(details))
    const block = await loadBlock(provider, log.blockHash)
    return {
        type: "Module",
        txHash: log.transactionHash,
        id: "module_" + log.blockNumber + " " + log.transactionIndex + " " + log.logIndex,
        timestamp: block.timestamp,
        module: moduleAddress,
        success,
        logs: subLogs
    }
}

const transferEntry = async (provider: ethers.providers.Provider, account: string, log: ethers.providers.Log): Promise<TransferTx | undefined> => {
    const block = await loadBlock(provider, log.blockHash)
    let type: string = ""
    let eventInterface
    if (log.topics.length === 4) {
        eventInterface = erc721Interface
        type = "ERC721"
    } else if (log.topics.length === 3) {
        eventInterface = erc20Interface
        type = "ERC20"
    } else if (log.topics.length === 2) {
        eventInterface = erc20OldInterface
        type = "ERC20"
    } else {
        return undefined
    }
    const event = eventInterface.decodeEventLog("Transfer", log.data, log.topics)
    let details: TransferDetails
    if (type === "ERC20") {
        details = {
            type: "ERC20",
            tokenAddress: log.address,
            value: event.amount.toString()
        }
    } else {
        details = {
            type: "ERC721",
            tokenAddress: log.address,
            tokenId: event.tokenId.toString()
        }
    }
    return {
        type: "Transfer",
        id: `transfer_${log.blockNumber}_${log.transactionIndex}_${log.logIndex}`,
        timestamp: block.timestamp,
        sender: event.from,
        receipient: event.to,
        direction: (event.to.toLowerCase() === account.toLowerCase() ? "INCOMING" : "OUTGOING"),
        details
    }
}

const incomingEthEntry = async (provider: ethers.providers.Provider, account: string, log: ethers.providers.Log): Promise<TransferTx> => {
    const block = await loadBlock(provider, log.blockHash)
    const event = safeInterface.decodeEventLog("SafeReceived", log.data, log.topics)
    let details: EtherDetails = {
        type: "ETHER",
        value: event.value.toString()
    }
    return {
        type: "Transfer",
        id: `transfer_${log.blockNumber}_${log.transactionIndex}_${log.logIndex}`,
        timestamp: block.timestamp,
        sender: event.sender,
        receipient: account,
        direction: "INCOMING",
        details
    }
}

const mapLog = async (provider: ethers.providers.Provider, account: string, nonceMapper: NonceMapper, group: GroupedLogs): Promise<EventTx | undefined> => {
    const { parent, children, details } = group
    switch (parent.topics[0]) {
        case successTopic: {
            const event = safeInterface.decodeEventLog("ExecutionSuccess", parent.data, parent.topics)
            return await mutlisigTxEntry(provider, account, nonceMapper, parent, event.txHash, true, children, details)
        }
        case failureTopic: {
            const event = safeInterface.decodeEventLog("ExecutionFailure", parent.data, parent.topics)
            return await mutlisigTxEntry(provider, account, nonceMapper, parent, event.txHash, false, children, details)
        }
        case moduleSuccessTopic: {
            const event = safeInterface.decodeEventLog("ExecutionFromModuleSuccess", parent.data, parent.topics)
            return await moduleTxEntry(provider, parent, event.module, true, children, details)
        }
        case moduleFailureTopic: {
            const event = safeInterface.decodeEventLog("ExecutionFromModuleFailure", parent.data, parent.topics)
            return await moduleTxEntry(provider, parent, event.module, false, children, details)
        }
        case transferTopic: {
            if (children.length > 0) console.error("Sub logs for transfer entry!", parent, children)
            return await transferEntry(provider, account, parent)
        }
        case etherReceivedTopic: {
            if (children.length > 0) console.error("Sub logs for transfer entry!", parent, children)
            return await incomingEthEntry(provider, account, parent)
        }
        default:
            console.error("Received unknown event", parent)
            return undefined
    }
}

const loadOutgoingTransfer = (provider: ethers.providers.Provider, account: string): Promise<ethers.providers.Log[]> => {
    const filter = {
        topics: [[transferTopic], [ethers.utils.defaultAbiCoder.encode(["address"], [account])]],
        fromBlock: "earliest"
    }
    return provider.getLogs(filter).then((e) => {
        console.log("OUT", e.length)
        return e
    })
}

const loadIncomingTransfer = (provider: ethers.providers.Provider, account: string): Promise<ethers.providers.Log[]> => {
    const filter = {
        topics: [[transferTopic], null as any, [ethers.utils.defaultAbiCoder.encode(["address"], [account])]],
        fromBlock: "earliest"
    }
    return provider.getLogs(filter).then((e) => {
        console.log("IN", e.length)
        return e
    })
}

const loadIncomingEther = (provider: ethers.providers.Provider, account: string): Promise<ethers.providers.Log[]> => {
    const filter = {
        topics: [[etherReceivedTopic]],
        address: account,
        fromBlock: "earliest"
    }
    return provider.getLogs(filter).then((e) => {
        console.log("ETH", e.length)
        return e
    })
}

const loadSafeModuleTransactions = (provider: ethers.providers.Provider, account: string): Promise<ethers.providers.Log[]> => {
    const filter = {
        topics: [[moduleSuccessTopic, moduleFailureTopic, moduleDetailsTopic]],
        address: account,
        fromBlock: "earliest"
    }
    return provider.getLogs(filter).then((e) => {
        console.log("MODULE", e.length)
        return e
    })
}

const loadSafeMultisigTransactions = (provider: ethers.providers.Provider, account: string): Promise<ethers.providers.Log[]> => {
    const filter = {
        topics: [[successTopic, failureTopic, multisigDetailsTopic]],
        address: account,
        fromBlock: "earliest"
    }

    return provider.getLogs(filter).then((e) => {
        console.log("MULTISIG", e.length)
        return e
    })
}

const isOlder = (compare: ethers.providers.Log | undefined, base: ethers.providers.Log | undefined) => {
    if (compare === undefined) return false
    if (base === undefined) return true
    if (compare.blockNumber != base.blockNumber) return compare.blockNumber < base.blockNumber
    if (compare.transactionIndex != base.transactionIndex) return compare.transactionIndex < base.transactionIndex
    if (compare.logIndex != base.logIndex) return compare.logIndex < base.logIndex
    return false // Equal defaults to false
}

/// Oldest first
const mergeLogs = async (...loaders: Promise<ethers.providers.Log[]>[]): Promise<ethers.providers.Log[]> => {
    const loaderCount = loaders.length
    if (loaderCount == 0) return []

    const logResults = await Promise.all(loaders)
    if (loaderCount == 1) return logResults[0]
    const currentLogIndex: number[] = new Array(loaderCount).fill(0)
    for (var i = 0; i < loaderCount; i++) currentLogIndex[i] = 0;
    const out: ethers.providers.Log[] = []
    var runs = 0
    // Panic check against endless loop (10k is max amount of events, per loader)
    while (runs < 10000 * loaderCount) {
        let resultIndex = 0
        let nextLog = logResults[0][currentLogIndex[0]]
        for (var i = 1; i < loaderCount; i++) {
            let candidate = logResults[i][currentLogIndex[i]]
            if (isOlder(candidate, nextLog)) {
                resultIndex = i
                nextLog = candidate
            }
        }
        currentLogIndex[resultIndex]++
        if (nextLog) out.push(nextLog)
        else break
        runs++
    }
    return out
}

interface GroupedLogs {
    parent: ethers.providers.Log,
    details?: ethers.providers.Log, // This is for L2 Safes, we expect the event order details -> children -> parent
    children: ethers.providers.Log[]
}

const groupIdFromLog = (log: ethers.providers.Log): string => `${log.blockNumber}_${log.transactionIndex}`

const updateGroupedLogs = (groups: GroupedLogs[], detailsCandidate: ethers.providers.Log | undefined, parentCandidate: ethers.providers.Log | undefined, currentChildren: ethers.providers.Log[]) => {
    if (parentCandidate) {
        groups.push({
            parent: parentCandidate,
            details: detailsCandidate,
            children: currentChildren
        })
    } else if (currentChildren.length > 0) {
        groups.push(...currentChildren.map((log) => { return { parent: log, children: [] } }))
    }
}

const groupLogs = (logs: ethers.providers.Log[]): GroupedLogs[] => {
    const out: GroupedLogs[] = []
    let currentChildren: ethers.providers.Log[] = []
    let detailsCandidates: ethers.providers.Log[] = []
    let parentCandidate: ethers.providers.Log | undefined
    let currentGroupId: string | undefined = undefined
    for (const log of logs) {
        const groupId = groupIdFromLog(log)
        const isParentCandidate = parentTopics.indexOf(log.topics[0]) >= 0
        const isDetailsCandidate = detailsTopics.indexOf(log.topics[0]) >= 0
        if (currentGroupId !== groupId || (isParentCandidate && parentCandidate)) {
            updateGroupedLogs(out, detailsCandidates.pop(), parentCandidate, currentChildren)
            parentCandidate = undefined
            detailsCandidates = []
            currentChildren = []
            currentGroupId = undefined
        }
        if (!currentGroupId) currentGroupId = groupId
        if (isParentCandidate) {
            parentCandidate = log
        } else if (isDetailsCandidate) {
            detailsCandidates.push(log)
        } else {
            currentChildren.push(log)
        }
    }
    updateGroupedLogs(out, detailsCandidates.pop(), parentCandidate, currentChildren)
    return out
}

class NonceMapper {

    safe: ethers.Contract
    lastNonce: number|undefined
    chainId: number|undefined

    constructor(provider: ethers.providers.Provider, account: string) {
        this.safe = new ethers.Contract(account, safeAbi, provider)
    }

    async init() {
        this.lastNonce = (await this.safe.nonce()).toNumber()
        this.chainId = (await this.safe.provider.getNetwork()).chainId
    }

    calculateHash111(tx: DecodedMultisigTx, nonce: number): string {
        return ethers.utils._TypedDataEncoder.hash({ verifyingContract: this.safe.address }, EIP712_SAFE_TX_TYPE, {...tx, nonce})
    }

    async map(expectedHash: string, tx: DecodedMultisigTx): Promise<number> {
        if (!this.lastNonce || !this.chainId) {
            await this.init()
        }
        for (let nonce = this.lastNonce!!; nonce >= 0; nonce--) {
            if (this.calculateHash111(tx, nonce) === expectedHash) return nonce
            if (calculateSafeTransactionHash(this.safe, {...tx, nonce}, this.chainId!!) === expectedHash) return nonce
        }
        return -1
    }
}

export const loadHistoryTxs = async (provider: ethers.providers.Provider, account: string, start: number): Promise<EventTx[]> => {
    const txLogs = await mergeLogs(
        loadSafeMultisigTransactions(provider, account),
        loadSafeModuleTransactions(provider, account),
        loadOutgoingTransfer(provider, account),
        loadIncomingTransfer(provider, account),
        loadIncomingEther(provider, account)
    )
    const nonceMapper = new NonceMapper(provider, account)
    await nonceMapper.init()
    const groups = groupLogs(txLogs.reverse())
    const inter = groups.slice(start, start + 5).map((group) => mapLog(provider, account, nonceMapper, group))
    return (await Promise.all(inter)).filter((e) => e !== undefined) as EventTx[]
}