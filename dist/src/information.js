"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingletonAddress = void 0;
const config_1 = require("hardhat/config");
const address_1 = require("@ethersproject/address");
const safe_contracts_1 = require("@gnosis.pm/safe-contracts");
const contracts_1 = require("./contracts");
const getSingletonAddress = async (hre, address) => {
    const result = await hre.ethers.provider.getStorageAt(address, 0);
    return address_1.getAddress("0x" + result.slice(26));
};
exports.getSingletonAddress = getSingletonAddress;
const getModules = async (hre, safe) => {
    try {
        return (await safe.getModulesPaginated(safe_contracts_1.AddressOne, 10))[0];
    }
    catch (e) {
    }
    try {
        const compat = await contracts_1.contractFactory(hre, "CompatibilityFallbackHandler");
        return await compat.attach(safe.address).getModules();
    }
    catch (e) {
    }
    return ["Could not load modules"];
};
config_1.task("safe-info", "Returns information about a Safe")
    .addParam("address", "Address or ENS name of the Safe to check", undefined, config_1.types.string)
    .setAction(async (taskArgs, hre) => {
    const safe = (await contracts_1.contractFactory(hre, "GnosisSafe")).attach(taskArgs.address);
    const safeAddress = await safe.resolvedAddress;
    console.log(`Checking Safe at ${safeAddress}`);
    console.log(`Singleton: ${await exports.getSingletonAddress(hre, safeAddress)}`);
    console.log(`Version: ${await safe.VERSION()}`);
    console.log(`Owners: ${await safe.getOwners()}`);
    console.log(`Threshold: ${await safe.getThreshold()}`);
    console.log(`Nonce: ${await safe.nonce()}`);
    console.log(`Modules: ${await getModules(hre, safe)}`);
});
