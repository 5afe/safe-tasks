"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const constants_1 = require("@ethersproject/constants");
const address_1 = require("@ethersproject/address");
const safe_contracts_1 = require("@gnosis.pm/safe-contracts");
const contracts_1 = require("./contracts");
const parseSigners = (rawSigners) => {
    return rawSigners.split(",").map(address => address_1.getAddress(address));
};
config_1.task("create-safe", "Deploys and verifies Safe contracts")
    .addFlag("l2", "Should use version of the Safe contract that is more event heave")
    .addParam("signers", "Comma separated list of signer addresses (dafault is the address of linked account)", undefined, config_1.types.string, true)
    .addParam("threshold", "Threshold that should be used", 1, config_1.types.int, true)
    .addParam("fallback", "Fallback handler address", constants_1.AddressZero, config_1.types.string, true)
    .addParam("nonce", "Nonce used with factory", new Date().getTime(), config_1.types.int, true)
    .addParam("singleton", "Set to overwrite which singleton address to use", undefined, config_1.types.string, true)
    .addParam("factory", "Set to overwrite which factory address to use", undefined, config_1.types.string, true)
    .setAction(async (taskArgs, hre) => {
    const singleton = await contracts_1.safeSingleton(hre, taskArgs.l2, taskArgs.singleton);
    const factory = await contracts_1.proxyFactory(hre, taskArgs.factory);
    const signers = taskArgs.signers ? parseSigners(taskArgs.signers) : [(await hre.getNamedAccounts()).deployer];
    const fallbackHandler = address_1.getAddress(taskArgs.fallback);
    const setupData = singleton.interface.encodeFunctionData("setup", [signers, taskArgs.threshold, constants_1.AddressZero, "0x", fallbackHandler, constants_1.AddressZero, 0, constants_1.AddressZero]);
    const predictedAddress = await safe_contracts_1.calculateProxyAddress(factory, singleton.address, setupData, taskArgs.nonce);
    console.log(`Deploy Safe to ${predictedAddress}`);
    await factory.createProxyWithNonce(singleton.address, setupData, taskArgs.nonce).then((tx) => tx.wait());
    // TODO verify deployment
});
