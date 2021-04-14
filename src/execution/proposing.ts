import { task, types } from "hardhat/config";
import { contractFactory, multiSendLib, safeSingleton } from "../contracts";
import { buildMultiSendSafeTx, buildSafeTransaction, calculateSafeTransactionHash, SafeTransaction, MetaTransaction } from "@gnosis.pm/safe-contracts";
import { parseEther } from "@ethersproject/units";
import { getAddress, isHexString } from "ethers/lib/utils";
import { proposalFile, readFromCliCache, writeToCliCache } from "./utils";
import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";
import fs from 'fs/promises'
import { HardhatRuntimeEnvironment } from "hardhat/types";

export interface SafeTxProposal {
    safe: string,
    chainId: number,
    safeTxHash: string,
    tx: SafeTransaction
}

task("propose", "Create a Safe tx proposal json file")
    .addParam("address", "Address or ENS name of the Safe", undefined, types.string)
    .addParam("to", "Address of the target", undefined, types.string)
    .addParam("value", "Value in ETH", "0", types.string, true)
    .addParam("data", "Data as hex string", "0x", types.string, true)
    .addFlag("delegatecall", "Indicator if tx should be executed as a delegatecall")
    .setAction(async (taskArgs, hre) => {
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress}`)
        const nonce = await safe.nonce()
        if (!isHexString(taskArgs.data)) throw Error(`Invalid hex string provided for data: ${taskArgs.data}`)
        const tx = buildSafeTransaction({ to: taskArgs.to, value: parseEther(taskArgs.value).toString(), data: taskArgs.data, nonce: nonce.toString(), operation: taskArgs.delegatecall ? 1 : 0 })
        const chainId = (await safe.provider.getNetwork()).chainId
        const safeTxHash = calculateSafeTransactionHash(safe, tx, chainId)
        const proposal: SafeTxProposal = {
            safe: safeAddress,
            chainId,
            safeTxHash,
            tx
        }
        await writeToCliCache(proposalFile(safeTxHash), proposal)
        console.log(`Safe transaction hash: ${safeTxHash}`)
    });

interface TxDescription {
    to: string,
    value: string // in ETH
    method?: string
    params?: any[]
    operation: 0 | 1
}

const buildData = (method: string, params?: any[]): string => {
    const iface = new ethers.utils.Interface([`function ${method}`])
    return iface.encodeFunctionData(method, params)
}
 
const buildMetaTx = (description: TxDescription): MetaTransaction => {
    const to = getAddress(description.to)
    const value = parseEther(description.value).toString()
    const operation = description.operation
    const data = description.method ? buildData(description.method, description.params) : "0x"
    return { to, value, data, operation }
}

const parseMultiSendJsonFile = async(hre: HardhatRuntimeEnvironment, file: string, nonce: number): Promise<SafeTransaction> => {
    const txsData: TxDescription[] = JSON.parse(await fs.readFile(file, 'utf8'))
    if (txsData.length == 0) {
        throw Error("No transacitons provided")
    }
    if (txsData.length == 1) {
        return buildSafeTransaction({ ...buildMetaTx(txsData[0]), nonce: nonce })
    }
    const multiSend = await multiSendLib(hre)
    return buildMultiSendSafeTx(multiSend, txsData.map(desc => buildMetaTx(desc)), nonce)
}

task("propose-multisend", "Create a Safe tx proposal json file")
    .addParam("address", "Address or ENS name of the Safe", undefined, types.string)
    .addParam("txs", "Json file with transactions", undefined, types.inputFile)
    .setAction(async (taskArgs, hre) => {
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress}`)
        const nonce = await safe.nonce()
        const tx = await parseMultiSendJsonFile(hre, taskArgs.txs, nonce.toNumber())
        console.log("Safe transaction", tx)
        const chainId = (await safe.provider.getNetwork()).chainId
        const safeTxHash = calculateSafeTransactionHash(safe, tx, chainId)
        const proposal: SafeTxProposal = {
            safe: safeAddress,
            chainId,
            safeTxHash,
            tx
        }
        await writeToCliCache(proposalFile(safeTxHash), proposal)
        console.log(`Safe transaction hash: ${safeTxHash}`)
    });

task("show-proposal", "Shows details for a Safe transaction")
    .addParam("hash", "Hash of Safe transaction to display", undefined, types.string)
    .setAction(async (taskArgs, hre) => {
        const proposal: SafeTxProposal = await readFromCliCache(proposalFile(taskArgs.hash))
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress}@${proposal.chainId}`)
        const nonce = await safe.nonce()
        if (BigNumber.from(proposal.tx.nonce).lt(nonce)) {
            console.log(`!Nonce has already been used!`)
        }
        console.log("Details")
        console.log(proposal.tx)
    });