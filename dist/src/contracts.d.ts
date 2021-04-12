import { HardhatRuntimeEnvironment as HRE } from "hardhat/types";
export declare const contractFactory: (hre: HRE, contractName: string) => Promise<import("ethers").ContractFactory>;
export declare const contractInstance: (hre: HRE, contractName: string, address?: string | undefined) => Promise<import("ethers").Contract>;
export declare const safeSingleton: (hre: HRE, l2: boolean, address?: string | undefined) => Promise<import("ethers").Contract>;
export declare const proxyFactory: (hre: HRE, address?: string | undefined) => Promise<import("ethers").Contract>;
