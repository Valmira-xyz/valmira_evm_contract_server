/**
 * WSTT (Wrapped STT) Deployment Script for Somnia Testnet
 * 
 * This script deploys the WSTT contract to Somnia Testnet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-wstt.js --network somniaTestnet
 */

const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting WSTT deployment to Somnia Testnet...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);

  // Get deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Deployer balance:", hre.ethers.utils.formatEther(balance), "STT\n");

  if (balance.lt(hre.ethers.utils.parseEther("0.1"))) {
    console.warn("⚠️  Warning: Low balance. You may need more STT for deployment.");
    console.warn("   Get testnet tokens from: https://docs.somnia.network/get-started/testnet-stt-tokens\n");
  }

  // Deploy WSTT
  console.log("📦 Deploying WSTT contract...");
  const WSTT = await hre.ethers.getContractFactory("WSTT");
  const wstt = await WSTT.deploy();

  await wstt.deployed();

  console.log("✅ WSTT deployed successfully!");
  console.log("📍 Contract address:", wstt.address);
  console.log("🔗 Transaction hash:", wstt.deployTransaction.hash);
  console.log("\n⏳ Waiting for block confirmations...");

  // Wait for 5 block confirmations
  await wstt.deployTransaction.wait(5);

  console.log("✅ Block confirmations completed!\n");

  // Verify contract details
  console.log("📋 Contract Details:");
  console.log("   Name:", await wstt.name());
  console.log("   Symbol:", await wstt.symbol());
  console.log("   Decimals:", await wstt.decimals());
  console.log("   Total Supply:", hre.ethers.utils.formatEther(await wstt.totalSupply()), "WSTT");

  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📝 Next Steps:");
  console.log("1. Verify the contract on Somnia Explorer:");
  console.log("   npx hardhat verify --network somniaTestnet", wstt.address);
  console.log("\n2. Update configuration files with WSTT address:");
  console.log("   - valmira_frontend/services/web3Utils.ts");
  console.log("   - valmira_backend/src/utils/web3Utils.ts");
  console.log("   - valmira_contract_server/src/workers/deploymentProcess.js");
  console.log("\n3. Add WSTT address to your configuration:");
  console.log("   wrappedNativeCurrency:", `"${wstt.address}"`);
  console.log("\n4. (Optional) Test wrapping/unwrapping:");
  console.log("   - Wrap STT: wstt.deposit({ value: ethers.utils.parseEther('1') })");
  console.log("   - Unwrap: wstt.withdraw(ethers.utils.parseEther('1'))");
  console.log("\n5. Update SomniaRouter to use this WSTT address");
  console.log("=".repeat(70));
  console.log("\n🔍 Explorer Link:");
  console.log(`   https://shannon-explorer.somnia.network/address/${wstt.address}`);
  console.log("\n");

  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: "somniaTestnet",
    chainId: 50312,
    contractName: "WSTT",
    contractAddress: wstt.address,
    deployerAddress: deployer.address,
    transactionHash: wstt.deployTransaction.hash,
    blockNumber: wstt.deployTransaction.blockNumber,
    timestamp: new Date().toISOString(),
    contractDetails: {
      name: await wstt.name(),
      symbol: await wstt.symbol(),
      decimals: await wstt.decimals()
    }
  };

  const outputPath = './deployments/wstt-somnia-testnet.json';
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${outputPath}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

