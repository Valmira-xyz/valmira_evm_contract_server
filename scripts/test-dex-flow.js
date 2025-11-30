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

  const wstt = await ethers.getContractAt("WSTT", wsttAddress, signer);
  const token = await ethers.getContractAt("TestToken", tokenAddress, signer);
  const router = await ethers.getContractAt("SimpleDEXRouter", routerAddress, signer);
  const factory = await ethers.getContractAt("SimpleDEXFactory", factoryAddress, signer);

  const balanceBefore = await signer.getBalance();
  console.log("💰 Native balance (STT):", ethers.utils.formatEther(balanceBefore));

  const depositAmount = ethers.utils.parseEther("1");
  console.log("➡️ Depositing", ethers.utils.formatEther(depositAmount), "STT into WSTT...");
  const depositTx = await (await wstt.deposit({ value: depositAmount })).wait();
  console.log("   Gas used:", depositTx.gasUsed.toString());

  const wsttBalance = await wstt.balanceOf(address);
  const tokenBalance = await token.balanceOf(address);
  console.log("🏦 WSTT balance: ", ethers.utils.formatEther(wsttBalance));
  console.log("🏦 TestToken balance:", ethers.utils.formatUnits(tokenBalance, 18));

  const amountTokenDesired = ethers.utils.parseUnits("1000", 18);
  const amountWsttDesired = ethers.utils.parseEther("0.8");
  const deadline = Math.floor(Date.now() / 1000) + 600;

  console.log("✅ Approving router for TestToken and WSTT...");
  await (await token.approve(routerAddress, amountTokenDesired)).wait();
  await (await wstt.approve(routerAddress, amountWsttDesired)).wait();

  console.log("💧 Adding liquidity...");
  const addLiqTx = await (
    await router.addLiquidity(
      tokenAddress,
      wsttAddress,
      amountTokenDesired,
      amountWsttDesired,
      0,
      0,
      address,
      deadline
    )
  ).wait();
  console.log("   Liquidity tx gas used:", addLiqTx.gasUsed.toString());

  const pairAddress = await factory.getPair(tokenAddress, wsttAddress);
  console.log("🔗 Pair address:", pairAddress);
  const pair = await ethers.getContractAt("SimpleDEXPair", pairAddress, signer);
  const lpBalance = await pair.balanceOf(address);
  console.log("💎 LP tokens received:", ethers.utils.formatEther(lpBalance));

  const amountInWstt = ethers.utils.parseEther("0.1");
  console.log("🤝 Approving router for swap WSTT...");
  await (await wstt.approve(routerAddress, amountInWstt)).wait();

  console.log("🛒 Swapping WSTT -> TestToken...");
  const pathBuy = [wsttAddress, tokenAddress];
  const swapBuyTx = await (
    await router.swapExactTokensForTokens(
      amountInWstt,
      0,
      pathBuy,
      address,
      deadline
    )
  ).wait();
  console.log("   Swap WSTT->TST gas used:", swapBuyTx.gasUsed.toString());

  const tokensAfterBuy = await token.balanceOf(address);
  console.log("📈 TestToken balance after buy:", ethers.utils.formatUnits(tokensAfterBuy, 18));

  const amountSell = tokensAfterBuy.div(10); // sell 10% of holdings
  console.log("🤝 Approving router for swap TestToken...");
  await (await token.approve(routerAddress, amountSell)).wait();

  const pathSell = [tokenAddress, wsttAddress];
  console.log("💱 Swapping TestToken -> WSTT...");
  const swapSellTx = await (
    await router.swapExactTokensForTokens(
      amountSell,
      0,
      pathSell,
      address,
      deadline
    )
  ).wait();
  console.log("   Swap TST->WSTT gas used:", swapSellTx.gasUsed.toString());

  const wsttFinal = await wstt.balanceOf(address);
  const tokenFinal = await token.balanceOf(address);
  console.log("🏁 Final WSTT:", ethers.utils.formatEther(wsttFinal));
  console.log("🏁 Final TestToken:", ethers.utils.formatUnits(tokenFinal, 18));

  const nativeFinal = await signer.getBalance();
  console.log("🏁 Native STT balance:", ethers.utils.formatEther(nativeFinal));
}

main().catch((error) => {
  console.error("❌ Error during DEX flow:", error);
  process.exitCode = 1;
});
