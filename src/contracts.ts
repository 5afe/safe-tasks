import { Contract } from "@ethersproject/contracts";
import { getCompatibilityFallbackHandlerDeployment, getMultiSendDeployment, getProxyFactoryDeployment, getSafeSingletonDeployment, getSafeL2SingletonDeployment, SingletonDeployment } from "@gnosis.pm/safe-deployments";
import { HardhatRuntimeEnvironment as HRE } from "hardhat/types";

export const contractFactory = (hre: HRE, contractName: string) => hre.ethers.getContractFactory(contractName);

export const contractInstance = async (hre: HRE, deployment: SingletonDeployment | undefined, address?: string): Promise<Contract> => {
    if (!deployment) throw Error("No deployment provided")
    // TODO: use network
    const contractAddress = address || deployment.defaultAddress
    return await hre.ethers.getContractAt(deployment.abi, contractAddress)
}

export const safeSingleton = async (hre: HRE, address?: string) => 
    contractInstance(hre, getSafeSingletonDeployment({ released: undefined }), address)

export const safeL2Singleton = async (hre: HRE, address?: string) => 
    contractInstance(hre, getSafeL2SingletonDeployment({ released: undefined }), address)

export const proxyFactory = async (hre: HRE, address?: string) => 
    contractInstance(hre, getProxyFactoryDeployment(), address)

export const multiSendLib = async (hre: HRE, address?: string) => 
    contractInstance(hre, getMultiSendDeployment(), address)
    
export const compatHandler = async (hre: HRE, address?: string) => 
    contractInstance(hre, getCompatibilityFallbackHandlerDeployment(), address)