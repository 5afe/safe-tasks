"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyFactory = exports.safeSingleton = exports.contractInstance = exports.contractFactory = void 0;
const contractFactory = (hre, contractName) => hre.ethers.getContractFactory(contractName);
exports.contractFactory = contractFactory;
const contractInstance = async (hre, contractName, address) => {
    const deploymentAddress = address || (await hre.deployments.get(contractName)).address;
    const contract = await exports.contractFactory(hre, contractName);
    return contract.attach(deploymentAddress);
};
exports.contractInstance = contractInstance;
const safeSingleton = async (hre, l2, address) => exports.contractInstance(hre, l2 ? "GnosisSafeL2" : "GnosisSafe", address);
exports.safeSingleton = safeSingleton;
const proxyFactory = async (hre, address) => exports.contractInstance(hre, "GnosisSafeProxyFactory", address);
exports.proxyFactory = proxyFactory;
