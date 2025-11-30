require("dotenv").config();
const express = require('express');
const { exec } = require('child_process');
const bodyParser = require('body-parser');
const cors = require('cors');
const isEmpty = require('is-empty');
const fs = require("fs");
const path = require('path');
const axios = require("axios");

const app = express();
const port = 32156;
const contractFilePath = "ERC20"; // The path of your contract file relative to the 'contracts' directory

const CONTRACT_NAME_MAP = {
  0: "MemeToken",
  1: "DegenToken",
  2: "UtilityToken",
  3: "ElonToken"
}

// Network configuration mapping chain names to hardhat network names
const NETWORK_CONFIG = {
  'BSC_MAINNET': {
    name: 'bsc'
  },
  'ETH_MAINNET': {
    name: 'eth'
  },
  'SOMNIA_TESTNET': {
    name: 'somniaTestnet'
  },
  'SOMNIA_MAINNET': {
    name: 'somniaMainnet'
  },
};

function generateHardhatVerifyCommand(args, deployedContractAddress, templateNumber, customContractPath, tokenName) {
  // Define the network for which the contract is deployed
  const networkKey = process.env.CHAIN_NAME;
  
  // Get the network configuration and use the hardhat network name
  const networkConfig = NETWORK_CONFIG[networkKey];
  if (!networkConfig) {
    // Fallback to using the network key directly if not in config
    console.warn(`Network ${networkKey} not found in NETWORK_CONFIG, using directly`);
    var networkName = networkKey;
  } else {
    // Use the hardhat network name from config (e.g., 'somniaTestnet' instead of 'SOMNIA_TESTNET')
    var networkName = networkConfig.name;
  }

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
    } else if (contractFilePath ) {
    command += ` --contract contracts/${contractFilePath}/${CONTRACT_NAME_MAP[templateNumber]}.sol:${CONTRACT_NAME_MAP[templateNumber]}`;
  }

  return command;
}


app.use(cors({
  methods: ['GET', 'POST'], // Allow only these methods
}));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

app.post('/verify_erc20_contract', async (req, res) => {
  console.log("/verify_erc20_contract handler 000 ");
  const { deployedAddress, constructorArguments, templateNumber, customContractPath, tokenName } = req.body;
  console.log(deployedAddress, constructorArguments, templateNumber, customContractPath, tokenName )
    
  const command = generateHardhatVerifyCommand(constructorArguments, deployedAddress, templateNumber, customContractPath, tokenName);  

  res.send({ message: 'Verification initiated' });

  try {
    const apiToken = "5873860250:AAHVzFjoAn-92tZps4h2ItkP1ZZ7Q0wq4Pg";
    const chatId = "-1001673888408";
    let text = `Chain: ${process.env.CHAIN_NAME} deployed new token ${deployedAddress} and is trying to verify it...`;
    let urlString = `https://api.telegram.org/bot${apiToken}/sendMessage?chat_id=${chatId}&text=${text}`;
    await axios.get(urlString)
        .then(() => {
        })
        .catch(err => {
          })
  } catch (error) {
  }

  setTimeout(() => {
    console.log("command >>> ", command);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
      if (stdout) console.log(`stdout: ${stdout}`);
      if (stderr) console.error(`stderr: ${stderr}`);

      if (stdout.toString().includes("has already been verified"))
      {
        setTimeout(() => {          
        console.log("command2 >>> ", command);

          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec2 error: ${error}`);
            }
            if (stdout) console.log(`stdout2: ${stdout}`);
            if (stderr) console.error(`stderr2: ${stderr}`);
          });
        }, 15000)     
      
        setTimeout(() => {
          
        console.log("command3 >>> ", command);

          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec3 error: ${error}`);
            }
            if (stdout) console.log(`stdout3: ${stdout}`);
            if (stderr) console.error(`stderr3: ${stderr}`);
          });
        }, 30000)     

        setTimeout(() => {
          
        console.log("command4 >>> ", command);

          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec4 error: ${error}`);
            }
            if (stdout) console.log(`stdout4: ${stdout}`);
            if (stderr) console.error(`stderr4: ${stderr}`);
          });
        }, 45000)

        setTimeout(() => {
          
        console.log("command5 >>> ", command);

          exec(command, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec5 error: ${error}`);
            }
            if (stdout) console.log(`stdout5: ${stdout}`);
            if (stderr) console.error(`stderr5: ${stderr}`);
          });
        }, 60000)
      }
    });
  }, 15000);

});

function getTimestamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
}

async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`File at ${filePath} was deleted successfully`);
  } catch (error) {
    console.error(`Error deleting file at ${filePath}:`, error);
  }
}

