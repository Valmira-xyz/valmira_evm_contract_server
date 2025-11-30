# Algebra V4 Deployment - Ready Status

## ✅ Compilation Status

**SUCCESS!** All contracts compiled successfully.

## ⚠️ Deployment Issue: Insufficient Balance

The deployment script is working correctly, but you need more STT (Somnia Test Tokens) to deploy.

**Current Balance:** ~0.08 STT  
**Recommended:** At least 0.5-1 STT for full deployment

### Get More STT

1. **Somnia Faucet:** Visit the Somnia testnet faucet to get more STT
2. **Check:** https://docs.somnia.network/ for faucet information

## 📋 Deployment Order

The script will deploy in this order:

1. ✅ **AlgebraPoolDeployer** - Requires factory address (using temporary address)
2. ✅ **AlgebraFactory** - Requires poolDeployer address  
3. ⏳ **AlgebraCommunityVault** - Requires factory address
4. ⏳ **SwapRouter** - Requires factory + vault addresses
5. ⏳ **Quoter** - Requires factory address
6. ⏳ **QuoterV2** - Requires factory address
7. ⏳ **NonfungiblePositionManager** - Requires factory + WETH addresses
8. ⏳ **TickLens** - No dependencies

## 🔧 Important Notes

### Circular Dependency Resolution

There's a circular dependency between AlgebraPoolDeployer and AlgebraFactory:
- **AlgebraPoolDeployer** needs factory address in constructor
- **AlgebraFactory** needs poolDeployer address in constructor

**Current Solution:**
- Deploy AlgebraPoolDeployer with temporary factory address (deployer address)
- Deploy AlgebraFactory with the poolDeployer address
- For production, you may want to redeploy AlgebraPoolDeployer with the correct factory address

**Alternative:** Use CREATE2 to compute addresses first, then deploy both with correct addresses.

## 🚀 Ready to Deploy

Once you have sufficient STT balance:

```bash
npx hardhat run scripts/deploy-algebra-v4.js --network somniaTestnet
```

## 📝 After Deployment

1. Check `deployments/somniaTestnet/algebra-v4.json` for all addresses
2. Update backend config: `valmira_backend/src/utils/web3Utils.ts`
3. Update frontend configs
4. Test the deployed contracts

## ✅ What's Working

- ✅ All contracts compiled successfully
- ✅ Deployment script is ready
- ✅ Hardhat config supports Solidity 0.8.20
- ✅ All dependencies installed
- ⏳ Waiting for sufficient STT balance

