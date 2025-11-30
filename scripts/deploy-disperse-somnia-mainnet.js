const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Disperse contract to Somnia Mainnet...");
  
  // Get the network name from hardhat config
  const networkName = hre.network.name;
  console.log("Network:", networkName);
  
  if (networkName !== "somniaMainnet") {
    console.error("❌ This script is intended for Somnia Mainnet only!");
    console.error("   Please use: npx hardhat run scripts/deploy-disperse-somnia-mainnet.js --network somniaMainnet");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Get balance - using ethers v5 format
  const balance = await deployer.getBalance();
  const balanceFormatted = ethers.utils.formatEther(balance);
  console.log("Balance:", balanceFormatted, "SOMI");
  
  if (balance.lt(ethers.utils.parseEther("0.01"))) {
    console.error("❌ Insufficient balance! Please fund the deployer address with SOMI.");
    console.error("   Minimum required: 0.01 SOMI");
    process.exit(1);
  }

  console.log("\n📝 Deploying Disperse contract...");
  const Disperse = await ethers.getContractFactory("Disperse");
  const disperse = await Disperse.deploy();
  
  console.log("⏳ Waiting for deployment confirmation (3 blocks)...");
  const receipt = await disperse.deployTransaction.wait(3);

  console.log("\n✅ Disperse deployed successfully!");
  console.log("   Address:", disperse.address);
  console.log("   Tx Hash:", receipt.transactionHash);
  console.log("   Block:", receipt.blockNumber);

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "disperse-somnia-mainnet.json");
  const payload = {
    network: "somniaMainnet",
    chainId: 5031,
    contract: "Disperse",
    address: disperse.address,
    deployer: deployer.address,
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log("\n💾 Deployment info saved to:", outputPath);

  // Verify contract (optional)
  console.log("\n🔍 To verify the contract, run:");
  console.log(`   npx hardhat verify --network somniaMainnet ${disperse.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

