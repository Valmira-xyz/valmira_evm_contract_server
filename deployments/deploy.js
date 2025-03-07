// Import ethers from Hardhat package
const { ethers } = require("hardhat");

async function verifyContract(deployedAddress, _unlockTime) {
    console.log("Verifying Lock contract...");

    try {
        await run("verify:verify", {
            address: deployedAddress,
            constructorArguments: [_unlockTime],
        });

    } catch (err) {
        if (err.message.includes("Reason: Already Verified")) {
            console.log("Contract is already verified!");
          }else console.error("Verification failed:", error);
    }
}

function delay(milliseconds) {
    return new Promise(resolve => {
      setTimeout(resolve, milliseconds);
    });
  }

  
async function main() {
    // Retrieve the contract factory using ethers
    const Lock = await ethers.getContractFactory("Lock");
    const [deployer] = await ethers.getSigners();

    // Current time + 24 hours (for example)
    const unlockTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    console.log("unlock time >>> ", unlockTime);
    const naviteValue = "0.0001";

     // Check the balance of the deployer account
     const balance = await deployer.getBalance();
     console.log(`Deployer balance: ${ethers.utils.formatEther(balance)} ETH`);
 
     // Ensure the deployer has enough balance to proceed
     if (balance.lt(ethers.utils.parseEther(naviteValue))) {
         console.error("Insufficient funds to deploy the contract.");
         return;
     }
    
    // Deploy the contract with the unlockTime as the constructor argument
    const lock = await Lock.deploy(unlockTime, { value: ethers.utils.parseEther(naviteValue) });
  
    // Wait for the deployment to be confirmed
    await lock.deployed();


    console.log(`Lock contract deployed to: ${lock.address}`);


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

