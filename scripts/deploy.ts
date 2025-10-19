import { ethers } from "hardhat";

async function main() {

  const [deployer] = await ethers.getSigners();
  const deployerAddress = deployer.address;

  console.log(`Deploying Disperse from: ${deployerAddress}`);

  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Balance of deployer: ${ethers.utils.formatEther(balance)} SOMNI`);

  if (balance.eq(0)) {
    console.log("❌ Insufficient balance. Get Somnia testnet funds before deploying.");
    return;
  }

  const Contract = await ethers.getContractFactory("Disperse");
  const contract = await Contract.deploy();

  await contract.deployed(); // ✅ Ethers v5

  console.log(`✅ Disperse deployed at: ${contract.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
