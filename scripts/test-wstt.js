const { ethers } = require('ethers');
require('dotenv').config();

// WSTT Contract Address on Somnia Testnet
const WSTT_ADDRESS = '0x40722b4Eb73194eDB6cf518B94b022f1877b0811';

// WSTT ABI (minimal for testing)
const WSTT_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function deposit() payable',
  'function withdraw(uint256 wad)',
  'event Deposit(address indexed dst, uint256 wad)',
  'event Withdrawal(address indexed src, uint256 wad)'
];

async function main() {
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(
    process.env.SOMNIA_TESTNET_RPC_URL || 'https://dream-rpc.somnia.network/'
  );
  
  console.log('🔗 Connecting to Somnia Testnet...\n');
  
  // Get network info
  const network = await provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);
  
  // Create contract instance
  const wsttContract = new ethers.Contract(WSTT_ADDRESS, WSTT_ABI, provider);
  
  // Read contract info
  console.log('📋 WSTT Contract Information:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const name = await wsttContract.name();
  const symbol = await wsttContract.symbol();
  const decimals = await wsttContract.decimals();
  const totalSupply = await wsttContract.totalSupply();
  
  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Decimals: ${decimals}`);
  console.log(`Total Supply: ${ethers.formatEther(totalSupply)} WSTT`);
  console.log(`Contract Address: ${WSTT_ADDRESS}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // If private key is provided, test deposit and withdraw
  if (process.env.PRIVATE_KEY) {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const wsttWithSigner = wsttContract.connect(wallet);
    
    console.log(`👤 Testing with wallet: ${wallet.address}\n`);
    
    // Check balances
    const sttBalance = await provider.getBalance(wallet.address);
    const wsttBalance = await wsttContract.balanceOf(wallet.address);
    
    console.log('💰 Current Balances:');
    console.log(`STT Balance: ${ethers.formatEther(sttBalance)} STT`);
    console.log(`WSTT Balance: ${ethers.formatEther(wsttBalance)} WSTT\n`);
    
    // Test deposit (wrap STT to WSTT)
    const depositAmount = ethers.parseEther('0.001'); // 0.001 STT
    
    if (sttBalance < depositAmount) {
      console.log('⚠️  Insufficient STT balance for test deposit');
    } else {
      console.log('🔄 Testing deposit (wrapping STT to WSTT)...');
      console.log(`Depositing: ${ethers.formatEther(depositAmount)} STT\n`);
      
      try {
        const depositTx = await wsttWithSigner.deposit({ value: depositAmount });
        console.log(`✅ Deposit transaction sent: ${depositTx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const depositReceipt = await depositTx.wait();
        console.log(`✅ Deposit confirmed in block ${depositReceipt.blockNumber}\n`);
        
        // Check new balances
        const newSttBalance = await provider.getBalance(wallet.address);
        const newWsttBalance = await wsttContract.balanceOf(wallet.address);
        
        console.log('💰 New Balances After Deposit:');
        console.log(`STT Balance: ${ethers.formatEther(newSttBalance)} STT`);
        console.log(`WSTT Balance: ${ethers.formatEther(newWsttBalance)} WSTT\n`);
      } catch (error) {
        console.error('❌ Deposit failed:', error.message);
      }
    }
    
    // Test withdraw (unwrap WSTT to STT)
    const currentWsttBalance = await wsttContract.balanceOf(wallet.address);
    
    if (currentWsttBalance > 0) {
      const withdrawAmount = ethers.parseEther('0.0005'); // 0.0005 WSTT
      
      if (currentWsttBalance < withdrawAmount) {
        console.log('⚠️  Insufficient WSTT balance for test withdrawal');
        console.log(`Available: ${ethers.formatEther(currentWsttBalance)} WSTT`);
      } else {
        console.log('🔄 Testing withdraw (unwrapping WSTT to STT)...');
        console.log(`Withdrawing: ${ethers.formatEther(withdrawAmount)} WSTT\n`);
        
        try {
          // Get gas estimate
          const gasEstimate = await wsttWithSigner.withdraw.estimateGas(withdrawAmount);
          console.log(`Estimated gas: ${gasEstimate.toString()}`);
          
          const withdrawTx = await wsttWithSigner.withdraw(withdrawAmount, {
            gasLimit: gasEstimate * 120n / 100n // 20% buffer
          });
          console.log(`✅ Withdrawal transaction sent: ${withdrawTx.hash}`);
          console.log('⏳ Waiting for confirmation...');
          
          const withdrawReceipt = await withdrawTx.wait();
          console.log(`✅ Withdrawal confirmed in block ${withdrawReceipt.blockNumber}\n`);
          
          // Check final balances
          const finalSttBalance = await provider.getBalance(wallet.address);
          const finalWsttBalance = await wsttContract.balanceOf(wallet.address);
          
          console.log('💰 Final Balances After Withdrawal:');
          console.log(`STT Balance: ${ethers.formatEther(finalSttBalance)} STT`);
          console.log(`WSTT Balance: ${ethers.formatEther(finalWsttBalance)} WSTT\n`);
          
          console.log('✅ All tests passed! The WSTT contract is working correctly.');
        } catch (error) {
          console.error('❌ Withdrawal failed:', error.message);
          console.error('Full error:', error);
        }
      }
    } else {
      console.log('⚠️  No WSTT balance to test withdrawal');
    }
  } else {
    console.log('ℹ️  To test deposit/withdraw functions, set PRIVATE_KEY in .env file');
    console.log('   The private key should have some STT balance on Somnia Testnet');
  }
  
  console.log('\n🎯 WSTT Contract Testing Complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
