require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const fs = require('fs');
const isEmpty = require('is-empty');
const { exec } = require('child_process');
const processManager = require('./workers/processManager');

// Contract configuration
const CONTRACT_NAME_MAP = {
  0: "MemeToken"
};

const contractFilePath = "ERC20";

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Initialize Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
};

// Initialize Express app
const app = express();// Define allowed domains

const corsOptions = {
  origin: ['http://localhost:3008', 'https://valmira-frontend.vercel.app', 'https://valmira-dev.vercel.app'],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

app.use(express.json());

// Helper functions
function replaceSpacesWithUnderscores(str) {
  return str.split(' ').join('_');
}

async function deleteFile(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info(`No existing contract file found at: ${filePath}`);
    } else {
      logger.error(`Failed to delete contract file at ${filePath}:`, {
        error: error.message,
        code: error.code
      });
    }
  }
}

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication attempt failed: No Bearer token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    req.user = decoded;
    logger.info(`User authenticated successfully: ${decoded.id}`);
    next();
  } catch (error) {
    logger.error('Authentication failed:', {
      error: error.message,
      code: error.name
    });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes
app.post('/getContractWithSocialLinks', authenticateToken, async (req, res) => {
  try {
    const { websiteLink, twitterLink, telegramLink, discordLink, templateNumber, tokenName } = req.body;
    logger.info('Processing new contract creation request:', {
      tokenName,
      templateNumber,
      socialLinks: {
        website: websiteLink || 'not provided',
        telegram: telegramLink || 'not provided',
        twitter: twitterLink || 'not provided',
        discord: discordLink || 'not provided'
      }
    });

    let need2ReplaceFirstLine = true;
    if (isEmpty(websiteLink) && isEmpty(telegramLink) && isEmpty(twitterLink) && isEmpty(discordLink)) {
      need2ReplaceFirstLine = false;
      logger.info('No social links provided, skipping header modification');
    }

    let comments = "//\tSPDX-License-Identifier: MIT\n\n\n";
    if (!isEmpty(websiteLink)) comments += `//\tWebsite: ${websiteLink}\n`;
    if (!isEmpty(telegramLink)) comments += `//\tTelegram: ${telegramLink}\n`;
    if (!isEmpty(twitterLink)) comments += `//\tTwitter: ${twitterLink}\n`;
    if (!isEmpty(discordLink)) comments += `//\tDiscord: ${discordLink}\n`;

    const tokenFileName = replaceSpacesWithUnderscores(tokenName);

    if (!isNaN(Number(tokenFileName))) {
      logger.warn('Invalid token name provided:', { tokenName });
      return res.status(401).json({
        success: false,
        message: "Invalid file name"
      });
    }

    const originalFilePath = `contracts/${contractFilePath}/${CONTRACT_NAME_MAP[templateNumber]}.sol`;
    const clonedFileName = `contracts/${contractFilePath}/${tokenFileName}.sol`;

    logger.info('Preparing contract file:', {
      originalTemplate: CONTRACT_NAME_MAP[templateNumber],
      newFileName: tokenFileName
    });

    await deleteFile(clonedFileName);

    // Read and modify contract file
    const data = await fs.promises.readFile(originalFilePath, 'utf8');
    const lines = data.split('\n');
    
    if (need2ReplaceFirstLine) {
      lines.shift();
      lines.unshift(comments);
    }

    let updatedContent = lines.join('\n');
    updatedContent = updatedContent.replace(new RegExp(CONTRACT_NAME_MAP[templateNumber], 'g'), tokenFileName);

    // Write modified contract
    await fs.promises.writeFile(clonedFileName, updatedContent, 'utf8');
    logger.info('Contract file created successfully:', {
      fileName: tokenFileName,
      filePath: clonedFileName
    });

    // Compile contract
    logger.info('Compiling contract...');
    await new Promise((resolve, reject) => {
      exec("npx hardhat compile", (error, stdout, stderr) => {
        if (error) {
          logger.error('Contract compilation failed:', {
            error: error.message,
            stdout,
            stderr
          });
          reject(error);
          return;
        }
        if (stderr) {
          logger.warn('Compilation warnings:', { stderr });
        }
        if (stdout) {
          logger.info('Compilation output:', { stdout });
        }
        resolve();
      });
    });

    // Read compiled contract
    const compiledResultFilePath = `artifacts/${clonedFileName}/${tokenFileName}.json`;
    logger.info('Reading compiled contract:', { path: compiledResultFilePath });

    const compiledContract = await fs.promises.readFile(compiledResultFilePath, 'utf8');
    const contractData = JSON.parse(compiledContract);

    if (!contractData.bytecode) {
      throw new Error('Bytecode not found in compiled contract');
    }

    logger.info('Contract compilation successful', {
      fileName: tokenFileName,
      bytecodeLength: contractData.bytecode.length
    });

    res.json({
      success: true,
      message: "Contract file created and compiled successfully",
      byteCode: contractData.bytecode,
      path: clonedFileName,
      abi: contractData.abi // Including ABI for frontend use
    });

  } catch (error) {
    logger.error('Failed to process contract creation:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: error.message || "Error processing contract file"
    });
  }
});

app.post('/verify-contract', authenticateToken, async (req, res) => {
  try {
    const { deployedAddress, constructorArguments, templateNumber, customContractPath, tokenName } = req.body;
    const userId = req.user.id;

    logger.info('Received contract verification request:', {
      userId,
      deployedAddress, constructorArguments, templateNumber, customContractPath, tokenName
    });

    const result = await processManager.processJob({
      userId,
      deployedAddress, 
      constructorArguments,
       templateNumber, 
       customContractPath, 
       tokenName,
      timestamp: Date.now()
    });

    logger.info('Contract deployment completed:', {
      userId,
      tokenName,
      contractAddress: result.contractAddress,
      deploymentTx: result.deploymentTx,
      verificationResult: result.verificationResult
    });

    res.json({
      success: true,
      contractAddress: result.contractAddress,
      deploymentTx: result.deploymentTx,
      verificationResult: result.verificationResult
    });
  } catch (error) {
    logger.error('Contract deployment failed:', {
      error: error.message,
      userId: req.user.id,
      network: req.body.network,
      tokenName: req.body.tokenName
    });
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.get('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    logger.info('Fetching job status:', { jobId });

    // Since we're using direct process communication now, we can only check if the job exists
    const jobExists = processManager.jobCallbacks.has(Number(jobId));

    if (!jobExists) {
      logger.warn('Job not found:', { jobId });
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId,
      state: 'processing', // With process manager, we only know if it's processing
      data: {
        jobId,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    logger.error('Failed to fetch job status:', {
      error: error.message,
      jobId: req.params.jobId
    });
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// Add graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal, shutting down...');
  await processManager.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT signal, shutting down...');
  await processManager.shutdown();
  process.exit(0);
});

const PORT = process.env.PORT || 32156;
app.listen(PORT, () => {
  logger.info('Contract server started:', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    workers: processManager.maxProcesses
  });
}); 