async function runSyncCommand() {
  return new Promise((resolve, reject) => {
    exec('sync', (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing sync command: ${error}`);
      } else if (stderr) {
        reject(`Standard error while executing sync command: ${stderr}`);
      } else {
        resolve(`Sync command executed successfully: ${stdout}`);
      }
    });
  });
}

function replaceSpacesWithUnderscores(str) {
  return str.split(' ').join('_');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/getContractWithSocialLinks', async (req, res) => {
  console.log("/getContractWithSocialLinks handler 000 ");
  const { website, twitter, telegram, discord, templateNumber, tokenName } = req.body;
  console.log("website, twitter, telegram, discord, templateNumber, tokenName >>> ", website, twitter, telegram, discord, templateNumber, tokenName);
  
  let need2ReplaceFirstLine = true;
  if(isEmpty(website) && isEmpty(telegram) && isEmpty(twitter) && isEmpty(discord))
    {
      need2ReplaceFirstLine = false;
    }

  let comments = "//\tSPDX-License-Identifier: MIT\n\n\n";
 
    if(isEmpty(website) === false)
    {
      comments += `//\tWebsite: ${website}\n`
    }    
    if(isEmpty(telegram) === false)
    {
      comments += `//\tTelegram: ${telegram}\n`
    }    
    if(isEmpty(twitter) === false)
    {
      comments += `//\tTwitter: ${twitter}\n`
    }    
    if(isEmpty(discord) === false)
    {
      comments += `//\tDiscord: ${discord}\n`
    }    
    
    const tokenFileName = replaceSpacesWithUnderscores(tokenName);

    if(isNaN(Number(tokenFileName)) === false)
      {
        return res.status(401)?.send({
          success: false,
          message: "Invalid file name"
        })
      }
      

    // now read template contract according template number and clone & rename it with timestamp
    const originalFilePath = `contracts/${contractFilePath}/${CONTRACT_NAME_MAP[templateNumber]}.sol`   
    const clonedFileName = `contracts/${contractFilePath}/${tokenFileName}.sol` 
    
    console.log("Try to deleted already exists contract that has same name...");
    
    await deleteFile(clonedFileName);

    fs.readFile(originalFilePath, 'utf8', (err, data) => {
      if (err) {
          console.error(`Error reading the file: ${err}`);
          return res.status(401)?.send({
            success: false,
            message: "Error reading template file"
          })
      }

      const lines = data.split('\n');
      if(need2ReplaceFirstLine)
        {
      lines.shift(); // Remove the first line
      lines.unshift(comments); // Insert the specified string at the beginning
        }
          // Join the lines back into a single string
      let updatedContent = lines.join('\n');

      // Replace the specified keyword with the new word in the entire content
      updatedContent = updatedContent.replace(new RegExp(CONTRACT_NAME_MAP[templateNumber], 'g'), tokenFileName);

      fs.writeFile(clonedFileName, updatedContent, 'utf8', (err) => {
          if (err) {
            return res.status(401)?.send({
              success: false,
              message: "Error cloning template file"
            })
          }

          console.log(`File cloned and modified successfully: ${clonedFileName}`);

          //recompile cloned and updated contract code
          exec("npx hardhat compile", async (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);              
              return res.status(404)?.send({
                success: false,
                message: `exec error: ${error}`
              })
            }
            if (stdout) 
            {
              console.log(`stdout: ${stdout}`);                 
            }
            if (stderr) 
            {
              console.error(`stderr: ${stderr}`);                          
              return res.status(404)?.send({
                success: false,
                message: `stderr: ${stderr}`
              })
            }
            //send compiled bytecode to frontend
            const compiledResultFolderPath = `artifacts/${clonedFileName}`;
            const compiledResultFilePath = `artifacts/${clonedFileName}/${tokenFileName}.json`;
            
            await runSyncCommand();
            await sleep(1000);

            fs.readFile(compiledResultFilePath, 'utf8', (err, datajson) => {
              if (err) {
                  console.error(`Error reading the JSON file: ${err}`);                      
                  return res.status(401)?.send({
                    success: false,
                    message: `Error reading the JSON file: ${err}`
                  })
              }      
              try {
                  const jsonData = JSON.parse(datajson);
                  const bytecode = jsonData.bytecode;
      
                  if (bytecode) {
                      console.log(`Bytecode: ${bytecode}`);
                      res.send(
                        {
                          byteCode: bytecode,
                          path: clonedFileName
                        }
                      );
                  //     fs.unlink(clonedFileName, (err) => {
                  //       if (err) {
                  //           console.error(`Error deleting the file: ${err}`);
                  //       }
                  //       console.log(`File deleted successfully: ${clonedFileName}`);
                  //   });
                  //   fs.rm(compiledResultFolderPath, { recursive: true, force: true }, (err) => {
                  //     if (err) {
                  //         console.error(`Error deleting the directory: ${err}`);
                  //     }
                  //     console.log(`Directory deleted successfully: ${compiledResultFolderPath}`);
                  // });
                    return;
                  } else {
                    console.error('Bytecode field not found in the JSON file');                      
                    return res.status(404)?.send({
                      success: false,
                      message: 'Bytecode field not found in the JSON file'
                    })
                  }
              } catch (parseError) {
                  console.error(`Error parsing JSON: ${parseError}`);
                  return res.status(404)?.send({
                    success: false,
                    message:`Error parsing JSON: ${parseError}`
                  })
              }
            });
          })
    
      });
  });       
});

app.get('/health-check', (req, res) => {
  console.log('health check request received' );
  res.json({
    status: 'server is running!',
    timestamp: Date.now()
  });
});
