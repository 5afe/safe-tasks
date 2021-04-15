import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment as HRE } from "hardhat/types";
import { getAddress } from "@ethersproject/address";
import { AddressOne } from "@gnosis.pm/safe-contracts";
import { Contract } from "@ethersproject/contracts";
import { compatHandler, contractFactory, safeSingleton } from "./contracts";

export const getSingletonAddress = async (hre: HRE, address: string): Promise<string> => {
    const result = await hre.ethers.provider.getStorageAt(address, 0)
    return getAddress("0x" + result.slice(26))
}

export const getFallbackHandlerAddress = async (hre: HRE, address: string): Promise<string> => {
    const result = await hre.ethers.provider.getStorageAt(address, "0x6c9a6c4a39284e37ed1cf53d337577d14212a4870fb976a4366c693b939918d5")
    return getAddress("0x" + result.slice(26))
}

const getModules = async (hre: HRE, safe: Contract): Promise<string[]> => {
    try {
        return (await safe.getModulesPaginated(AddressOne, 10))[0]
    } catch (e) {
    }
    try {
        const compat = await compatHandler(hre, safe.address)
        return await compat.getModules()
    } catch (e) {
    }
    return ["Could not load modules"]
}

task("info", "Displays information about a Safe")
    .addPositionalParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .setAction(async (taskArgs, hre) => {
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Checking Safe at ${safeAddress}`)
        console.log(`Singleton: ${await getSingletonAddress(hre, safeAddress)}`)
        console.log(`Version: ${await safe.VERSION()}`)
        console.log(`Owners: ${await safe.getOwners()}`)
        console.log(`Threshold: ${await safe.getThreshold()}`)
        console.log(`Nonce: ${await safe.nonce()}`)
        console.log(`Fallback Handler: ${await getFallbackHandlerAddress(hre, safeAddress)}`)
        console.log(`Modules: ${await getModules(hre, safe)}`)
    });