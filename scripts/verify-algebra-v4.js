const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Verification script for Algebra V4 DEX contracts
 * 
 * This script verifies all contracts deployed by deploy-algebra-v4.js on the blockchain explorer.
 * 
 * Features:
 * - Automatically tries verification without contract path first (Hardhat auto-detection)
 * - Falls back to contract path if auto-detection fails
 * - Handles special cases:
 *   - AlgebraPoolDeployer: Tries both current factory and deployer address (due to factory redeployment)
 *   - PluginFactory: Tries both BasePluginV1Factory and BasePluginV2Factory
 *   - All contracts: Checks if deployed before attempting verification
 * - Matches exact constructor arguments from deployment script
 * - Provides detailed error messages and verification status
 */

async function main() {
    const network = hre.network.name;
    const deploymentFile = path.join(__dirname, '../deployments', network, 'algebra-v4.json');
    
    if (!fs.existsSync(deploymentFile)) {
        console.error(`❌ Deployment file not found: ${deploymentFile}`);
        console.error("   Please run the deployment script first.");
        process.exit(1);
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const deployments = deploymentData.deployments;
    const WNativeTokenAddress = deploymentData.WNativeToken;
    
    console.log("=".repeat(60));
    console.log("Verifying Algebra V4 Contracts");
    console.log("=".repeat(60));
    console.log("Network:", network);
    console.log("Chain ID:", deploymentData.chainId);
    console.log("=".repeat(60));
    console.log("");
    
    const verificationResults = {};
    
    // Helper function to verify a contract
    async function verifyContract(name, address, constructorArgs = [], contractPath = null) {
        console.log(`Verifying ${name}...`);
        console.log(`  Address: ${address}`);
        if (constructorArgs.length > 0) {
            console.log(`  Constructor Args: ${constructorArgs.join(', ')}`);
        }
        
        // First, try without contract path (let Hardhat auto-detect from artifacts)
        try {
            const verifyParams = {
                address: address,
                constructorArguments: constructorArgs,
            };
            
            await hre.run("verify:verify", verifyParams);
            
            console.log(`✅ ${name} verified successfully!\n`);
            verificationResults[name] = { status: "verified", address };
            return true;
        } catch (error) {
            // If already verified, we're done
            if (error.message.includes("Already Verified") || error.message.includes("already been verified")) {
                console.log(`✅ ${name} already verified!\n`);
                verificationResults[name] = { status: "already_verified", address };
                return true;
            }
            
            // If contract path is provided and first attempt failed, try with contract path
            if (contractPath && (
                error.message.includes("More than one contract") ||
                error.message.includes("Cannot find") ||
                error.message.includes("not present") ||
                error.message.includes("No contract found")
            )) {
                console.log(`  Retrying with contract path: ${contractPath}`);
                try {
                    const verifyParamsWithPath = {
                        address: address,
                        constructorArguments: constructorArgs,
                        contract: contractPath,
                    };
                    
                    await hre.run("verify:verify", verifyParamsWithPath);
                    
                    console.log(`✅ ${name} verified successfully (with contract path)!\n`);
                    verificationResults[name] = { status: "verified", address };
                    return true;
                } catch (retryError) {
                    // Check if already verified in retry
                    if (retryError.message.includes("Already Verified") || retryError.message.includes("already been verified")) {
                        console.log(`✅ ${name} already verified!\n`);
                        verificationResults[name] = { status: "already_verified", address };
                        return true;
                    }
                    // If retry also failed, use the retry error for final handling
                    error = retryError;
                }
            }
            
            // Final error handling
            if (error.message.includes("bytecode doesn't match")) {
                console.log(`⚠️  ${name} verification failed: Bytecode mismatch\n`);
                console.log(`   Reason: Contract was deployed using pre-compiled artifacts from npm package`);
                console.log(`   (@cryptoalgebra/integral-periphery), but Hardhat verify is compiling`);
                console.log(`   locally with different compiler settings.\n`);
                console.log(`   Solution: These contracts need manual verification using:`);
                console.log(`   - Source code from: node_modules/@cryptoalgebra/integral-periphery/contracts/`);
                console.log(`   - Or verify manually on explorer with the exact source code`);
                console.log(`   - Explorer: https://shannon-explorer.somnia.network/address/${address}\n`);
                verificationResults[name] = { 
                    status: "requires_manual_verification", 
                    address,
                    error: "Bytecode mismatch - deployed from npm package artifacts",
                    reason: "Contract deployed using pre-compiled npm package artifacts, but Hardhat verify compiles locally with different settings"
                };
                return false;
            } else if (error.message.includes("local contracts") && !contractPath) {
                // Only mark as manual if we don't have a contract path to try
                console.log(`📝 ${name} requires manual verification (contract from npm package)\n`);
                console.log(`   To verify manually:`);
                console.log(`   - Explorer: https://shannon-explorer.somnia.network/address/${address}`);
                console.log(`   - Address: ${address}`);
                console.log(`   - Constructor Args: ${constructorArgs.join(', ')}`);
                console.log(`   - Source: Check @cryptoalgebra npm packages\n`);
                verificationResults[name] = { 
                    status: "requires_manual_verification", 
                    address,
                    reason: "Contract from npm package - source not in local contracts folder"
                };
                return false;
            } else {
                console.log(`⚠️  ${name} verification failed: ${error.message}\n`);
                verificationResults[name] = { status: "failed", address, error: error.message };
                return false;
            }
        }
    }
    
    try {
        // Note: There's a circular dependency in deployment:
        // - AlgebraFactory was deployed FIRST with temporary poolDeployer (deployer.address)
        // - AlgebraPoolDeployer was deployed with the FIRST factory address
        // - AlgebraFactory was then REDEPLOYED with the correct poolDeployer address
        // The deployment file only saves the final (second) factory address.
        // For verification, we need to handle this carefully.
        
        // 1. AlgebraPoolDeployer
        // Constructor: (address _factory) - uses the FIRST factory address (not saved in deployment file)
        // We'll try with the current factory address first, then with deployer address as fallback
        console.log("⚠️  Note: AlgebraPoolDeployer was deployed with the FIRST factory address");
        console.log("   (before Factory was redeployed). Trying verification...");
        console.log(`Verifying AlgebraPoolDeployer...`);
        console.log(`  Address: ${deployments.AlgebraPoolDeployer}`);
        
        let poolDeployerVerified = false;
        // Try with current factory address first
        try {
            const verifyParams = {
                address: deployments.AlgebraPoolDeployer,
                constructorArguments: [deployments.AlgebraFactory],
            };
            await hre.run("verify:verify", verifyParams);
            console.log(`✅ AlgebraPoolDeployer verified successfully!\n`);
            verificationResults.AlgebraPoolDeployer = { status: "verified", address: deployments.AlgebraPoolDeployer };
            poolDeployerVerified = true;
        } catch (error1) {
            if (error1.message.includes("Already Verified") || error1.message.includes("already been verified")) {
                console.log(`✅ AlgebraPoolDeployer already verified!\n`);
                verificationResults.AlgebraPoolDeployer = { status: "already_verified", address: deployments.AlgebraPoolDeployer };
                poolDeployerVerified = true;
            } else {
                // Try with deployer address (the temporary factory used initially)
                console.log(`  First attempt failed (${error1.message}), trying with deployer address...`);
                try {
                    const verifyParams2 = {
                        address: deployments.AlgebraPoolDeployer,
                        constructorArguments: [deploymentData.deployer],
                    };
                    await hre.run("verify:verify", verifyParams2);
                    console.log(`✅ AlgebraPoolDeployer verified successfully (with deployer address)!\n`);
                    verificationResults.AlgebraPoolDeployer = { status: "verified", address: deployments.AlgebraPoolDeployer };
                    poolDeployerVerified = true;
                } catch (error2) {
                    if (error2.message.includes("Already Verified") || error2.message.includes("already been verified")) {
                        console.log(`✅ AlgebraPoolDeployer already verified!\n`);
                        verificationResults.AlgebraPoolDeployer = { status: "already_verified", address: deployments.AlgebraPoolDeployer };
                        poolDeployerVerified = true;
                    } else {
                        console.log(`⚠️  AlgebraPoolDeployer verification failed: ${error2.message}\n`);
                        console.log(`   The poolDeployer was deployed with the FIRST factory address (before redeployment).\n`);
                        console.log(`   You may need to verify manually with the first factory address.\n`);
                        verificationResults.AlgebraPoolDeployer = { 
                            status: "failed", 
                            address: deployments.AlgebraPoolDeployer,
                            error: error2.message
                        };
                    }
                }
            }
        }
        
        // 2. AlgebraFactory (the FINAL/redeployed version)
        // Constructor: (address _poolDeployer)
        await verifyContract(
            "AlgebraFactory",
            deployments.AlgebraFactory,
            [deployments.AlgebraPoolDeployer]
        );
        
        // 3. AlgebraCommunityVault
        // Constructor: (address _factory, address _algebraFeeManager)
        // Uses ALGEBRA_FEE_MANAGER env var or deployer address (from deployment script line 178)
        const algebraFeeManager = process.env.ALGEBRA_FEE_MANAGER || deploymentData.deployer;
        await verifyContract(
            "AlgebraCommunityVault",
            deployments.AlgebraCommunityVault,
            [deployments.AlgebraFactory, algebraFeeManager]
        );
        
        // 4. AlgebraVaultFactoryStub
        // Constructor: (address _algebraCommunityVault)
        await verifyContract(
            "AlgebraVaultFactoryStub",
            deployments.AlgebraVaultFactoryStub,
            [deployments.AlgebraCommunityVault],
            "contracts/algebraV4/AlgebraVaultFactoryStub.sol:AlgebraVaultFactoryStub"
        );
        
        // 5. EntryPoint (AlgebraCustomPoolEntryPoint)
        // Constructor: (address _factory)
        if (deployments.EntryPoint) {
            await verifyContract(
                "EntryPoint",
                deployments.EntryPoint,
                [deployments.AlgebraFactory],
                "@cryptoalgebra/integral-periphery/contracts/AlgebraCustomPoolEntryPoint.sol:AlgebraCustomPoolEntryPoint"
            );
        } else {
            console.log("⚠️  EntryPoint not deployed, skipping verification\n");
            verificationResults.EntryPoint = { status: "skipped", address: null };
        }
        
        // 6. PluginFactory (BasePluginV1Factory or BasePluginV2Factory)
        // Constructor: (address _entryPoint)
        // Deployment script tries V1 first, then V2, then fallback
        // We'll try V1 first, and if it fails with "not found" errors, try V2
        if (deployments.PluginFactory) {
            console.log(`Verifying PluginFactory...`);
            console.log(`  Address: ${deployments.PluginFactory}`);
            console.log(`  Constructor Args: ${deployments.EntryPoint}`);
            
            // Try BasePluginV1Factory first (as deployment script does)
            let verified = false;
            try {
                const verifyParams = {
                    address: deployments.PluginFactory,
                    constructorArguments: [deployments.EntryPoint],
                };
                
                // First try without contract path
                try {
                    await hre.run("verify:verify", verifyParams);
                    console.log(`✅ PluginFactory verified successfully!\n`);
                    verificationResults.PluginFactory = { status: "verified", address: deployments.PluginFactory };
                    verified = true;
                } catch (error) {
                    if (error.message.includes("Already Verified") || error.message.includes("already been verified")) {
                        console.log(`✅ PluginFactory already verified!\n`);
                        verificationResults.PluginFactory = { status: "already_verified", address: deployments.PluginFactory };
                        verified = true;
                    } else {
                        // Try with V1 contract path
                        console.log(`  Retrying with BasePluginV1Factory contract path...`);
                        verifyParams.contract = "@cryptoalgebra/integral-base-plugin/contracts/BasePluginV1Factory.sol:BasePluginV1Factory";
                        try {
                            await hre.run("verify:verify", verifyParams);
                            console.log(`✅ PluginFactory verified successfully (BasePluginV1Factory)!\n`);
                            verificationResults.PluginFactory = { status: "verified", address: deployments.PluginFactory };
                            verified = true;
                        } catch (v1Error) {
                            if (v1Error.message.includes("Already Verified") || v1Error.message.includes("already been verified")) {
                                console.log(`✅ PluginFactory already verified!\n`);
                                verificationResults.PluginFactory = { status: "already_verified", address: deployments.PluginFactory };
                                verified = true;
                            } else if (v1Error.message.includes("Cannot find") || v1Error.message.includes("not present") || v1Error.message.includes("No contract found")) {
                                // Try V2 if V1 path not found
                                console.log(`  BasePluginV1Factory not found, trying BasePluginV2Factory...`);
                                verifyParams.contract = "@cryptoalgebra/integral-base-plugin/contracts/BasePluginV2Factory.sol:BasePluginV2Factory";
                                try {
                                    await hre.run("verify:verify", verifyParams);
                                    console.log(`✅ PluginFactory verified successfully (BasePluginV2Factory)!\n`);
                                    verificationResults.PluginFactory = { status: "verified", address: deployments.PluginFactory };
                                    verified = true;
                                } catch (v2Error) {
                                    if (v2Error.message.includes("Already Verified") || v2Error.message.includes("already been verified")) {
                                        console.log(`✅ PluginFactory already verified!\n`);
                                        verificationResults.PluginFactory = { status: "already_verified", address: deployments.PluginFactory };
                                        verified = true;
                                    } else {
                                        throw v2Error;
                                    }
                                }
                            } else {
                                throw v1Error;
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`⚠️  PluginFactory verification failed: ${error.message}\n`);
                verificationResults.PluginFactory = { 
                    status: "failed", 
                    address: deployments.PluginFactory,
                    error: error.message
                };
            }
        } else {
            console.log("⚠️  PluginFactory not deployed, skipping verification\n");
            verificationResults.PluginFactory = { status: "skipped", address: null };
        }
        
        // 7. TickLens
        // No constructor parameters
        if (deployments.TickLens) {
            await verifyContract(
                "TickLens", 
                deployments.TickLens,
                [],
                "@cryptoalgebra/integral-periphery/contracts/lens/TickLens.sol:TickLens"
            );
        } else {
            console.log("⚠️  TickLens not deployed, skipping verification\n");
            verificationResults.TickLens = { status: "skipped", address: null };
        }
        
        // 8. Quoter
        // Constructor: (address _factory, address _WNativeToken, address _poolDeployer)
        if (deployments.Quoter) {
            await verifyContract(
                "Quoter",
                deployments.Quoter,
                [deployments.AlgebraFactory, WNativeTokenAddress, deployments.AlgebraPoolDeployer],
                "@cryptoalgebra/integral-periphery/contracts/lens/Quoter.sol:Quoter"
            );
        } else {
            console.log("⚠️  Quoter not deployed, skipping verification\n");
            verificationResults.Quoter = { status: "skipped", address: null };
        }
        
        // 9. QuoterV2
        // Constructor: (address _factory, address _WNativeToken, address _poolDeployer)
        if (deployments.QuoterV2) {
            await verifyContract(
                "QuoterV2",
                deployments.QuoterV2,
                [deployments.AlgebraFactory, WNativeTokenAddress, deployments.AlgebraPoolDeployer],
                "@cryptoalgebra/integral-periphery/contracts/lens/QuoterV2.sol:QuoterV2"
            );
        } else {
            console.log("⚠️  QuoterV2 not deployed, skipping verification\n");
            verificationResults.QuoterV2 = { status: "skipped", address: null };
        }
        
        // 10. SwapRouter
        // Constructor: (address _factory, address _WNativeToken, address _poolDeployer)
        if (deployments.SwapRouter) {
            await verifyContract(
                "SwapRouter",
                deployments.SwapRouter,
                [deployments.AlgebraFactory, WNativeTokenAddress, deployments.AlgebraPoolDeployer],
                "@cryptoalgebra/integral-periphery/contracts/SwapRouter.sol:SwapRouter"
            );
        } else {
            console.log("⚠️  SwapRouter not deployed, skipping verification\n");
            verificationResults.SwapRouter = { status: "skipped", address: null };
        }
        
        // 11. NFTDescriptor
        // No constructor parameters
        if (deployments.NFTDescriptor) {
            await verifyContract(
                "NFTDescriptor", 
                deployments.NFTDescriptor,
                [],
                "@cryptoalgebra/integral-periphery/contracts/libraries/NFTDescriptor.sol:NFTDescriptor"
            );
        } else {
            console.log("⚠️  NFTDescriptor not deployed, skipping verification\n");
            verificationResults.NFTDescriptor = { status: "skipped", address: null };
        }
        
        // 12. NonfungibleTokenPositionDescriptor
        // Constructor: (address _WNativeToken, string memory _nativeCurrencySymbol, bytes32[] memory _nativeCurrencyLabel)
        // Note: This contract uses linked bytecode with NFTDescriptor library
        if (deployments.NonfungibleTokenPositionDescriptor) {
            const nativeCurrencySymbol = network.includes('testnet') ? 'STT' : 'SOMI';
            await verifyContract(
                "NonfungibleTokenPositionDescriptor",
                deployments.NonfungibleTokenPositionDescriptor,
                [WNativeTokenAddress, nativeCurrencySymbol, []],
                "@cryptoalgebra/integral-periphery/contracts/NonfungibleTokenPositionDescriptor.sol:NonfungibleTokenPositionDescriptor"
            );
        } else {
            console.log("⚠️  NonfungibleTokenPositionDescriptor not deployed, skipping verification\n");
            verificationResults.NonfungibleTokenPositionDescriptor = { status: "skipped", address: null };
        }
        
        // 13. Proxy (TransparentUpgradeableProxy) - Skip if using descriptor directly
        if (deployments.Proxy && deployments.Proxy !== deployments.NonfungibleTokenPositionDescriptor) {
            // Try to verify Proxy from OpenZeppelin
            try {
                await verifyContract(
                    "Proxy",
                    deployments.Proxy,
                    [deployments.NonfungibleTokenPositionDescriptor, deployments.ProxyAdmin, '0x'],
                    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy"
                );
            } catch (e) {
                console.log("📝 Proxy requires manual verification (OpenZeppelin contract)\n");
                verificationResults.Proxy = { 
                    status: "requires_manual_verification", 
                    address: deployments.Proxy,
                    reason: "OpenZeppelin contract - verify manually on explorer"
                };
            }
        } else {
            console.log("⚠️  Proxy skipped (using descriptor directly)\n");
            verificationResults.Proxy = { status: "skipped", address: deployments.Proxy };
        }
        
        // ProxyAdmin is not a contract, it's just an address
        if (deployments.ProxyAdmin) {
            verificationResults.ProxyAdmin = { 
                status: "info", 
                address: deployments.ProxyAdmin,
                note: "This is an EOA address, not a contract"
            };
        }
        
        // 14. NonfungiblePositionManager
        // Constructor: (address _factory, address _WNativeToken, address _tokenDescriptor, address _poolDeployer)
        // Uses Proxy if available, otherwise NonfungibleTokenPositionDescriptor directly
        if (deployments.NonfungiblePositionManager) {
            const descriptorAddress = deployments.Proxy && deployments.Proxy !== deployments.NonfungibleTokenPositionDescriptor
                ? deployments.Proxy 
                : deployments.NonfungibleTokenPositionDescriptor;
            await verifyContract(
                "NonfungiblePositionManager",
                deployments.NonfungiblePositionManager,
                [deployments.AlgebraFactory, WNativeTokenAddress, descriptorAddress, deployments.AlgebraPoolDeployer],
                "@cryptoalgebra/integral-periphery/contracts/NonfungiblePositionManager.sol:NonfungiblePositionManager"
            );
        } else {
            console.log("⚠️  NonfungiblePositionManager not deployed, skipping verification\n");
            verificationResults.NonfungiblePositionManager = { status: "skipped", address: null };
        }
        
        // 15. AlgebraInterfaceMulticall
        // No constructor parameters
        if (deployments.AlgebraInterfaceMulticall) {
            await verifyContract(
                "AlgebraInterfaceMulticall", 
                deployments.AlgebraInterfaceMulticall,
                [],
                "@cryptoalgebra/integral-periphery/contracts/lens/AlgebraInterfaceMulticall.sol:AlgebraInterfaceMulticall"
            );
        } else {
            console.log("⚠️  AlgebraInterfaceMulticall not deployed, skipping verification\n");
            verificationResults.AlgebraInterfaceMulticall = { status: "skipped", address: null };
        }
        
        // 16. AlgebraEternalFarming
        // Constructor: (address _poolDeployer, address _nonfungiblePositionManager)
        if (deployments.AlgebraEternalFarming) {
            await verifyContract(
                "AlgebraEternalFarming",
                deployments.AlgebraEternalFarming,
                [deployments.AlgebraPoolDeployer, deployments.NonfungiblePositionManager],
                "@cryptoalgebra/integral-farming/contracts/farmings/AlgebraEternalFarming.sol:AlgebraEternalFarming"
            );
        } else {
            console.log("⚠️  AlgebraEternalFarming not deployed, skipping verification\n");
            verificationResults.AlgebraEternalFarming = { status: "skipped", address: null };
        }
        
        // 17. FarmingCenter
        // Constructor: (address _eternalFarming, address _nonfungiblePositionManager)
        if (deployments.FarmingCenter) {
            await verifyContract(
                "FarmingCenter",
                deployments.FarmingCenter,
                [deployments.AlgebraEternalFarming, deployments.NonfungiblePositionManager],
                "@cryptoalgebra/integral-farming/contracts/FarmingCenter.sol:FarmingCenter"
            );
        } else {
            console.log("⚠️  FarmingCenter not deployed, skipping verification\n");
            verificationResults.FarmingCenter = { status: "skipped", address: null };
        }
        
        // Save verification results
        const verificationFile = path.join(__dirname, '../deployments', network, 'algebra-v4-verification.json');
        fs.writeFileSync(
            verificationFile,
            JSON.stringify({
                network,
                chainId: deploymentData.chainId,
                verificationDate: new Date().toISOString(),
                results: verificationResults
            }, null, 2)
        );
        
        // Print summary
        console.log("=".repeat(60));
        console.log("Verification Summary:");
        console.log("=".repeat(60));
        
        const verified = Object.values(verificationResults).filter(r => r.status === "verified" || r.status === "already_verified").length;
        const failed = Object.values(verificationResults).filter(r => r.status === "failed").length;
        const skipped = Object.values(verificationResults).filter(r => r.status === "skipped").length;
        const manual = Object.values(verificationResults).filter(r => r.status === "requires_manual_verification").length;
        
        console.log(`✅ Verified/Already Verified: ${verified}`);
        console.log(`⚠️  Requires Manual Verification: ${manual}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏭️  Skipped: ${skipped}`);
        console.log(`📊 Total: ${Object.keys(verificationResults).length}`);
        console.log("=".repeat(60));
        console.log(`\nVerification results saved to: ${verificationFile}`);
        
        if (manual > 0) {
            console.log("\n📝 Note: Some contracts require manual verification.");
            console.log("   These contracts were deployed using pre-compiled artifacts from");
            console.log("   @cryptoalgebra npm packages. Hardhat verify compiles them locally");
            console.log("   with your Hardhat config settings, causing bytecode mismatch.\n");
            console.log("   To verify manually:");
            console.log("   1. Get source code from: node_modules/@cryptoalgebra/integral-periphery/contracts/");
            console.log("   2. Use the exact compiler settings from the npm package");
            console.log("   3. Or verify directly on the explorer with:");
            console.log("      - Contract address");
            console.log("      - Constructor arguments (shown above)");
            console.log("      - Source code from the npm package");
        }
        
        if (failed > 0) {
            console.log("\n⚠️  Some contracts failed verification. Check the errors above.");
            console.log("   You may need to verify them manually on the explorer.");
        }
        
        // Print explorer links
        console.log("\n" + "=".repeat(60));
        console.log("Explorer Links:");
        console.log("=".repeat(60));
        Object.entries(deployments).forEach(([name, address]) => {
            const result = verificationResults[name];
            const status = result?.status === "verified" || result?.status === "already_verified" ? "✅" : 
                          result?.status === "requires_manual_verification" ? "📝" : "❌";
            console.log(`${status} ${name}: https://shannon-explorer.somnia.network/address/${address}`);
        });
        console.log("=".repeat(60));
        
    } catch (error) {
        console.error("Verification process failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

