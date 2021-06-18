import { task, types } from "hardhat/config";

task("simple-submit-proposal", "Executes a Safe transaction from a file")
    .addPositionalParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addPositionalParam("txs", "Json file with transactions", undefined, types.inputFile)
    .addFlag("onChainHash", "Get hash from chain (required for pre-1.3.0 version)")
    .addParam("signerIndex", "Index of the signer to use", 0, types.int, true)
    .addParam("signatures", "Comma seperated list of signatures", undefined, types.string, true)
    .addParam("gasPrice", "Gas price to be used", undefined, types.int, true)
    .addParam("gasLimit", "Gas limit to be used", undefined, types.int, true)
    .setAction(async (taskArgs, hre) => {
        const safeTxHash = await hre.run("propose-multi", { 
            address: taskArgs.address,
            txs: taskArgs.txs,
            onChainHash: taskArgs.onChainHash
        })
        await hre.run("submit-proposal", {
            hash: safeTxHash,
            onChainHash: taskArgs.onChainHash,
            signerIndex: taskArgs.signerIndex,
            signatures: taskArgs.signatures,
            gasLimit: taskArgs.gasLimit,
        })
    });
