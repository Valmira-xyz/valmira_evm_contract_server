/**
 * Complete DEX Deployment Script for Somnia Testnet
 * 
 * Deployment Order:
 * 1. Deploy WSTT (Wrapped STT)
 * 2. Deploy SimpleDEXFactory
 * 3. Deploy SimpleDEXRouter (with Factory and WSTT addresses)
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-dex-complete.js --network somniaTestnet
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting Complete DEX Deployment to Somnia Testnet...\n");
    console.log("=" .repeat(70));
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deployer address:", deployer.address);
    
    // Get deployer balance
    const balance = await deployer.getBalance();
    console.log("💰 Deployer balance:", hre.ethers.utils.formatEther(balance), "STT");
    console.log("=" .repeat(70) + "\n");
    
    if (balance.lt(hre.ethers.utils.parseEther("0.5"))) {
        console.warn("⚠️  Warning: Low balance. You may need more STT for deployment.\n");
    }

    const deploymentInfo = {
        network: "somniaTestnet",
        chainId: 50312,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {}
    };

    // ========================================
    // STEP 1: Deploy WSTT
    // ========================================
    console.log("📦 STEP 1: Deploying WSTT (Wrapped STT)...");
    const WSTT = await hre.ethers.getContractFactory("WSTT");
    const wstt = await WSTT.deploy();
    await wstt.deployed();
    
    console.log("✅ WSTT deployed at:", wstt.address);
    console.log("   - Name:", await wstt.name());
    console.log("   - Symbol:", await wstt.symbol());
    console.log("   - Decimals:", await wstt.decimals());
    console.log("   - Tx Hash:", wstt.deployTransaction.hash);
    
    deploymentInfo.contracts.WSTT = {
        address: wstt.address,
        txHash: wstt.deployTransaction.hash,
        blockNumber: wstt.deployTransaction.blockNumber
    };
    
    console.log("\n⏳ Waiting for confirmations...");
    await wstt.deployTransaction.wait(3);
    console.log("✅ WSTT confirmed!\n");

    // ========================================
    // STEP 2: Deploy SimpleDEXFactory
    // ========================================
    console.log("📦 STEP 2: Deploying SimpleDEXFactory...");
    const SimpleDEXFactory = await hre.ethers.getContractFactory("SimpleDEXFactory");
    const factory = await SimpleDEXFactory.deploy(deployer.address);
    await factory.deployed();
    
    console.log("✅ SimpleDEXFactory deployed at:", factory.address);
    console.log("   - Fee To Setter:", deployer.address);
    console.log("   - Tx Hash:", factory.deployTransaction.hash);
    
    deploymentInfo.contracts.SimpleDEXFactory = {
        address: factory.address,
        txHash: factory.deployTransaction.hash,
        blockNumber: factory.deployTransaction.blockNumber,
        feeToSetter: deployer.address
    };
    
    console.log("\n⏳ Waiting for confirmations...");
    await factory.deployTransaction.wait(3);
    console.log("✅ SimpleDEXFactory confirmed!\n");

    // ========================================
    // STEP 3: Deploy SimpleDEXRouter
    // ========================================
    console.log("📦 STEP 3: Deploying SimpleDEXRouter...");
    const SimpleDEXRouter = await hre.ethers.getContractFactory("SimpleDEXRouter");
    const router = await SimpleDEXRouter.deploy(factory.address, wstt.address);
    await router.deployed();
    
    console.log("✅ SimpleDEXRouter deployed at:", router.address);
    console.log("   - Factory:", factory.address);
    console.log("   - WETH/WSTT:", wstt.address);
    console.log("   - Tx Hash:", router.deployTransaction.hash);
    
    deploymentInfo.contracts.SimpleDEXRouter = {
        address: router.address,
        txHash: router.deployTransaction.hash,
        blockNumber: router.deployTransaction.blockNumber,
        factory: factory.address,
        weth: wstt.address
    };
    
    console.log("\n⏳ Waiting for confirmations...");
    await router.deployTransaction.wait(3);
    console.log("✅ SimpleDEXRouter confirmed!\n");

    // ========================================
    // Save Deployment Information
    // ========================================
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentPath = path.join(deploymentsDir, "complete-dex-somnia-testnet.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("=" .repeat(70));
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=" .repeat(70));
    console.log("\n📋 Deployed Contracts:");
    console.log("   WSTT:              ", wstt.address);
    console.log("   SimpleDEXFactory:  ", factory.address);
    console.log("   SimpleDEXRouter:   ", router.address);
    console.log("\n💾 Deployment info saved to:", deploymentPath);
    
    console.log("\n🔍 Explorer Links:");
    console.log("   WSTT:     ", `https://shannon-explorer.somnia.network/address/${wstt.address}`);
    console.log("   Factory:  ", `https://shannon-explorer.somnia.network/address/${factory.address}`);
    console.log("   Router:   ", `https://shannon-explorer.somnia.network/address/${router.address}`);
    
    console.log("\n📝 Next Steps:");
    console.log("1. Verify contracts on Somnia Explorer:");
    console.log("   npx hardhat verify --network somniaTestnet", wstt.address);
    console.log("   npx hardhat verify --network somniaTestnet", factory.address, `"${deployer.address}"`);
    console.log("   npx hardhat verify --network somniaTestnet", router.address, `"${factory.address}"`, `"${wstt.address}"`);
    
    console.log("\n2. Update frontend configuration:");
    console.log("   - Router Address:", router.address);
    console.log("   - Factory Address:", factory.address);
    console.log("   - WSTT Address:", wstt.address);
    
    console.log("\n3. Test the DEX:");
    console.log("   - Create a trading pair");
    console.log("   - Add liquidity");
    console.log("   - Execute a swap");
    
    console.log("\n4. (Optional) Set up initial liquidity pools");
    console.log("=" .repeat(70) + "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });
