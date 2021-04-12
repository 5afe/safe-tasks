import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import "./src/tasks";
declare const _default: {
    paths: {
        artifacts: string;
        cache: string;
        deploy: string;
        sources: string;
    };
    solidity: {
        compilers: ({
            version: string;
            settings: any;
        } | {
            version: string;
            settings?: undefined;
        })[];
    };
    networks: {
        hardhat: {
            allowUnlimitedContractSize: boolean;
            blockGasLimit: number;
            gas: number;
        };
        mainnet: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
        xdai: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
        ewc: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
        rinkeby: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
        goerli: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
        kovan: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
        volta: {
            url: string;
            chainId?: number | undefined;
            from?: string | undefined;
            gas?: number | "auto" | undefined;
            gasPrice?: number | "auto" | undefined;
            gasMultiplier?: number | undefined;
            timeout?: number | undefined;
            httpHeaders?: {
                [name: string]: string;
            } | undefined;
            accounts?: import("hardhat/types").HttpNetworkAccountsUserConfig | undefined;
            live?: boolean | undefined;
            saveDeployments?: boolean | undefined;
            tags?: string[] | undefined;
            deploy?: string | string[] | undefined;
        };
    };
    namedAccounts: {
        deployer: number;
    };
    mocha: {
        timeout: number;
    };
    etherscan: {
        apiKey: string | undefined;
    };
};
export default _default;
