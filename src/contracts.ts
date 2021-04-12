import { HardhatRuntimeEnvironment as HRE } from "hardhat/types";

export const contractFactory = (hre: HRE, contractName: string) => hre.ethers.getContractFactory(contractName);

export const contractInstance = async (hre: HRE, contractName: string, address?: string) => {
    const deploymentAddress = address || (await hre.deployments.get(contractName)).address
    const contract = await contractFactory(hre, contractName)
    return contract.attach(deploymentAddress)
}
export const safeSingleton = async (hre: HRE, l2: boolean, address?: string) => contractInstance(hre, l2 ? "GnosisSafeL2" : "GnosisSafe", address)
export const proxyFactory = async (hre: HRE, address?: string) => contractInstance(hre, "GnosisSafeProxyFactory", address)