import { task, types } from "hardhat/config";
import { safeSingleton } from "../contracts";
import { loadHistoryTxs } from "./loading";

task("history", `WIP: Displays the transaction history of a Safe based on events (ordered newest first). 
Only outgoing transactions made with a Safe >=1.1.0 will be displayed.`)
    .addPositionalParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addParam("start", "Start index of the tx to load", 0, types.int, true)
    .setAction(async (taskArgs, hre) => {
        const safe = await safeSingleton(hre, taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Checking Safe at ${safeAddress}`)
        console.log(await loadHistoryTxs(hre.ethers.provider, safeAddress, taskArgs.start))
    });