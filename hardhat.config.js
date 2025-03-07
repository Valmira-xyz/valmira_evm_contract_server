const dotenv = require("dotenv");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@typechain/hardhat");
require("hardhat-gas-reporter");
require("solidity-coverage");

dotenv.config();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY2 = process.env.PRIVATE_KEY2;

module.exports = {
    solidity: "0.8.24",
    defaultNetwork: "sepolia",
    networks:{
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        mainnet: {
            url: "https://ethereum.publicnode.com",
            chainId: 1,
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },
        sepolia: {
            url: "https://ethereum-sepolia-rpc.publicnode.com",
            chainId: 11155111,
            accounts: [PRIVATE_KEY],
        },
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            gasPrice: 20000000000,
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },
        bscTestnet: {
            url: "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            gasPrice: 20000000000,
            accounts: [PRIVATE_KEY, PRIVATE_KEY2],
        },
        hardhat: {
            gasPrice: 10000000000, // Set the gas price to 20 Gwei
            // Other configurations...
        }
    },
    etherscan: {
        apiKey: {
            mainnet: ETHERSCAN_API_KEY,
            sepolia: ETHERSCAN_API_KEY,
            bsc: BSCSCAN_API_KEY,
            bscTestnet: BSCSCAN_API_KEY
        }
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
