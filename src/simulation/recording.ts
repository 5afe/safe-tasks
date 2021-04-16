import { task, types } from "hardhat/config";
import WalletConnect from "@walletconnect/client";
import readline from 'readline';

const sleep = async (duration: number) => new Promise((resolve) => setTimeout(resolve, duration))

task("record-ws", "Records transactions")
    .addPositionalParam("address", "Address or ENS name of the Safe to check", undefined, types.string)
    .addPositionalParam("uri", "WC uri", undefined, types.string)
    .setAction(async (taskArgs, hre) => {
        console.log("Start recording")
        console.log(await hre.ethers.provider.getNetwork())
        await hre.network.provider.request({
            method: "hardhat_reset",
            params: [{
                chainId: 1,
                forking: {
                    jsonRpcUrl: "https://mainnet.infura.io/v3/dfa033b2501f41459eb513a7b16e26b7"
                }
            }]
        })
        console.log(await hre.ethers.provider.getNetwork())
        // Create connector
        const connector = new WalletConnect(
            {
                // Required
                uri: taskArgs.uri,
                // Required
                clientMeta: {
                    description: "Safe tasks cli",
                    url: "https://gnosis-safe.io",
                    icons: [],
                    name: "Safe",
                },
            }
        );
        connector.on("session_request", (error, payload) => {
            if (error) throw error;
            console.log({ payload })
            connector.approveSession({
                accounts: [taskArgs.address],
                chainId: 1,
                rpcUrl: "http://127.0.0.1:8545/"
            })
        })
        // Subscribe to call requests
        connector.on("call_request", (error, payload) => {
            if (error) throw error;
            console.log("call_request", payload)
        });
        connector.on("disconnect", (error, payload) => {
            if (error) throw error;
            process.exit()
        });
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.on('SIGINT', () => {
            rl.question('Are you sure you want to exit? ', (answer) => {
                if (answer.match(/^y(es)?$/i)) {
                    rl.pause()
                    process.exit()
                }
            });
        })
        while (true) { await sleep(5000) }
    });