const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying SimpleDEX Factory to Somnia Testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "STT");

    // 1. Deploy SimpleDEXFactory with manual gas settings
    console.log("\n📝 Deploying SimpleDEXFactory...");
    const SimpleDEXFactory = await ethers.getContractFactory("SimpleDEXFactory");
    
    const factory = await SimpleDEXFactory.deploy(deployer.address, {
        gasLimit: 3000000, // 3M gas limit
        gasPrice: ethers.utils.parseUnits("20", "gwei")
    });
    
    console.log("Transaction sent, waiting for confirmation...");
    await factory.deployed();
    console.log("✅ SimpleDEXFactory deployed at:", factory.address);

    // Save deployment info
    const deploymentInfo = {
        network: "somniaTestnet",
        chainId: 50312,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            SimpleDEXFactory: factory.address
        },
        transactionHash: factory.deployTransaction.hash
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentPath = path.join(deploymentsDir, "simple-dex-factory-somnia-testnet.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentPath);
    console.log("Transaction hash:", factory.deployTransaction.hash);
    console.log("\n✅ SimpleDEXFactory deployment complete!");
    console.log("\nContract Address:", factory.address);
    
    console.log("\n📝 Next steps:");
    console.log("1. Get more testnet tokens from Somnia faucet");
    console.log("2. Deploy or get WETH address for Somnia testnet");
    console.log("3. Deploy SimpleDEXRouter with factory address:", factory.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed!");
        console.error(error);
        if (error.message.includes("insufficient")) {
            console.log("\n💡 Tip: Get more testnet tokens from Somnia faucet:");
            console.log("   https://faucet.somnia.network (or check Somnia docs for faucet URL)");
        }
        process.exit(1);
    });
