const { ethers } = require("hardhat");

// SimpleDEXPair ABI - minimal functions needed
const PAIR_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function totalSupply() external view returns (uint256)",
  "function factory() external view returns (address)",
  "function balanceOf(address) external view returns (uint256)"
];

// ERC20 ABI for token info
const ERC20_ABI = [
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address) external view returns (uint256)"
];

async function main() {
  const pairAddress = "0x8bf7a7f0A79826AC2297dd50BAb26fe05AA1EFf9";
  
  console.log("🔍 Verifying SimpleDEXPair Contract");
  console.log("=" .repeat(60));
  console.log("Pair Address:", pairAddress);
  console.log("Network: Somnia Testnet");
  console.log("=" .repeat(60));
  
  // Get signer (will use network from hardhat config)
  const [signer] = await ethers.getSigners();
  const provider = signer.provider;
  const network = await provider.getNetwork();
  
  console.log("Connected to network:", network.name || "unknown");
  console.log("Chain ID:", network.chainId.toString());
  console.log("Signer:", await signer.getAddress());
  console.log("=" .repeat(60));
  
  // Connect to the pair contract
  const pair = await ethers.getContractAt("SimpleDEXPair", pairAddress, signer);
  
  try {
    // Get pair information
    console.log("\n📋 Pair Information:");
    const token0 = await pair.token0();
    const token1 = await pair.token1();
    const factory = await pair.factory();
    const totalSupply = await pair.totalSupply();
    
    console.log("  Token0:", token0);
    console.log("  Token1:", token1);
    console.log("  Factory:", factory);
    console.log("  Total Supply (LP tokens):", ethers.utils.formatEther(totalSupply));
    
    // Get reserves
    console.log("\n💰 Reserves:");
    const [reserve0, reserve1, blockTimestampLast] = await pair.getReserves();
    console.log("  Reserve0:", reserve0.toString(), "wei");
    console.log("  Reserve1:", reserve1.toString(), "wei");
    console.log("  Last Update Block:", blockTimestampLast.toString());
    
    // Get token info using interface directly
    console.log("\n🪙 Token Details:");
    const token0Contract = new ethers.Contract(token0, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1, ERC20_ABI, provider);
    
    try {
      const token0Symbol = await token0Contract.symbol();
      const token0Name = await token0Contract.name();
      const token0Decimals = await token0Contract.decimals();
      console.log("  Token0:");
      console.log("    Address:", token0);
      console.log("    Name:", token0Name);
      console.log("    Symbol:", token0Symbol);
      console.log("    Decimals:", token0Decimals);
      console.log("    Reserve:", ethers.utils.formatUnits(reserve0, token0Decimals), token0Symbol);
    } catch (e) {
      console.log("  Token0:");
      console.log("    Address:", token0);
      console.log("    Could not fetch ERC20 details:", e.message);
      console.log("    Reserve (raw):", reserve0.toString(), "wei");
    }
    
    try {
      const token1Symbol = await token1Contract.symbol();
      const token1Name = await token1Contract.name();
      const token1Decimals = await token1Contract.decimals();
      console.log("  Token1:");
      console.log("    Address:", token1);
      console.log("    Name:", token1Name);
      console.log("    Symbol:", token1Symbol);
      console.log("    Decimals:", token1Decimals);
      console.log("    Reserve:", ethers.utils.formatUnits(reserve1, token1Decimals), token1Symbol);
    } catch (e) {
      console.log("  Token1:");
      console.log("    Address:", token1);
      console.log("    Could not fetch ERC20 details:", e.message);
      console.log("    Reserve (raw):", reserve1.toString(), "wei");
    }
    
    // Check if pair has liquidity
    console.log("\n💧 Liquidity Status:");
    const reserve0BigInt = BigInt(reserve0.toString());
    const reserve1BigInt = BigInt(reserve1.toString());
    if (reserve0BigInt === 0n && reserve1BigInt === 0n) {
      console.log("  ❌ NO LIQUIDITY - Pair has zero reserves!");
      console.log("  ⚠️  This explains the 'INSUFFICIENT_LIQUIDITY' error!");
    } else if (reserve0BigInt === 0n || reserve1BigInt === 0n) {
      console.log("  ⚠️  INSUFFICIENT LIQUIDITY - One reserve is zero!");
    } else {
      console.log("  ✅ Pair has liquidity");
    }
    
    // Calculate price ratio
    if (reserve0 > 0n && reserve1 > 0n) {
      const priceRatio = Number(reserve1) / Number(reserve0);
      console.log("\n📊 Price Ratio:");
      console.log("  Token1/Token0:", priceRatio.toFixed(6));
      console.log("  Token0/Token1:", (1 / priceRatio).toFixed(6));
    }
    
    // Check contract code
    console.log("\n🔐 Contract Verification:");
    const code = await ethers.provider.getCode(pairAddress);
    if (code === "0x") {
      console.log("  ❌ No contract code found at this address!");
    } else {
      console.log("  ✅ Contract code exists");
      console.log("  Code length:", code.length, "characters");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ Verification Complete");
    
  } catch (error) {
    console.error("\n❌ Error verifying pair:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("❌ Script error:", error);
  process.exitCode = 1;
});

