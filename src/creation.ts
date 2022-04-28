import { task, types } from "hardhat/config";
import { AddressZero } from "@ethersproject/constants";
import { getAddress } from "@ethersproject/address";
import { buildMultiSendSafeTx, calculateProxyAddress, encodeMultiSend, MetaTransaction } from "@gnosis.pm/safe-contracts";
import { safeSingleton, proxyFactory, safeL2Singleton, multiSendCallOnlyLib, compatHandler } from "./contracts";
import { readCsv, writeJson, writeTxBuilderJson } from "./execution/utils";

const parseSigners = (rawSigners: string): string[] => {
    return rawSigners.split(",").map(address => getAddress(address))
}

task("create", "Create a Safe")
    .addFlag("l2", "Should use version of the Safe contract that is more event heave")
    .addFlag("buildOnly", "Indicate whether this transaction should only be logged and not submitted on-chain")
    .addParam("signers", "Comma separated list of signer addresses (dafault is the address of linked account)", "", types.string, true)
    .addParam("threshold", "Threshold that should be used", 1, types.int, true)
    .addParam("fallback", "Fallback handler address", AddressZero, types.string, true)
    .addParam("nonce", "Nonce used with factory", new Date().getTime(), types.int, true)
    .addParam("singleton", "Set to overwrite which singleton address to use", "", types.string, true)
    .addParam("factory", "Set to overwrite which factory address to use", "", types.string, true)
    .setAction(async (taskArgs, hre) => {
        const singleton = taskArgs.l2 ? await safeL2Singleton(hre, taskArgs.singleton) : await safeSingleton(hre, taskArgs.singleton)
        const factory = await proxyFactory(hre, taskArgs.factory)
        const signers: string[] = taskArgs.signers ? parseSigners(taskArgs.signers) : [(await hre.getNamedAccounts()).deployer]
        const fallbackHandler = getAddress(taskArgs.fallback)
        const setupData = singleton.interface.encodeFunctionData(
            "setup",
            [signers, taskArgs.threshold, AddressZero, "0x", fallbackHandler, AddressZero, 0, AddressZero]
        )
        const predictedAddress = await calculateProxyAddress(factory, singleton.address, setupData, taskArgs.nonce)
        console.log(`Deploy Safe to ${predictedAddress}`)
        console.log(`Singleton: ${singleton.address}`)
        console.log(`Setup data: ${setupData}`)
        console.log(`Nonce: ${taskArgs.nonce}`)
        console.log(`To (factory): ${factory.address}`)
        console.log(`Data: ${factory.interface.encodeFunctionData("createProxyWithNonce", [singleton.address, setupData, taskArgs.nonce])}`)
        if (!taskArgs.buildOnly)
            await factory.createProxyWithNonce(singleton.address, setupData, taskArgs.nonce).then((tx: any) => tx.wait())
        // TODO verify deployment
    });

task("create-bulk", "Create multiple Safes from CSV")
    .addFlag("buildOnly", "Indicate whether this transaction should only be logged and not submitted on-chain")
    .addPositionalParam("csv", "CSV file with the information of the Safes that should be created", undefined, types.inputFile)
    .addParam("fallback", "Fallback handler address", undefined, types.string, true)
    .addParam("nonce", "Nonce used with factory", "0", types.string, true)
    .addParam("singleton", "Set to overwrite which singleton address to use", "", types.string, true)
    .addParam("factory", "Set to overwrite which factory address to use", "", types.string, true)
    .addFlag("l2", "Should use version of the Safe contract that is more event heave")
    .addParam("export", "If specified instead of executing the data will be exported as a json file for the transaction builder", undefined, types.string)
    .setAction(async (taskArgs, hre) => {
        const singleton = taskArgs.l2 ? await safeL2Singleton(hre, taskArgs.singleton) : await safeSingleton(hre, taskArgs.singleton)
        const factory = await proxyFactory(hre, taskArgs.factory)
        const fallbackHandler = await compatHandler(hre, taskArgs.fallback)

        const inputs: { threshold: string, signers: string }[] = await readCsv(taskArgs.csv)
        const encodedSetups: string[] = inputs.filter(entry => entry.signers.trim().length !== 0).map(entry => {
            const parsedThreshold = entry.threshold.split("/")[0]
            const expectedSignerCount = entry.threshold.split("/")[1]
            const parsedSigners = entry.signers.replace(/\n/g,",").split(",")
            console.log({parsedThreshold, expectedSignerCount, parsedSigners})
            if (expectedSignerCount && parseInt(expectedSignerCount) !== parsedSigners.length) throw Error(`Expected ${expectedSignerCount} Signers, got ${parsedSigners}`)
            return singleton.interface.encodeFunctionData(
                "setup",
                [parsedSigners, parsedThreshold, AddressZero, "0x", fallbackHandler.address, AddressZero, 0, AddressZero]
            )
        })
        const deploymentTxs: MetaTransaction[] = encodedSetups.map(setup => {
            const data = factory.interface.encodeFunctionData("createProxyWithNonce", [singleton.address, setup, taskArgs.nonce])
            return { to: factory.address, data, operation: 0, value: "0" }
        })
        const multiSend = await multiSendCallOnlyLib(hre)
        console.log(`Singleton: ${singleton.address}`)
        console.log(`Nonce: ${taskArgs.nonce}`)
        console.log(`Factory: ${factory.address}`)
        console.log(`Data: ${multiSend.interface.encodeFunctionData("multiSend", [encodeMultiSend(deploymentTxs)])}`)

        if (taskArgs.export) {
            const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString()
            await writeTxBuilderJson(taskArgs.export, chainId, deploymentTxs, "Batched Safe Creations")
        } else if (!taskArgs.buildOnly) {
            await multiSend.multiSend(encodeMultiSend(deploymentTxs)).then((tx: any) => tx.wait())
        }
        // TODO verify deployment
    });

export { }
