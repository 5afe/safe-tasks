"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
const dotenv_1 = __importDefault(require("dotenv"));
const yargs_1 = __importDefault(require("yargs"));
const argv = yargs_1.default
    .option("network", {
    type: "string",
    default: "hardhat",
})
    .help(false)
    .version(false).argv;
// Load environment variables.
dotenv_1.default.config();
const { INFURA_KEY, MNEMONIC, ETHERSCAN_API_KEY, PK, SOLIDITY_VERSION, SOLIDITY_SETTINGS } = process.env;
const DEFAULT_MNEMONIC = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
const sharedNetworkConfig = {};
if (PK) {
    sharedNetworkConfig.accounts = [PK];
}
else {
    sharedNetworkConfig.accounts = {
        mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
    };
}
if (["mainnet", "rinkeby", "kovan", "goerli"].includes(argv.network) && INFURA_KEY === undefined) {
    throw new Error(`Could not find Infura key in env, unable to connect to network ${argv.network}`);
}
require("./src/tasks");
const primarySolidityVersion = SOLIDITY_VERSION || "0.7.6";
const soliditySettings = !!SOLIDITY_SETTINGS ? JSON.parse(SOLIDITY_SETTINGS) : undefined;
exports.default = {
    paths: {
        artifacts: "build/artifacts",
        cache: "build/cache",
        deploy: "src/deploy",
        sources: "contracts",
    },
    solidity: {
        compilers: [
            { version: primarySolidityVersion, settings: soliditySettings },
            { version: "0.6.12" },
            { version: "0.5.17" },
        ]
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            blockGasLimit: 100000000,
            gas: 100000000
        },
        mainnet: Object.assign(Object.assign({}, sharedNetworkConfig), { url: `https://mainnet.infura.io/v3/${INFURA_KEY}` }),
        xdai: Object.assign(Object.assign({}, sharedNetworkConfig), { url: "https://xdai.poanetwork.dev" }),
        ewc: Object.assign(Object.assign({}, sharedNetworkConfig), { url: `https://rpc.energyweb.org` }),
        rinkeby: Object.assign(Object.assign({}, sharedNetworkConfig), { url: `https://rinkeby.infura.io/v3/${INFURA_KEY}` }),
        goerli: Object.assign(Object.assign({}, sharedNetworkConfig), { url: `https://goerli.infura.io/v3/${INFURA_KEY}` }),
        kovan: Object.assign(Object.assign({}, sharedNetworkConfig), { url: `https://kovan.infura.io/v3/${INFURA_KEY}` }),
        volta: Object.assign(Object.assign({}, sharedNetworkConfig), { url: `https://volta-rpc.energyweb.org` }),
    },
    namedAccounts: {
        deployer: 0,
    },
    mocha: {
        timeout: 2000000,
    },
    etherscan: {
        apiKey: ETHERSCAN_API_KEY,
    },
};
