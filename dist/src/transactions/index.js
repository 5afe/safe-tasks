"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("hardhat/config");
const contracts_1 = require("../contracts");
const loading_1 = require("./loading");
config_1.task("safe-transactions", "Returns transactions of a Safe based on events (ordered newest first)")
    .addParam("address", "Address or ENS name of the Safe to check", undefined, config_1.types.string)
    .addParam("start", "Start index of the tx to load", 0, config_1.types.int, true)
    .setAction(async (taskArgs, hre) => {
    const safe = (await contracts_1.contractFactory(hre, "GnosisSafe")).attach(taskArgs.address);
    const safeAddress = await safe.resolvedAddress;
    console.log(`Checking Safe at ${safeAddress}`);
    console.log(await loading_1.loadHistoryTxs(safeAddress, taskArgs.start));
});
