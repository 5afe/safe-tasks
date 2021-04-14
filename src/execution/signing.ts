import { task, types } from "hardhat/config";
import { contractFactory, safeSingleton } from "../contracts";
import { buildSafeTransaction, SafeSignature, safeSignMessage } from "@gnosis.pm/safe-contracts";
import { parseEther } from "@ethersproject/units";
import { isHexString } from "ethers/lib/utils";
import { SafeTxProposal } from "./proposing";
import { proposalFile, signaturesFile, readFromCliCache, writeToCliCache, loadSignatures } from "./utils";

task("sign", "Signs a Safe transaction")
    .addParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addParam("to", "Address of the target", undefined, types.string)
    .addParam("value", "Value in ETH", "0", types.string, true)
    .addParam("data", "Data as hex string", "0x", types.string, true)
    .addParam("signerIndex", "Index of the signer to use", 0, types.int, true)
    .addFlag("delegatecall", "Indicator if tx should be executed as a delegatecall")
    .setAction(async (taskArgs, hre) => {
        const signers = await hre.ethers.getSigners()
        const signer = signers[taskArgs.signerIndex]
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress} with ${signer.address}`)
        const nonce = await safe.nonce()
        if (!isHexString(taskArgs.data)) throw Error(`Invalid hex string provided for data: ${taskArgs.data}`)
        const tx = buildSafeTransaction({ to: taskArgs.to, value: parseEther(taskArgs.value), data: taskArgs.data, nonce, operation: taskArgs.delegatecall ? 1 : 0 })
        const signature = await safeSignMessage(signer, safe, tx)
        console.log(`Signature: ${signature.data}`)
    });

const updateSignatureFile = async(safeTxHash: string, signature: SafeSignature) => {
    const signatures: Record<string, string> = await loadSignatures(safeTxHash)
    signatures[signature.signer] = signature.data
    await writeToCliCache(signaturesFile(safeTxHash), signatures)
}

task("sign-proposal", "Signs a Safe transaction")
    .addParam("hash", "Hash of Safe transaction to display", undefined, types.string)
    .addParam("signerIndex", "Index of the signer to use", 0, types.int, true)
    .setAction(async (taskArgs, hre) => {
        const proposal: SafeTxProposal = await readFromCliCache(proposalFile(taskArgs.hash))
        const signers = await hre.ethers.getSigners()
        const signer = signers[taskArgs.signerIndex]
        const safe = await safeSingleton(hre, proposal.safe)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress} with ${signer.address}`)
        const owners: string[] = await safe.getOwners()
        if (owners.indexOf(signer.address) < 0) {
            throw Error("Signer is not an owner of the Safe")
        }
        const signature = await safeSignMessage(signer, safe, proposal.tx, proposal.chainId)
        await updateSignatureFile(taskArgs.hash, signature)
        console.log(`Signature: ${signature.data}`)
    });