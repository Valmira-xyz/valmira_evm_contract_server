const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying SimpleDEX Contracts to Somnia Testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // 1. Deploy SimpleDEXFactory
    console.log("\n📝 Deploying SimpleDEXFactory...");
    const SimpleDEXFactory = await ethers.getContractFactory("SimpleDEXFactory");
    const factory = await SimpleDEXFactory.deploy(deployer.address);
    await factory.deployed();
    console.log("✅ SimpleDEXFactory deployed at:", factory.address);

    // 2. Deploy WETH (Wrapped ETH) - using a simple WETH9 implementation
    // For Somnia, we'll need to check if WETH already exists
    // If not, we'll need to deploy it
    console.log("\n📝 Note: WETH address needed for router deployment");
    console.log("If WETH doesn't exist on Somnia testnet, deploy it separately");
    
    // Using zero address as placeholder - replace with actual WETH address
    const WETH_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Replace with actual WETH address
    
    // 3. Deploy SimpleDEXRouter
    console.log("\n📝 Deploying SimpleDEXRouter...");
    const SimpleDEXRouter = await ethers.getContractFactory("SimpleDEXRouter");
    const router = await SimpleDEXRouter.deploy(factory.address, WETH_ADDRESS);
    await router.deployed();
    console.log("✅ SimpleDEXRouter deployed at:", router.address);

    // Save deployment info
    const deploymentInfo = {
        network: "somniaTestnet",
        chainId: 50312,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            SimpleDEXFactory: factory.address,
            SimpleDEXRouter: router.address,
            WETH: WETH_ADDRESS
        }
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentPath = path.join(deploymentsDir, "simple-dex-somnia-testnet.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentPath);
    console.log("\n✅ Deployment complete!");
    console.log("\nContract Addresses:");
    console.log("SimpleDEXFactory:", factory.address);
    console.log("SimpleDEXRouter:", router.address);
    console.log("WETH:", WETH_ADDRESS);
    
    console.log("\n⚠️  IMPORTANT: Update WETH_ADDRESS with the actual WETH contract address on Somnia testnet");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
