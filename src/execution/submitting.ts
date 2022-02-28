import { BigNumber, Contract, PopulatedTransaction, Signer, utils } from "ethers";
import { task, types } from "hardhat/config";
import { safeSingleton } from "../contracts";
import { buildSafeTransaction, calculateSafeTransactionHash, populateExecuteTx, safeApproveHash, SafeSignature, SafeTransaction } from "@gnosis.pm/safe-contracts";
import { parseEther } from "@ethersproject/units";
import { getAddress } from "@ethersproject/address";
import { isHexString } from "ethers/lib/utils";
import { SafeTxProposal } from "./proposing";
import { loadSignatures, proposalFile, readFromCliCache } from "./utils";

const parsePreApprovedConfirmation = (data: string): SafeSignature => {
    const signer = getAddress("0x" + data.slice(26, 66))
    return {
        signer, data
    }
}

const parseTypeDataConfirmation = (safeTxHash: string, data: string): SafeSignature => {
    const signer = utils.recoverAddress(safeTxHash, data)
    return {
        signer, data
    }
}

const parseEthSignConfirmation = (safeTxHash: string, data: string): SafeSignature => {
    const signer = utils.recoverAddress(utils.hashMessage(utils.arrayify(safeTxHash)), data.replace(/1f$/, "1b").replace(/20$/, "1c"))
    return {
        signer, data
    }
}

const parseSignature = (safeTxHash: string, signature: string): SafeSignature => {
    if (!isHexString(signature, 65)) throw Error(`Unsupported signature: ${signature}`)
    const type = parseInt(signature.slice(signature.length - 2), 16)
    switch (type) {
        case 1: return parsePreApprovedConfirmation(signature)
        case 27:
        case 28:
            return parseTypeDataConfirmation(safeTxHash, signature)
        case 31:
        case 32:
            return parseEthSignConfirmation(safeTxHash, signature)
        case 0:
        default:
            throw Error(`Unsupported type ${type} in ${signature}`)
    }
}

const isOwnerSignature = (owners: string[], signature: SafeSignature): SafeSignature => {
    if (owners.indexOf(signature.signer) < 0) throw Error(`Signer ${signature.signer} not found in owners ${owners}`)
    return signature
}

const prepareSignatures = async (safe: Contract, tx: SafeTransaction, signaturesCSV: string | undefined, submitter?: Signer, knownSafeTxHash?: string): Promise<SafeSignature[]> => {
    const owners = await safe.getOwners()
    const signatures = new Map<String, SafeSignature>()
    const submitterAddress = submitter && await submitter.getAddress()
    if (signaturesCSV) {
        const chainId = (await safe.provider.getNetwork()).chainId
        const safeTxHash = knownSafeTxHash ?? calculateSafeTransactionHash(safe, tx, chainId)
        for (const signatureString of signaturesCSV.split(",")) {
            const signature = isOwnerSignature(owners, parseSignature(safeTxHash, signatureString))
            if (submitterAddress === signature.signer || signatures.has(signature.signer)) continue
            signatures.set(signature.signer, signature)
        }
    }
    const threshold = (await safe.getThreshold()).toNumber()
    const submitterIsOwner = submitterAddress && owners.indexOf(submitterAddress) >= 0
    const requiredSigntures = submitterIsOwner ? threshold - 1 : threshold
    if (requiredSigntures > signatures.size) throw Error(`Not enough signatures (${signatures.size} of ${threshold})`)
    const signatureArray = []
    if (submitterIsOwner) {
        signatureArray.push(await safeApproveHash(submitter!!, safe, tx, true))
    }
    return signatureArray.concat(Array.from(signatures.values()).slice(0, requiredSigntures))
}

task("submit-tx", "Executes a Safe transaction")
    .addPositionalParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addParam("to", "Address of the target", undefined, types.string)
    .addParam("value", "Value in ETH", "0", types.string, true)
    .addParam("data", "Data as hex string", "0x", types.string, true)
    .addParam("signatures", "Comma seperated list of signatures", undefined, types.string, true)
    .addParam("gasPrice", "Gas price to be used", undefined, types.int, true)
    .addParam("gasLimit", "Gas limit to be used", undefined, types.int, true)
    .addFlag("delegatecall", "Indicator if tx should be executed as a delegatecall")
    .setAction(async (taskArgs, hre) => {
        console.log(`Running on ${hre.network.name}`)
        const [signer] = await hre.ethers.getSigners()
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress} with ${signer.address}`)
        const nonce = await safe.nonce()
        if (!isHexString(taskArgs.data)) throw Error(`Invalid hex string provided for data: ${taskArgs.data}`)
        const tx = buildSafeTransaction({ 
            to: taskArgs.to, 
            value: parseEther(taskArgs.value), 
            data: taskArgs.data, 
            nonce, 
            operation: taskArgs.delegatecall ? 1 : 0 
        })
        const signatures = await prepareSignatures(safe, tx, taskArgs.signatures, signer)
        const populatedTx: PopulatedTransaction = await populateExecuteTx(safe, tx, signatures, { gasLimit: taskArgs.gasLimit, gasPrice: taskArgs.gasPrice })
        const receipt = await signer.sendTransaction(populatedTx).then(tx => tx.wait())
        console.log(receipt.transactionHash)
    });


task("submit-proposal", "Executes a Safe transaction")
    .addPositionalParam("hash", "Hash of Safe transaction to display", undefined, types.string)
    .addParam("signerIndex", "Index of the signer to use", 0, types.int, true)
    .addParam("signatures", "Comma seperated list of signatures", undefined, types.string, true)
    .addParam("gasPrice", "Gas price to be used", undefined, types.int, true)
    .addParam("gasLimit", "Gas limit to be used", undefined, types.int, true)
    .addFlag("buildOnly", "Flag to only output the final transaction")
    .setAction(async (taskArgs, hre) => {
        console.log(`Running on ${hre.network.name}`)
        const proposal: SafeTxProposal = await readFromCliCache(proposalFile(taskArgs.hash))
        const signers = await hre.ethers.getSigners()
        const signer = signers[taskArgs.signerIndex]
        const safe = await safeSingleton(hre, proposal.safe)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress} with ${signer.address}`)
        const currentNonce = await safe.nonce()
        if (!BigNumber.from(proposal.tx.nonce).eq(currentNonce)) {
            throw Error("Proposal does not have correct nonce!")
        }
        const signatureStrings: Record<string, string> = await loadSignatures(taskArgs.hash)
        const signatureArray = Object.values(signatureStrings)
        if (taskArgs.signatures) {
            signatureArray.push(taskArgs.signatures)
        }
        const signatures = await prepareSignatures(safe, proposal.tx, signatureArray.join(","), signer, taskArgs.hash)
        const populatedTx: PopulatedTransaction = await populateExecuteTx(safe, proposal.tx, signatures, { gasLimit: taskArgs.gasLimit, gasPrice: taskArgs.gasPrice })
        
        if (taskArgs.buildOnly) {
            console.log("Ethereum transaction:", populatedTx)
            return
        }
        
        const receipt = await signer.sendTransaction(populatedTx).then(tx => tx.wait())
        console.log("Ethereum transaction hash:", receipt.transactionHash)
        return receipt.transactionHash
    });