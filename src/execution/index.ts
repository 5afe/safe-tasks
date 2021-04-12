import { Wallet, PopulatedTransaction } from "ethers";
import { task, types } from "hardhat/config";
import { contractFactory } from "../contracts";
import { getSingletonAddress } from "../information";
import { buildSafeTransaction, populateExecuteTx, safeApproveHash } from "@gnosis.pm/safe-contracts";
import { parseEther } from "@ethersproject/units";
import { isHexString } from "ethers/lib/utils";

task("execute", "Executes a Safe transaction")
    .addParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addParam("to", "Address of the target", undefined, types.string)
    .addParam("value", "Value in ETH", "0", types.string, true)
    .addParam("data", "Data as hex string", "0x", types.string, true)
    .addParam("signatures", "Comma seperated list of signatures", undefined, types.string, true)
    .addFlag("delegatecall", "Indicator if tx should be executed as a delegatecall")
    .addFlag("useAccessList", "Indicator if tx should use EIP-2929")
    .setAction(async (taskArgs, hre) => {
        const mnemonic = process.env.MNEMONIC
        if (!mnemonic) throw Error("No mnemonic provided")
        const relayer = Wallet.fromMnemonic(mnemonic).connect(hre.ethers.provider)
        const safe = (await contractFactory(hre, "GnosisSafe")).attach(taskArgs.address)
        const safeAddress = await safe.resolvedAddress
        console.log(`Using Safe at ${safeAddress} with ${relayer.address}`)
        const nonce = await safe.nonce()
        if (!isHexString(taskArgs.data)) throw Error(`Invalid hex string provided for data: ${taskArgs.data}`)
        const tx = buildSafeTransaction({ to: taskArgs.to, value: parseEther(taskArgs.value), data: taskArgs.data, nonce, operation: taskArgs.delegatecall ? 1 : 0 })
        const populatedTx: PopulatedTransaction = await populateExecuteTx(safe, tx, [ await safeApproveHash(relayer, safe, tx, true) ])
        if (taskArgs.useAccessList) {
            populatedTx.type = 1
            populatedTx.accessList = [
                { address: await getSingletonAddress(hre, safe.address), storageKeys: [] }, // Singleton address
            ]
        }
        console.log({ populatedTx })
        console.log(await relayer.sendTransaction(populatedTx).then(tx => tx.wait()))
    });