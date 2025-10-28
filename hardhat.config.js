const dotenv = require("dotenv");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@typechain/hardhat");
require("hardhat-gas-reporter");
require("solidity-coverage");

// Load .env.development if .env doesn't exist
const fs = require("fs");
const envPath = fs.existsSync(".env") ? ".env" : ".env.development";
dotenv.config({ path: envPath });

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// Use empty array if no PRIVATE_KEY provided to avoid Hardhat config validation errors
const ACCOUNTS = PRIVATE_KEY ? [PRIVATE_KEY] : [];

module.exports = {
    solidity: "0.8.24",
    defaultNetwork: "bsc",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            gasPrice: 20000000000,
            accounts: ACCOUNTS,
        },
        bscTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            gasPrice: 20000000000,
            accounts: ACCOUNTS,
        },
        somniaMainnet: {
            url: "https://api.infra.mainnet.somnia.network/",
            chainId: 5031,
            gasPrice: 20000000000,
            accounts: ACCOUNTS,
        },
        somniaTestnet: {
            url: "https://dream-rpc.somnia.network/",
            chainId: 50312,
            gasPrice: 20000000000,
            accounts: ACCOUNTS,
        },
        hardhat: {
            gasPrice: 10000000000, // Set the gas price to 20 Gwei
            // Other configurations...
        }
    },
    etherscan: {
        apiKey: {
            bsc: BSCSCAN_API_KEY,
            bscTestnet: BSCSCAN_API_KEY,
            somniaMainnet: "empty",
            somniaTestnet: "empty",
        },
        customChains: [
            {
                network: "somniaTestnet",
                chainId: 50312,
                urls: {
                    apiURL: "https://shannon-explorer.somnia.network/api",
                    browserURL: "https://shannon-explorer.somnia.network",
                },
            },
            {
                network: "somniaMainnet",
                chainId: 5031,
                urls: {
                    apiURL: "https://verify-contract.xangle.io/somnia/api",
                    browserURL: "https://somnia-explorer.xangle.io"
                }
            }
        ]
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 9999,
        }
    },
    mocha: {
        timeout: 20000,
    },

    sourcify: {
        enabled: true
    },
    allowUnlimitedContractSize: true,
};
