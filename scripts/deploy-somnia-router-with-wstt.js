/**
 * SomniaRouter Deployment Script with WSTT Support
 * 
 * This script deploys a new SomniaRouter with WSTT (Wrapped STT) integration
 * 
 * Prerequisites:
 * 1. WSTT contract must be deployed first
 * 2. Update WSTT_ADDRESS constant below
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-somnia-router-with-wstt.js --network somniaTestnet
 */

const hre = require("hardhat");

// ⚠️ UPDATE THESE ADDRESSES BEFORE RUNNING
const FACTORY_ADDRESS = "0x96eE1a0cb578AB2F8d7769c155D4A694d5845477"; // Pre-deployed Somnia Factory
const WSTT_ADDRESS = "0x40722b4Eb73194eDB6cf518B94b022f1877b0811"; // <-- MUST UPDATE THIS!

async function main() {
  console.log("🚀 Starting SomniaRouter deployment with WSTT support...\n");

  // Validation - WSTT is already deployed and verified at 0x40722b4Eb73194eDB6cf518B94b022f1877b0811
  if (WSTT_ADDRESS === "REPLACE_WITH_YOUR_DEPLOYED_WSTT_ADDRESS") {
    console.error("❌ ERROR: Please update WSTT_ADDRESS in this script!");
    console.error("   Deploy WSTT first using: npx hardhat run scripts/deploy-wstt.js --network somniaTestnet");
    process.exit(1);
  }

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deployer address:", deployer.address);

  // Get deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Deployer balance:", hre.ethers.utils.formatEther(balance), "STT");

  if (balance.lt(hre.ethers.utils.parseEther("0.1"))) {
    console.warn("⚠️  Warning: Low balance. You may need more STT for deployment.\n");
  }

  console.log("\n📋 Configuration:");
  console.log("   Factory Address:", FACTORY_ADDRESS);
  console.log("   WSTT Address:", WSTT_ADDRESS);

  // Verify WSTT exists
  console.log("\n🔍 Verifying WSTT contract...");
  const wsttCode = await hre.ethers.provider.getCode(WSTT_ADDRESS);
  if (wsttCode === "0x") {
    console.error("❌ ERROR: No contract found at WSTT address!");
    console.error("   Please verify the WSTT address is correct.");
    process.exit(1);
  }
  console.log("✅ WSTT contract verified!");

  // Deploy Router
  console.log("\n📦 Deploying SomniaRouter...");
  const Router = await hre.ethers.getContractFactory("SomniaRouter");
  const router = await Router.deploy(FACTORY_ADDRESS, WSTT_ADDRESS);

  await router.deployed();

  console.log("✅ SomniaRouter deployed successfully!");
  console.log("📍 Contract address:", router.address);
  console.log("🔗 Transaction hash:", router.deployTransaction.hash);

  console.log("\n⏳ Waiting for block confirmations...");
  await router.deployTransaction.wait(5);
  console.log("✅ Block confirmations completed!\n");

  // Verify deployment
  console.log("📋 Contract Details:");
  const factoryFromRouter = await router.factory();
  const wethFromRouter = await router.WETH();
  console.log("   Factory:", factoryFromRouter);
  console.log("   WETH (WSTT):", wethFromRouter);

  if (factoryFromRouter !== FACTORY_ADDRESS) {
    console.warn("⚠️  Warning: Factory address mismatch!");
  }
  if (wethFromRouter !== WSTT_ADDRESS) {
    console.warn("⚠️  Warning: WSTT address mismatch!");
  }

  console.log("\n" + "=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📝 Next Steps:");
  console.log("\n1. Verify the contract on Somnia Explorer:");
  console.log(`   npx hardhat verify --network somniaTestnet ${router.address} ${FACTORY_ADDRESS} ${WSTT_ADDRESS}`);
  console.log("\n2. Update configuration files with new Router address:");
  console.log("\n   Frontend: /valmira_frontend/services/web3Utils.ts");
  console.log("   SOMNIA_TESTNET.routerAddress:", `"${router.address}"`);
  console.log("\n   Backend: /valmira_backend/src/utils/web3Utils.ts");
  console.log("   SOMNIA_TESTNET.routerAddress:", `"${router.address}"`);
  console.log("\n   Contract Server: /valmira_contract_server/src/workers/deploymentProcess.js");
  console.log("   somniaTestnet.routerAddress:", `"${router.address}"`);
  console.log("\n   Frontend Config: /valmira_frontend/lib/deploy-token/config.ts");
  console.log("   SOMNIA_TESTNET_ADDRESSES.router:", `"${router.address}"`);
  console.log("\n3. Test token deployment on Somnia Testnet");
  console.log("\n4. Verify pair creation works correctly");
  console.log("=".repeat(70));
  console.log("\n🔍 Explorer Link:");
  console.log(`   https://shannon-explorer.somnia.network/address/${router.address}`);
  console.log("\n");

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: "somniaTestnet",
    chainId: 50312,
    contractName: "SomniaRouter",
    contractAddress: router.address,
    factoryAddress: FACTORY_ADDRESS,
    wsttAddress: WSTT_ADDRESS,
    deployerAddress: deployer.address,
    transactionHash: router.deployTransaction.hash,
    blockNumber: router.deployTransaction.blockNumber,
    timestamp: new Date().toISOString(),
  };

  const outputPath = './deployments/somnia-router-deployment.json';
  fs.mkdirSync('./deployments', { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`💾 Deployment info saved to: ${outputPath}\n`);

  // Update reference file with addresses
  const refPath = './deployments/somnia-testnet-addresses.json';
  const addresses = {
    network: "Somnia Testnet",
    chainId: 50312,
    lastUpdated: new Date().toISOString(),
    contracts: {
      factory: FACTORY_ADDRESS,
      router: router.address,
      wstt: WSTT_ADDRESS,
    },
    explorer: "https://shannon-explorer.somnia.network/",
    rpcUrl: "https://dream-rpc.somnia.network/",
  };
  fs.writeFileSync(refPath, JSON.stringify(addresses, null, 2));
  console.log(`📝 Address reference saved to: ${refPath}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

