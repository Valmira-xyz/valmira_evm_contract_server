const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Disperse contract...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "STT");

  const Disperse = await ethers.getContractFactory("Disperse");
  const disperse = await Disperse.deploy();
  const receipt = await disperse.deployTransaction.wait(3);

  console.log("✅ Disperse deployed at:", disperse.address);
  console.log("   Tx Hash:", receipt.transactionHash);
  console.log("   Block:", receipt.blockNumber);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const outputPath = path.join(deploymentsDir, "disperse-somnia-testnet.json");
  const payload = {
    network: "somniaTestnet",
    chainId: 50312,
    contract: "Disperse",
    address: disperse.address,
    deployer: deployer.address,
    txHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log("💾 Deployment saved to:", outputPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
