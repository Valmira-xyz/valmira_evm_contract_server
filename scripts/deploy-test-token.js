const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying TestToken to Somnia testnet...");
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.utils.formatEther(await deployer.getBalance()), "STT");

  const initialSupply = ethers.utils.parseUnits("1000000", 18); // 1,000,000 TST
  const TestToken = await ethers.getContractFactory("TestToken");
  const token = await TestToken.deploy(initialSupply);
  await token.deployed();

  console.log("✅ TestToken deployed at:", token.address);
  console.log("   Tx Hash:", token.deployTransaction.hash);

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: "somniaTestnet",
    chainId: 50312,
    token: {
      address: token.address,
      symbol: "TST",
      name: "Test Token",
      decimals: 18,
      totalSupply: initialSupply.toString(),
    },
    deployer: deployer.address,
    txHash: token.deployTransaction.hash,
    timestamp: new Date().toISOString(),
  };

  const filePath = path.join(deploymentsDir, "test-token-somnia-testnet.json");
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment saved to:", filePath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
