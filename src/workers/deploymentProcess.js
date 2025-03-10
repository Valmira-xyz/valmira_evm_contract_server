require('dotenv').config();
const { ethers } = require('ethers');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const winston = require('winston');

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
  'bsc': {
    rpcUrl: process.env.BSC_RPC_URL,
    apiKey: process.env.BSCSCAN_API_KEY,
    name: 'bsc'
  },
  'bsc-testnet': {
    rpcUrl: process.env.BSC_TESTNET_RPC_URL,
    apiKey: process.env.BSCSCAN_API_KEY,
    name: 'bsc-testnet'
  },
  'ethereum': {
    rpcUrl: process.env.ETH_RPC_URL,
    apiKey: process.env.ETHERSCAN_API_KEY,
    name: 'mainnet'
  },
  'ethereum-testnet': {
    rpcUrl: process.env.ETH_TESTNET_RPC_URL,
    apiKey: process.env.ETHERSCAN_API_KEY,
    name: 'sepolia'
  }
};

async function verifyContract(deployedAddress, args, templateNumber, customContractPath, tokenName, network) {
  const networkConfig = NETWORK_CONFIG[network];
  if (!networkConfig) {
    throw new Error(`Unsupported network: ${network}`);
  }

  let command = `npx hardhat verify --network ${networkConfig.name} ${deployedAddress}`;
  args.forEach(arg => {
    if (typeof arg === 'string' && arg.includes(' ')) {
      command += ` "${arg}"`;
    } else {
      command += ` ${arg}`;
    }
  });

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

async function deployAndVerifyContract(jobId, data) {
  try {
    const { contractData, network, templateNumber, tokenName } = data;
    
    logger.info(`Processing job ${jobId}:`, {
      network,
      tokenName,
      templateNumber
    });

    // Get network configuration
    const networkConfig = NETWORK_CONFIG[network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    
    // Deploy contract
    const factory = new ethers.ContractFactory(
      contractData.abi,
      contractData.bytecode,
      provider
    );

    const contract = await factory.deploy(...contractData.constructorArgs);
    await contract.waitForDeployment();
    
    const contractAddress = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction().hash;

    // Verify contract if network supports it
    let verificationResult = null;
    if (networkConfig.apiKey) {
      try {
        logger.info(`Waiting for contract propagation before verification: ${contractAddress}`);
        await new Promise(resolve => setTimeout(resolve, 30000));

        const isVerified = await verifyContract(
          contractAddress,
          contractData.constructorArgs,
          templateNumber,
          null,
          tokenName,
          network
        );

        if (!isVerified) {
          const delays = [30000, 45000, 60000, 90000];
          for (const delay of delays) {
            logger.info(`Retrying verification after ${delay}ms delay`);
            await new Promise(resolve => setTimeout(resolve, delay));
            const retryVerified = await verifyContract(
              contractAddress,
              contractData.constructorArgs,
              templateNumber,
              null,
              tokenName,
              network
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
        logger.error(`Verification failed for ${contractAddress}:`, {
          error: error.message,
          stack: error.stack
        });
      }
    }

    const result = {
      success: true,
      contractAddress,
      deploymentTx,
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
      const result = await deployAndVerifyContract(message.jobId, message.data);
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