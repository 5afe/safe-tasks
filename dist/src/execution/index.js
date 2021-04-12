"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const config_1 = require("hardhat/config");
const contracts_1 = require("../contracts");
const information_1 = require("../information");
const safe_contracts_1 = require("@gnosis.pm/safe-contracts");
const units_1 = require("@ethersproject/units");
const utils_1 = require("ethers/lib/utils");
config_1.task("execute", "Executes a Safe transaction")
    .addParam("address", "Address or ENS name of the Safe to check", undefined, config_1.types.string)
    .addParam("to", "Address of the target", undefined, config_1.types.string)
    .addParam("value", "Value in ETH", "0", config_1.types.string, true)
    .addParam("data", "Data as hex string", "0x", config_1.types.string, true)
    .addParam("signatures", "Comma seperated list of signatures", undefined, config_1.types.string, true)
    .addFlag("delegatecall", "Indicator if tx should be executed as a delegatecall")
    .addFlag("useAccessList", "Indicator if tx should use EIP-2929")
    .setAction(async (taskArgs, hre) => {
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic)
        throw Error("No mnemonic provided");
    const relayer = ethers_1.Wallet.fromMnemonic(mnemonic).connect(hre.ethers.provider);
    const safe = (await contracts_1.contractFactory(hre, "GnosisSafe")).attach(taskArgs.address);
    const safeAddress = await safe.resolvedAddress;
    console.log(`Using Safe at ${safeAddress} with ${relayer.address}`);
    const nonce = await safe.nonce();
    if (!utils_1.isHexString(taskArgs.data))
        throw Error(`Invalid hex string provided for data: ${taskArgs.data}`);
    const tx = safe_contracts_1.buildSafeTransaction({ to: taskArgs.to, value: units_1.parseEther(taskArgs.value), data: taskArgs.data, nonce, operation: taskArgs.delegatecall ? 1 : 0 });
    const populatedTx = await safe_contracts_1.populateExecuteTx(safe, tx, [await safe_contracts_1.safeApproveHash(relayer, safe, tx, true)]);
    if (taskArgs.useAccessList) {
        populatedTx.type = 1;
        populatedTx.accessList = [
            { address: await information_1.getSingletonAddress(hre, safe.address), storageKeys: [] }, // Singleton address
        ];
    }
    console.log({ populatedTx });
    console.log(await relayer.sendTransaction(populatedTx).then(tx => tx.wait()));
});
