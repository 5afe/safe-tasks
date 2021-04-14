import { BigNumber, Contract, PopulatedTransaction, Signer, utils } from "ethers";
import { task, types } from "hardhat/config";
import { contractFactory, safeSingleton } from "../contracts";
import { getSingletonAddress } from "../information";
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

const prepareSignatures = async (safe: Contract, tx: SafeTransaction, signaturesCSV: string | undefined, submitter?: Signer): Promise<SafeSignature[]> => {
    const signatures: SafeSignature[] = []
    const owners = await safe.getOwners()
    if (submitter && owners.indexOf(await submitter.getAddress()) >= 0) {
        signatures.push(await safeApproveHash(submitter, safe, tx, true))
    }
    if (signaturesCSV) {
        const chainId = (await safe.provider.getNetwork()).chainId
        const safeTxHash = calculateSafeTransactionHash(safe, tx, chainId)
        const parsedSigs = signaturesCSV.split(",")
            .map(signature => isOwnerSignature(owners, parseSignature(safeTxHash, signature)))
            .filter(signature => signature.signer !== signatures[0]?.signer)
        signatures.push(...parsedSigs)
    }
    const threshold = (await safe.getThreshold()).toNumber()
    if (threshold > signatures.length) throw Error(`Not enough signatures (${signatures.length} of ${threshold})`)
    return signatures.slice(0, threshold)
}

task("submit", "Executes a Safe transaction")
    .addParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addParam("to", "Address of the target", undefined, types.string)
    .addParam("value", "Value in ETH", "0", types.string, true)
    .addParam("data", "Data as hex string", "0x", types.string, true)
    .addParam("signatures", "Comma seperated list of signatures", undefined, types.string, true)
    .addFlag("delegatecall", "Indicator if tx should be executed as a delegatecall")
    .addFlag("useAccessList", "Indicator if tx should use EIP-2929")
    .setAction(async (taskArgs, hre) => {
        const [signer] = await hre.ethers.getSigners()
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress} with ${signer.address}`)
        const nonce = await safe.nonce()
        if (!isHexString(taskArgs.data)) throw Error(`Invalid hex string provided for data: ${taskArgs.data}`)
        const tx = buildSafeTransaction({ to: taskArgs.to, value: parseEther(taskArgs.value), data: taskArgs.data, nonce, operation: taskArgs.delegatecall ? 1 : 0 })
        const signatures = await prepareSignatures(safe, tx, taskArgs.signatures, signer)
        const populatedTx: PopulatedTransaction = await populateExecuteTx(safe, tx, signatures)
        if (taskArgs.useAccessList) {
            populatedTx.type = 1
            populatedTx.accessList = [
                { address: await getSingletonAddress(hre, safe.address), storageKeys: [] }, // Singleton address
            ]
        }
        console.log({ populatedTx })
        console.log(await signer.sendTransaction(populatedTx).then(tx => tx.wait()))
    });


task("submit-proposal", "Executes a Safe transaction")
    .addParam("hash", "Hash of Safe transaction to display", undefined, types.string)
    .addParam("signerIndex", "Index of the signer to use", 0, types.int, true)
    .addFlag("useAccessList", "Indicator if tx should use EIP-2929")
    .setAction(async (taskArgs, hre) => {
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
        const signatures = await prepareSignatures(safe, proposal.tx, Object.values(signatureStrings).join(","), signer)
        console.log({signatures})
        const populatedTx: PopulatedTransaction = await populateExecuteTx(safe, proposal.tx, signatures)
        if (taskArgs.useAccessList) {
            populatedTx.type = 1
            populatedTx.accessList = [
                { address: await getSingletonAddress(hre, safe.address), storageKeys: [] }, // Singleton address
            ]
        }
        console.log({ populatedTx })
        console.log(await signer.sendTransaction(populatedTx).then(tx => tx.wait()))
    });