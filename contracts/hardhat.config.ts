import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MONAD_TESTNET_RPC = process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: false,
    },
  },
  networks: {
    // Local Hardhat node (for testing)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Monad Testnet
    monadTestnet: {
      url: MONAD_TESTNET_RPC,
      chainId: 10143,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },
  etherscan: {
    // Monad explorer — update apiKey/apiURL when they support verified contracts
    apiKey: {
      monadTestnet: process.env.MONAD_EXPLORER_API_KEY || "no-api-key",
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet.monadexplorer.com/api",
          browserURL: "https://testnet.monadexplorer.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;
