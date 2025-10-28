const { ethers } = require("hardhat");

async function main() {

    console.log("🚀 Deploying Somnia DEX Contracts to Somnia Testnet...");
  // 1. Deploy SomniaFactory
  const SomniaFactory = await ethers.getContractFactory("SomniaFactory");
  const factory = await SomniaFactory.deploy();

  await factory.deployed();
  console.log("✅ SomniaFactory deployed at:", factory.address);

  // 2. Deploy SomniaRouter using the Factory address
  // Example constructor: constructor(address _factory)
  const SomniaRouter = await ethers.getContractFactory("SomniaRouter");
  const router = await SomniaRouter.deploy(factory.address); // pass the factory here

  await router.deployed();
  console.log("✅ SomniaRouter deployed at:", router.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
