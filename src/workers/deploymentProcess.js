require('dotenv').config();
const { ethers } = require('ethers');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const winston = require('winston');
const isEmpty = require('is-empty');

const CONTRACT_NAME_MAP = {
  0: "MemeToken"
};

const contractFilePath = "ERC20"; // The path of your contract file relative to the 'contracts' directory

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'deployment-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'deployment-combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Network configuration
const NETWORK_CONFIG = {
  'BSC_MAINNET': {
    rpcUrl: "https://bsc-dataseed.binance.org/",
    apiKey: process.env.BSCSCAN_API_KEY,
    name: 'bsc'
  },
  'ETH_MAINNET': {
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/wpn2uT8ZN-kiu4dr5ljQK/",
    apiKey: process.env.ETHERSCAN_API_KEY,
    name: 'eth'
  },
  'SOMNIA_TESTNET': {
    rpcUrl: 'https://rpc.ankr.com/somnia_testnet/1f454996729dc64f2e23f2a04624bb2765668e46a367e145f7d767fd12bbb108',
    apiKey: "empty", // Somnia uses custom verification, apiKey set to empty
    name: 'somniaTestnet',
    routerAddress: '0xaB93207d3Af2f205f60b30A5b7E4470aFD7936c0', // With WSTT support
    wsttAddress: '0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9', // Wrapped STT
    factoryAddress: '0xA9e79B95F2ea2fB089B8F0744CDDA2c22eB00211' // Factory
  },
  'SOMNIA_MAINNET': {
    rpcUrl: 'https://rpc.ankr.com/somnia_mainnet/1f454996729dc64f2e23f2a04624bb2765668e46a367e145f7d767fd12bbb108',
    apiKey: "empty", // Somnia uses custom verification, apiKey set to empty
    name: 'somniaMainnet',
    routerAddress: '0x1582f6f3D26658F7208A799Be46e34b1f366CE44', // With WSTT support
    wsttAddress: '0x046EDe9564A72571df6F5e44d0405360c0f4dCab', // Wrapped STT
    factoryAddress: '0x0ccff3D02A3a200263eC4e0Fdb5E60a56721B8Ae' // Factory
  },
};

function replaceSpacesWithUnderscores(str) {
  return str.split(' ').join('_');
}

function generateHardhatVerifyCommand(args, deployedContractAddress, templateNumber, customContractPath, tokenName, network) {
  // Define the network for which the contract is deployed
  // Use the network parameter passed to the function
  const networkKey = network || process.env.CHAIN_NAME;
  
  // Get the network configuration and use the hardhat network name
  const networkConfig = NETWORK_CONFIG[networkKey];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${networkKey}`);
  }
  
  // Use the hardhat network name from config (e.g., 'somniaTestnet' instead of 'SOMNIA_TESTNET')
  const networkName = networkConfig.name;

  // Start building the command
  let command = `npx hardhat verify --network ${networkName} ${deployedContractAddress}`;

  // Loop through the args array and append each argument to the command string
  args.forEach(arg => {
    // If the argument is a string and contains spaces, enclose it in quotes
    if (typeof arg === 'string' && arg.includes(' ')) {
      command += ` "${arg}"`;
    } else {
      command += ` ${arg}`;
    }
  });
  
  // Append the contract file path and name
  if( isEmpty(customContractPath) != true )
    {
      const tokenCalssName = replaceSpacesWithUnderscores(tokenName);
      command += ` --contract ${customContractPath}:${tokenCalssName}`;
    } else if ( isEmpty(contractFilePath) != true ) {
    command += ` --contract contracts/${contractFilePath}/${CONTRACT_NAME_MAP[templateNumber]}.sol:${CONTRACT_NAME_MAP[templateNumber]}`;
  }

  return command;
}

async function verifyContract(deployedAddress, args, templateNumber, customContractPath, tokenName, network) {
  const networkConfig = NETWORK_CONFIG[network ||process.env.CHAIN_NAME];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${network ||process.env.CHAIN_NAME}`);
  }

  const command = generateHardhatVerifyCommand(args, deployedAddress, templateNumber, customContractPath, tokenName, network);  

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      logger.warn(`Verification stderr: ${stderr}`);
    }
    return stdout.includes("Successfully verified") || stdout.includes("already verified");
  } catch (error) {
    if (error.message.includes('already verified')) {
      return true;
    }
    throw error;
  }
}

async function doVerifyContract(jobId, data) {
  try {
    const { deployedAddress, constructorArguments, templateNumber, customContractPath, tokenName, chainName } = data;
    // Use provided chainName, fallback to CHAIN_NAME env var, then default to "bsc"
    const network = chainName || process.env.CHAIN_NAME || "bsc";

    logger.info(`Processing job ${jobId}:`, {
      deployedAddress, constructorArguments, templateNumber, customContractPath, tokenName, chainName,
      network,
    });

    // Get network configuration
    const networkConfig = NETWORK_CONFIG[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }  

    // Verify contract if network supports it
    let verificationResult = null;
    if (networkConfig.apiKey) {
      try {
        logger.info(`Waiting for contract propagation before verification: ${deployedAddress}`);
        await new Promise(resolve => setTimeout(resolve, 30000));

        const isVerified = await verifyContract(
          deployedAddress,
          constructorArguments,
          templateNumber,
          customContractPath,
          tokenName,
          network || process.env.CHAIN_NAME
        );

        if (!isVerified) {
          const delays = [30000, 45000, 60000, 90000];
          for (const delay of delays) {
            logger.info(`Retrying verification after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));

            const retryVerified = await verifyContract(
              deployedAddress,
              constructorArguments,
              templateNumber,
              customContractPath,
              tokenName,
              network || process.env.CHAIN_NAME
            );
            if (retryVerified) {
              verificationResult = 'success';
              break;
            }
          }
        } else {
          verificationResult = 'success';
        }
      } catch (error) {
        verificationResult = `failed: ${error.message}`;
        logger.error(`Verification failed for ${deployedAddress}:`, {
          error: error.message,
          stack: error.stack
        });
      }
    }

    const result = {
      success: true,
      deployedAddress,
      network,
      verificationResult
    };

    logger.info(`Job ${jobId} completed successfully:`, result);
    return result;

  } catch (error) {
    logger.error(`Job ${jobId} failed:`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Handle messages from parent process
process.on('message', async (message) => {
  if (message.type === 'job') {
    try {
      const result = await doVerifyContract(message.jobId, message.data);
      process.send({
        type: 'job_complete',
        jobId: message.jobId,
        success: true,
        result
      });
    } catch (error) {
      process.send({
        type: 'job_complete',
        jobId: message.jobId,
        success: false,
        error: error.message
      });
    }
  }
}); 