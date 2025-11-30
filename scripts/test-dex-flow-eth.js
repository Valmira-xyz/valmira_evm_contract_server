const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployment(file) {
  const filePath = path.join(__dirname, "..", "deployments", file);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function main() {
  const dexDeployment = loadDeployment("complete-dex-somnia-testnet.json");
  const tokenDeployment = loadDeployment("test-token-somnia-testnet.json");

  const routerAddress = dexDeployment.contracts.SimpleDEXRouter.address;
  const factoryAddress = dexDeployment.contracts.SimpleDEXFactory.address;
  const wsttAddress = dexDeployment.contracts.WSTT.address;
  const tokenAddress = tokenDeployment.token.address;

  console.log("📦 Using Router:", routerAddress);
  console.log("📦 Using Factory:", factoryAddress);
  console.log("📦 Using WSTT:", wsttAddress);
  console.log("📦 Using TestToken:", tokenAddress);

  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  console.log("👤 Signer:", address);

  const token = await ethers.getContractAt("TestToken", tokenAddress, signer);
  const router = await ethers.getContractAt("SimpleDEXRouter", routerAddress, signer);
  const factory = await ethers.getContractAt("SimpleDEXFactory", factoryAddress, signer);

  const balanceBefore = await signer.getBalance();
  console.log("💰 Native balance (STT) before:", ethers.utils.formatEther(balanceBefore));

  const tokenBalanceBefore = await token.balanceOf(address);
  console.log("🏦 TestToken balance before:", ethers.utils.formatUnits(tokenBalanceBefore, 18));

  const deadline = Math.floor(Date.now() / 1000) + 600;

  // Buy tokens with ETH using swapETHForExactTokens
  // This function allows you to specify the exact amount of tokens you want to receive
  const tokensDesired = ethers.utils.parseUnits("100", 18); // Want exactly 100 tokens
  const maxEthToSpend = ethers.utils.parseEther("0.5"); // Willing to spend up to 0.5 STT
  
  console.log("\n🛒 Buying tokens with ETH...");
  console.log("   Desired tokens:", ethers.utils.formatUnits(tokensDesired, 18));
  console.log("   Max ETH to spend:", ethers.utils.formatEther(maxEthToSpend));
  
  const pathBuy = [wsttAddress, tokenAddress];
  const swapBuyTx = await (
    await router.swapETHForExactTokens(
      tokensDesired,
      pathBuy,
      address,
      deadline,
      { value: maxEthToSpend }
    )
  ).wait();
  console.log("   ✅ Buy tx hash:", swapBuyTx.transactionHash);
  console.log("   Gas used:", swapBuyTx.gasUsed.toString());

  const tokensAfterBuy = await token.balanceOf(address);
  const nativeAfterBuy = await signer.getBalance();
  console.log("📈 TestToken balance after buy:", ethers.utils.formatUnits(tokensAfterBuy, 18));
  console.log("💰 Native STT balance after buy:", ethers.utils.formatEther(nativeAfterBuy));

  // Sell tokens back for ETH using swapExactTokensForETH
  // This function allows you to sell an exact amount of tokens
  const tokensToSell = tokensAfterBuy.sub(tokenBalanceBefore).div(2); // Sell half of what we bought
  const minEthOut = ethers.utils.parseEther("0"); // Accept any amount of ETH (set to 0 for testing)
  
  console.log("\n💱 Selling tokens for ETH...");
  console.log("   Tokens to sell:", ethers.utils.formatUnits(tokensToSell, 18));
  console.log("   Min ETH expected:", ethers.utils.formatEther(minEthOut));
  
  console.log("🤝 Approving router for TestToken...");
  await (await token.approve(routerAddress, tokensToSell)).wait();

  const pathSell = [tokenAddress, wsttAddress];
  const swapSellTx = await (
    await router.swapExactTokensForETH(
      tokensToSell,
      minEthOut,
      pathSell,
      address,
      deadline
    )
  ).wait();
  console.log("   ✅ Sell tx hash:", swapSellTx.transactionHash);
  console.log("   Gas used:", swapSellTx.gasUsed.toString());

  const tokensFinal = await token.balanceOf(address);
  const nativeFinal = await signer.getBalance();
  console.log("\n🏁 Final balances:");
  console.log("   TestToken:", ethers.utils.formatUnits(tokensFinal, 18));
  console.log("   Native STT:", ethers.utils.formatEther(nativeFinal));
  
  const ethSpent = balanceBefore.sub(nativeFinal);
  const ethRecovered = nativeFinal.sub(nativeAfterBuy);
  console.log("\n📊 Summary:");
  console.log("   Total ETH spent:", ethers.utils.formatEther(ethSpent));
  console.log("   ETH recovered from sale:", ethers.utils.formatEther(ethRecovered));
  console.log("   Net ETH spent:", ethers.utils.formatEther(ethSpent.sub(ethRecovered)));
  console.log("   Tokens remaining:", ethers.utils.formatUnits(tokensFinal.sub(tokenBalanceBefore), 18));
}

main().catch((error) => {
  console.error("❌ Error during DEX flow:", error);
  process.exitCode = 1;
});

