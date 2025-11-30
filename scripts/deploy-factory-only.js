const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying SimpleDEX Factory to Somnia Testnet...");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "STT");

    if (balance.lt(ethers.utils.parseEther("0.1"))) {
        console.warn("\n⚠️  WARNING: Low balance detected!");
        console.warn("You may need more testnet tokens for deployment.");
        console.warn("Get testnet tokens from Somnia testnet faucet.");
    }

    // 1. Deploy SimpleDEXFactory
    console.log("\n📝 Deploying SimpleDEXFactory...");
    const SimpleDEXFactory = await ethers.getContractFactory("SimpleDEXFactory");
    
    // Estimate gas
    const deployTx = SimpleDEXFactory.getDeployTransaction(deployer.address);
    const estimatedGas = await deployer.estimateGas(deployTx);
    console.log("Estimated gas:", estimatedGas.toString());
    
    const factory = await SimpleDEXFactory.deploy(deployer.address, {
        gasLimit: estimatedGas.mul(120).div(100) // 20% buffer
    });
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
        note: "SimpleDEXRouter deployment pending - needs WETH address and more testnet tokens"
    };

    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentPath = path.join(deploymentsDir, "simple-dex-factory-somnia-testnet.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentPath);
    console.log("\n✅ SimpleDEXFactory deployment complete!");
    console.log("\nContract Address:");
    console.log("SimpleDEXFactory:", factory.address);
    
    console.log("\n📝 Next steps:");
    console.log("1. Get more testnet tokens from Somnia faucet");
    console.log("2. Deploy or get WETH address for Somnia testnet");
    console.log("3. Deploy SimpleDEXRouter with factory and WETH addresses");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
