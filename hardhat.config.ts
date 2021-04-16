import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import dotenv from "dotenv";
import type { HardhatUserConfig, HttpNetworkUserConfig } from "hardhat/types";
import yargs from "yargs";

const argv = yargs
  .option("network", {
    type: "string",
    default: "hardhat",
  })
  .help(false)
  .version(false).argv;

// Load environment variables.
dotenv.config();
const { NETWORK, NODE_URL, INFURA_KEY, MNEMONIC, PK, SOLIDITY_VERSION, SOLIDITY_SETTINGS } = process.env;

const DEFAULT_MNEMONIC =
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

const sharedNetworkConfig: HttpNetworkUserConfig = {};
if (PK) {
  sharedNetworkConfig.accounts = [PK];
} else {
  sharedNetworkConfig.accounts = {
    mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
  };
}

if (["mainnet", "rinkeby", "kovan", "goerli"].includes(argv.network) && INFURA_KEY === undefined) {
  throw new Error(
    `Could not find Infura key in env, unable to connect to network ${argv.network}`,
  );
}

import "./src/tasks"

const primarySolidityVersion = SOLIDITY_VERSION || "0.7.6"
const soliditySettings = !!SOLIDITY_SETTINGS ? JSON.parse(SOLIDITY_SETTINGS) : undefined

const userConfig: HardhatUserConfig = {
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
    },
    mainnet: {
      ...sharedNetworkConfig,
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    },
    xdai: {
      ...sharedNetworkConfig,
      url: "https://xdai.poanetwork.dev",
    },
    ewc: {
      ...sharedNetworkConfig,
      url: `https://rpc.energyweb.org`,
    },
    rinkeby: {
      ...sharedNetworkConfig,
      url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
    },
    goerli: {
      ...sharedNetworkConfig,
      url: `https://goerli.infura.io/v3/${INFURA_KEY}`,
    },
    kovan: {
      ...sharedNetworkConfig,
      url: `https://kovan.infura.io/v3/${INFURA_KEY}`,
    },
    volta: {
      ...sharedNetworkConfig,
      url: `https://volta-rpc.energyweb.org`,
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 2000000,
  },
};
if (NETWORK && NETWORK !== "fork") {
  userConfig.defaultNetwork = NETWORK
}
if (NETWORK && NODE_URL && NETWORK === "fork") {
  userConfig.networks!!.hardhat!!.forking = {
    enabled: true,
    url: NODE_URL
  }
}
if (NODE_URL) {
  userConfig.networks!!.custom = {
    ...sharedNetworkConfig,
    url: NODE_URL,
  }
}
export default userConfig
