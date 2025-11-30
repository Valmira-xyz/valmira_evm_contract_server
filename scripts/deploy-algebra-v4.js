const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deployment script for Algebra V4 DEX contracts on Somnia Mainnet V4
 * 
 * Deployment order:
 * 1. AlgebraFactory (with temporary poolDeployer address)
 * 2. AlgebraPoolDeployer (with Factory address)
 * 3. AlgebraFactory (redeployed with correct poolDeployer address)
 * 4. AlgebraCommunityVault
 * 5. AlgebraVaultFactoryStub
 * 6. EntryPoint (AlgebraCustomPoolEntryPoint)
 * 7. PluginFactory
 * 8. TickLens
 * 9. Quoter
 * 10. QuoterV2
 * 11. SwapRouter
 * 12. NFTDescriptor
 * 13. NonfungibleTokenPositionDescriptor
 * 14. Proxy (TransparentUpgradeableProxy)
 * 15. NonfungiblePositionManager
 * 16. AlgebraInterfaceMulticall
 * 17. AlgebraEternalFarming
 * 18. FarmingCenter
 */

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    
    console.log("Deploying Algebra V4 contracts...");
    console.log("Network:", network);
    console.log("Deployer address:", deployer.address);
    
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    const balanceEth = hre.ethers.utils.formatEther(deployerBalance.toString());
    console.log("Deployer balance:", balanceEth, "ETH/STT");
    
    // Check if balance is sufficient (rough estimate: need at least 0.5 STT for full deployment)
    if (parseFloat(balanceEth) < 0.5) {
        console.log("⚠ Warning: Low balance! You may need more STT for deployment.");
        console.log("  Get STT from: https://faucet.somnia.network/ (if available)");
    }
    console.log("");

    // Get WNativeToken address (WSTT for testnet, WSOMI for mainnet)
    // Can be overridden via environment variable
    // IMPORTANT: Correct WSTT address for Somnia Testnet: 0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9
    let WNativeTokenAddress = process.env.WNATIVE_TOKEN || 
        (network?.toLocaleLowerCase().includes('testnet') ? '0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9' : '0x046EDe9564A72571df6F5e44d0405360c0f4dCab');
    
    // Validate WNativeToken address for testnet
    if (network?.toLocaleLowerCase().includes('testnet') && WNativeTokenAddress === '0x046EDe9564A72571df6F5e44d0405360c0f4dCab') {
        console.log("⚠️  WARNING: Using mainnet WNativeToken address on testnet!");
        console.log("   This will cause issues. Using correct testnet address instead.");
        const correctTestnetAddress = '0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9';
        console.log(`   Overriding to correct testnet address: ${correctTestnetAddress}`);
        WNativeTokenAddress = correctTestnetAddress;
    }
    
    console.log("Using WNativeToken address:", WNativeTokenAddress);
    console.log("");

    const deployments = {};

    // Helper function to get contract factory from npm package artifacts
    async function getContractFactoryFromPackage(packageName, contractPath, contractName) {
        try {
            // Try different possible artifact paths
            const possiblePaths = [
                `${packageName}/artifacts/contracts/${contractPath}/${contractName}.sol/${contractName}.json`,
                `${packageName}/artifacts/contracts/${contractPath}.sol/${contractName}.json`,
                `${packageName}/artifacts/${contractPath}/${contractName}.sol/${contractName}.json`,
                `${packageName}/artifacts/contracts/${contractName}.sol/${contractName}.json`,
            ];
            
            let artifact;
            let foundPath = null;
            for (const path of possiblePaths) {
                try {
                    artifact = require(path);
                    foundPath = path;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (artifact && artifact.abi && artifact.bytecode) {
                return await hre.ethers.getContractFactory(artifact.abi, artifact.bytecode);
            }
            throw new Error(`Artifact not found for ${contractName}. Tried: ${possiblePaths.join(', ')}`);
        } catch (e) {
            // Fallback to regular contract factory
            console.log(`  Trying fallback for ${contractName}...`);
            return await hre.ethers.getContractFactory(contractName);
        }
    }

    // Helper function to link libraries in bytecode (from Algebra test fixtures)
    function linkLibraries(bytecode, linkReferences, libraries) {
        let linkedBytecode = bytecode;
        Object.keys(linkReferences).forEach((fileName) => {
            Object.keys(linkReferences[fileName]).forEach((contractName) => {
                if (!libraries.hasOwnProperty(contractName)) {
                    throw new Error(`Missing link library name ${contractName}`);
                }
                const address = hre.ethers.utils.getAddress(libraries[contractName]).toLowerCase().slice(2);
                linkReferences[fileName][contractName].forEach(({ start: byteStart, length: byteLength }) => {
                    const start = 2 + byteStart * 2;
                    const length = byteLength * 2;
                    linkedBytecode = linkedBytecode
                        .slice(0, start)
                        .concat(address)
                        .concat(linkedBytecode.slice(start + length, linkedBytecode.length));
                });
            });
        });
        return linkedBytecode;
    }

    try {
        // Note: There's a circular dependency:
        // - AlgebraPoolDeployer needs factory address in constructor
        // - AlgebraFactory needs poolDeployer address in constructor
        // Solution: Use CREATE2 to compute deterministic addresses, then deploy both correctly
        
        // Step 1: Deploy AlgebraFactory FIRST with a temporary poolDeployer address
        // We'll compute the poolDeployer address deterministically using CREATE2
        console.log("Step 1: Deploying AlgebraFactory...");
        console.log("Note: Using temporary poolDeployer address (will be corrected in Step 2)");
        
        const AlgebraFactory = await hre.ethers.getContractFactory("AlgebraFactory");
        // Use deployer address as temporary poolDeployer - will be corrected
        const tempPoolDeployerAddress = deployer.address;
        const factory = await AlgebraFactory.deploy(tempPoolDeployerAddress);
        await factory.deployed();
        const factoryAddress = factory.address;
        deployments.AlgebraFactory = factoryAddress;
        console.log("✓ AlgebraFactory deployed to:", factoryAddress);
        console.log("");

        // Step 2: Deploy AlgebraPoolDeployer with the correct factory address
        console.log("Step 2: Deploying AlgebraPoolDeployer with Factory address...");
        const AlgebraPoolDeployer = await hre.ethers.getContractFactory("AlgebraPoolDeployer");
        const poolDeployer = await AlgebraPoolDeployer.deploy(factoryAddress);
        await poolDeployer.deployed();
        const poolDeployerAddress = poolDeployer.address;
        deployments.AlgebraPoolDeployer = poolDeployerAddress;
        console.log("✓ AlgebraPoolDeployer deployed to:", poolDeployerAddress);
        console.log("");
        
        // Note: AlgebraFactory was deployed with temporary poolDeployer address
        // Since poolDeployer is immutable in Factory, we need to redeploy Factory
        console.log("⚠ Important: AlgebraFactory was deployed with temporary poolDeployer address");
        console.log("  Redeploying AlgebraFactory with correct poolDeployer address...");
        
        // Step 3: Redeploy AlgebraFactory with correct poolDeployer address
        const factory2 = await AlgebraFactory.deploy(poolDeployerAddress);
        await factory2.deployed();
        const factoryAddress2 = factory2.address;
        deployments.AlgebraFactory = factoryAddress2;
        console.log("✓ AlgebraFactory redeployed to:", factoryAddress2);
        console.log("  Old Factory address (can be ignored):", factoryAddress);
        console.log("");
        
        // Use the final factory address for all subsequent deployments
        const finalFactoryAddress = factoryAddress2;

        // Step 4: Deploy AlgebraCommunityVault
        // Constructor requires: (address _factory, address _algebraFeeManager)
        console.log("Step 4: Deploying AlgebraCommunityVault...");
        try {
            const AlgebraCommunityVault = await hre.ethers.getContractFactory("AlgebraCommunityVault");
            // Use deployer address as algebraFeeManager (can be changed later via governance)
            const algebraFeeManager = process.env.ALGEBRA_FEE_MANAGER || deployer.address;
            const vault = await AlgebraCommunityVault.deploy(finalFactoryAddress, algebraFeeManager);
            await vault.deployed();
            const vaultAddress = vault.address;
            deployments.AlgebraCommunityVault = vaultAddress;
            console.log("✓ AlgebraCommunityVault deployed to:", vaultAddress);
            console.log("  Algebra Fee Manager:", algebraFeeManager);
        } catch (error) {
            console.log("⚠ AlgebraCommunityVault deployment failed:", error.message);
            throw error; // Re-throw to stop deployment if core contract fails
        }
        console.log("");

        // Step 5: Deploy AlgebraVaultFactoryStub
        // Constructor requires: (address _algebraCommunityVault)
        console.log("Step 4: Deploying AlgebraVaultFactoryStub...");
        try {
            const AlgebraVaultFactoryStub = await hre.ethers.getContractFactory("AlgebraVaultFactoryStub");
            const vaultFactoryStub = await AlgebraVaultFactoryStub.deploy(deployments.AlgebraCommunityVault);
            await vaultFactoryStub.deployed();
            const vaultFactoryStubAddress = vaultFactoryStub.address;
            deployments.AlgebraVaultFactoryStub = vaultFactoryStubAddress;
            console.log("✓ AlgebraVaultFactoryStub deployed to:", vaultFactoryStubAddress);
        } catch (error) {
            console.log("⚠ AlgebraVaultFactoryStub deployment failed:", error.message);
            throw error; // Re-throw to stop deployment if core contract fails
        }
        console.log("");

        // Step 6: Deploy EntryPoint (AlgebraCustomPoolEntryPoint)
        // Constructor requires: (address _factory)
        console.log("Step 6: Deploying EntryPoint (AlgebraCustomPoolEntryPoint)...");
        try {
            const EntryPoint = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "AlgebraCustomPoolEntryPoint",
                "AlgebraCustomPoolEntryPoint"
            );
            const entryPoint = await EntryPoint.deploy(finalFactoryAddress);
            await entryPoint.deployed();
            const entryPointAddress = entryPoint.address;
            deployments.EntryPoint = entryPointAddress;
            console.log("✓ EntryPoint deployed to:", entryPointAddress);

            // Grant necessary roles to EntryPoint
            const CUSTOM_POOL_DEPLOYER_ROLE = await factory.CUSTOM_POOL_DEPLOYER();
            const POOLS_ADMINISTRATOR_ROLE = await factory.POOLS_ADMINISTRATOR_ROLE();
            await (await factory.grantRole(CUSTOM_POOL_DEPLOYER_ROLE, entryPointAddress)).wait();
            await (await factory.grantRole(POOLS_ADMINISTRATOR_ROLE, entryPointAddress)).wait();
            console.log("✓ Granted roles to EntryPoint");
        } catch (error) {
            console.log("⚠ EntryPoint deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 7: Deploy PluginFactory
        // Constructor requires: (address _entryPoint)
        console.log("Step 6: Deploying PluginFactory...");
        try {
            if (deployments.EntryPoint) {
                // Try BasePluginV1Factory first, then BasePluginV2Factory
                let PluginFactory;
                try {
                    PluginFactory = await getContractFactoryFromPackage(
                        "@cryptoalgebra/integral-base-plugin",
                        "BasePluginV1Factory",
                        "BasePluginV1Factory"
                    );
                } catch (e) {
                    try {
                        PluginFactory = await getContractFactoryFromPackage(
                            "@cryptoalgebra/integral-base-plugin",
                            "BasePluginV2Factory",
                            "BasePluginV2Factory"
                        );
                    } catch (e2) {
                        PluginFactory = await hre.ethers.getContractFactory("PluginFactory");
                    }
                }
                const pluginFactory = await PluginFactory.deploy(deployments.EntryPoint);
                await pluginFactory.deployed();
                deployments.PluginFactory = pluginFactory.address;
                console.log("✓ PluginFactory deployed to:", pluginFactory.address);
            } else {
                console.log("⚠ Skipping PluginFactory - EntryPoint not deployed");
            }
        } catch (error) {
            console.log("⚠ PluginFactory deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 8: Deploy TickLens
        // No constructor parameters
        console.log("Step 7: Deploying TickLens...");
        try {
            const TickLens = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "lens/TickLens",
                "TickLens"
            );
            const tickLens = await TickLens.deploy();
            await tickLens.deployed();
            deployments.TickLens = tickLens.address;
            console.log("✓ TickLens deployed to:", tickLens.address);
        } catch (error) {
            console.log("⚠ TickLens deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 9: Deploy Quoter
        // Constructor requires: (address _factory, address _WNativeToken, address _poolDeployer)
        console.log("Step 9: Deploying Quoter...");
        try {
            const Quoter = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "lens/Quoter",
                "Quoter"
            );
            const quoter = await Quoter.deploy(finalFactoryAddress, WNativeTokenAddress, poolDeployerAddress);
            await quoter.deployed();
            deployments.Quoter = quoter.address;
            console.log("✓ Quoter deployed to:", quoter.address);
        } catch (error) {
            console.log("⚠ Quoter deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 10: Deploy QuoterV2
        // Constructor requires: (address _factory, address _WNativeToken, address _poolDeployer)
        console.log("Step 10: Deploying QuoterV2...");
        try {
            const QuoterV2 = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "lens/QuoterV2",
                "QuoterV2"
            );
            const quoterV2 = await QuoterV2.deploy(finalFactoryAddress, WNativeTokenAddress, poolDeployerAddress);
            await quoterV2.deployed();
            deployments.QuoterV2 = quoterV2.address;
            console.log("✓ QuoterV2 deployed to:", quoterV2.address);
        } catch (error) {
            console.log("⚠ QuoterV2 deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 11: Deploy SwapRouter
        // Constructor requires: (address _factory, address _WNativeToken, address _poolDeployer)
        console.log("Step 11: Deploying SwapRouter...");
        try {
            const SwapRouter = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "SwapRouter",
                "SwapRouter"
            );
            const swapRouter = await SwapRouter.deploy(finalFactoryAddress, WNativeTokenAddress, poolDeployerAddress);
            await swapRouter.deployed();
            deployments.SwapRouter = swapRouter.address;
            console.log("✓ SwapRouter deployed to:", swapRouter.address);
        } catch (error) {
            console.log("⚠ SwapRouter deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 12: Deploy NFTDescriptor
        // No constructor parameters
        console.log("Step 11: Deploying NFTDescriptor...");
        let nftDescriptorAddress;
        try {
            const NFTDescriptor = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "libraries/NFTDescriptor",
                "NFTDescriptor"
            );
            const nftDescriptor = await NFTDescriptor.deploy();
            await nftDescriptor.deployed();
            nftDescriptorAddress = nftDescriptor.address;
            deployments.NFTDescriptor = nftDescriptorAddress;
            console.log("✓ NFTDescriptor deployed to:", nftDescriptorAddress);
        } catch (error) {
            console.log("⚠ NFTDescriptor deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 13: Deploy NonfungibleTokenPositionDescriptor
        // Constructor requires: (address _WNativeToken, string memory _nativeCurrencySymbol, bytes32[] memory _nativeCurrencyLabel)
        console.log("Step 12: Deploying NonfungibleTokenPositionDescriptor...");
        let nftPositionDescriptorAddress;
        try {
            const nativeCurrencySymbol = network.includes('testnet') ? 'STT' : 'SOMI';
            if (!nftDescriptorAddress) {
                throw new Error("NFTDescriptor not deployed - required for NonfungibleTokenPositionDescriptor");
            }
            const artifact = require("@cryptoalgebra/integral-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json");
            
            // Link the NFTDescriptor library
            let linkedBytecode = artifact.bytecode;
            if (artifact.linkReferences && Object.keys(artifact.linkReferences).length > 0) {
                // Find the NFTDescriptor link reference
                const linkRefKey = Object.keys(artifact.linkReferences).find(key => 
                    artifact.linkReferences[key].NFTDescriptor
                );
                if (linkRefKey && artifact.linkReferences[linkRefKey].NFTDescriptor) {
                    const linkRef = {
                        [linkRefKey]: {
                            NFTDescriptor: artifact.linkReferences[linkRefKey].NFTDescriptor.map(ref => ({
                                start: ref.start,
                                length: ref.length || 20 // Default to 20 bytes for address
                            }))
                        }
                    };
                    linkedBytecode = linkLibraries(artifact.bytecode, linkRef, {
                        NFTDescriptor: nftDescriptorAddress
                    });
                } else {
                    // Fallback: try to replace the placeholder hash manually
                    const placeholder = "__$cea9be979eee3d87fb124d6cbb244bb0b5$__";
                    if (artifact.bytecode.includes(placeholder)) {
                        const addressHex = hre.ethers.utils.getAddress(nftDescriptorAddress).toLowerCase().slice(2);
                        linkedBytecode = artifact.bytecode.replace(placeholder, addressHex);
                    }
                }
            }
            
            const NonfungibleTokenPositionDescriptor = await hre.ethers.getContractFactory(
                artifact.abi,
                linkedBytecode
            );
            const nftPositionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(
                WNativeTokenAddress,
                nativeCurrencySymbol,
                []
            );
            await nftPositionDescriptor.deployed();
            nftPositionDescriptorAddress = nftPositionDescriptor.address;
            deployments.NonfungibleTokenPositionDescriptor = nftPositionDescriptorAddress;
            console.log("✓ NonfungibleTokenPositionDescriptor deployed to:", nftPositionDescriptorAddress);
        } catch (error) {
            console.log("⚠ NonfungibleTokenPositionDescriptor deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 14: Deploy Proxy (TransparentUpgradeableProxy)
        // Constructor requires: (address _logic, address _admin, bytes _data)
        console.log("Step 13: Deploying Proxy (TransparentUpgradeableProxy)...");
        let proxyAddress;
        try {
            if (nftPositionDescriptorAddress) {
                const ProxyAdmin = deployer.address; // Use deployer as proxy admin
                // Try to get Proxy from OpenZeppelin contracts
                let Proxy;
                try {
                    // Try different possible names
                    Proxy = await hre.ethers.getContractFactory("@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol:TransparentUpgradeableProxy");
                } catch (e1) {
                    try {
                        Proxy = await hre.ethers.getContractFactory("TransparentUpgradeableProxy");
                    } catch (e2) {
                        // If Proxy is not available, we can skip it and use the descriptor directly
                        console.log("⚠ TransparentUpgradeableProxy not available, using NonfungibleTokenPositionDescriptor directly");
                        proxyAddress = nftPositionDescriptorAddress; // Use descriptor as proxy
                        deployments.Proxy = proxyAddress;
                        deployments.ProxyAdmin = ProxyAdmin;
                        console.log("✓ Using NonfungibleTokenPositionDescriptor as Proxy:", proxyAddress);
                        throw new Error("Proxy contract not found, using descriptor directly");
                    }
                }
                const proxy = await Proxy.deploy(nftPositionDescriptorAddress, ProxyAdmin, '0x');
                await proxy.deployed();
                proxyAddress = proxy.address;
                deployments.Proxy = proxyAddress;
                deployments.ProxyAdmin = ProxyAdmin;
                console.log("✓ Proxy deployed to:", proxyAddress);
                console.log("  Proxy Admin:", ProxyAdmin);
            } else {
                console.log("⚠ Skipping Proxy - NonfungibleTokenPositionDescriptor not deployed");
            }
        } catch (error) {
            if (!proxyAddress) {
                console.log("⚠ Proxy deployment failed:", error.message);
                console.log("  Note: Proxy is optional - NonfungiblePositionManager can use descriptor directly");
            }
        }
        console.log("");

        // Step 15: Deploy NonfungiblePositionManager
        // Constructor requires: (address _factory, address _WNativeToken, address _tokenDescriptor, address _poolDeployer)
        console.log("Step 15: Deploying NonfungiblePositionManager...");
        try {
            // Use proxy if available, otherwise use descriptor directly
            const descriptorAddress = proxyAddress || nftPositionDescriptorAddress;
            if (descriptorAddress) {
                const NonfungiblePositionManager = await getContractFactoryFromPackage(
                    "@cryptoalgebra/integral-periphery",
                    "NonfungiblePositionManager",
                    "NonfungiblePositionManager"
                );
                const nftPositionManager = await NonfungiblePositionManager.deploy(
                    finalFactoryAddress,
                    WNativeTokenAddress,
                    descriptorAddress,
                    poolDeployerAddress
                );
                await nftPositionManager.deployed();
                deployments.NonfungiblePositionManager = nftPositionManager.address;
                console.log("✓ NonfungiblePositionManager deployed to:", nftPositionManager.address);
            } else {
                console.log("⚠ Skipping NonfungiblePositionManager - Descriptor not deployed");
            }
        } catch (error) {
            console.log("⚠ NonfungiblePositionManager deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 16: Deploy AlgebraInterfaceMulticall
        // No constructor parameters (or minimal)
        console.log("Step 15: Deploying AlgebraInterfaceMulticall...");
        try {
            const AlgebraInterfaceMulticall = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "lens/AlgebraInterfaceMulticall",
                "AlgebraInterfaceMulticall"
            );
            const multicall = await AlgebraInterfaceMulticall.deploy();
            await multicall.deployed();
            deployments.AlgebraInterfaceMulticall = multicall.address;
            console.log("✓ AlgebraInterfaceMulticall deployed to:", multicall.address);
        } catch (error) {
            console.log("⚠ AlgebraInterfaceMulticall deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 17: Deploy AlgebraEternalFarming
        // Constructor requires: (address _poolDeployer, address _nonfungiblePositionManager)
        console.log("Step 16: Deploying AlgebraEternalFarming...");
        try {
            if (deployments.NonfungiblePositionManager) {
                const AlgebraEternalFarming = await getContractFactoryFromPackage(
                    "@cryptoalgebra/integral-farming",
                    "farmings/AlgebraEternalFarming",
                    "AlgebraEternalFarming"
                );
                const eternalFarming = await AlgebraEternalFarming.deploy(
                    poolDeployerAddress,
                    deployments.NonfungiblePositionManager
                );
                await eternalFarming.deployed();
                deployments.AlgebraEternalFarming = eternalFarming.address;
                console.log("✓ AlgebraEternalFarming deployed to:", eternalFarming.address);
            } else {
                console.log("⚠ Skipping AlgebraEternalFarming - NonfungiblePositionManager not deployed");
            }
        } catch (error) {
            console.log("⚠ AlgebraEternalFarming deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Step 18: Deploy FarmingCenter
        // Constructor requires: (address _eternalFarming, address _nonfungiblePositionManager)
        console.log("Step 17: Deploying FarmingCenter...");
        try {
            if (deployments.AlgebraEternalFarming && deployments.NonfungiblePositionManager) {
                const FarmingCenter = await getContractFactoryFromPackage(
                    "@cryptoalgebra/integral-farming",
                    "FarmingCenter",
                    "FarmingCenter"
                );
                const farmingCenter = await FarmingCenter.deploy(
                    deployments.AlgebraEternalFarming,
                    deployments.NonfungiblePositionManager
                );
                await farmingCenter.deployed();
                deployments.FarmingCenter = farmingCenter.address;
                console.log("✓ FarmingCenter deployed to:", farmingCenter.address);

                // Set farming center address in eternal farming
                try {
                    const eternalFarmingArtifact = require("@cryptoalgebra/integral-farming/artifacts/contracts/farmings/AlgebraEternalFarming.sol/AlgebraEternalFarming.json");
                    const eternalFarming = await hre.ethers.getContractAt(
                        eternalFarmingArtifact.abi,
                        deployments.AlgebraEternalFarming
                    );
                    await (await eternalFarming.setFarmingCenterAddress(farmingCenter.address)).wait();
                    console.log("✓ Set farming center address in AlgebraEternalFarming");
                } catch (e) {
                    console.log("⚠ Could not set farming center in AlgebraEternalFarming:", e.message);
                }

                // Set farming center in position manager if available
                if (deployments.NonfungiblePositionManager) {
                    try {
                        const nftPositionManager = await hre.ethers.getContractAt(
                            "NonfungiblePositionManager",
                            deployments.NonfungiblePositionManager
                        );
                        await (await nftPositionManager.setFarmingCenter(farmingCenter.address)).wait();
                        console.log("✓ Set farming center in NonfungiblePositionManager");
                    } catch (e) {
                        console.log("⚠ Could not set farming center in NonfungiblePositionManager:", e.message);
                    }
                }

                // Set farming address in plugin factory if available
                if (deployments.PluginFactory) {
                    try {
                        // Try BasePluginV1Factory first, then BasePluginV2Factory
                        let pluginFactory;
                        try {
                            const artifact = require("@cryptoalgebra/integral-base-plugin/artifacts/contracts/BasePluginV1Factory.sol/BasePluginV1Factory.json");
                            pluginFactory = await hre.ethers.getContractAt(artifact.abi, deployments.PluginFactory);
                        } catch (e) {
                            try {
                                const artifact = require("@cryptoalgebra/integral-base-plugin/artifacts/contracts/BasePluginV2Factory.sol/BasePluginV2Factory.json");
                                pluginFactory = await hre.ethers.getContractAt(artifact.abi, deployments.PluginFactory);
                            } catch (e2) {
                                pluginFactory = await hre.ethers.getContractAt("BasePluginV1Factory", deployments.PluginFactory);
                            }
                        }
                        await (await pluginFactory.setFarmingAddress(farmingCenter.address)).wait();
                        console.log("✓ Set farming address in PluginFactory");
                    } catch (e) {
                        console.log("⚠ Could not set farming address in PluginFactory:", e.message);
                    }
                }
            } else {
                console.log("⚠ Skipping FarmingCenter - Required contracts not deployed");
            }
        } catch (error) {
            console.log("⚠ FarmingCenter deployment failed:", error.message);
            console.log("  This contract may not be available in the codebase.");
        }
        console.log("");

        // Save deployment addresses
        const deploymentDir = path.join(__dirname, '../deployments', network);
        if (!fs.existsSync(deploymentDir)) {
            fs.mkdirSync(deploymentDir, { recursive: true });
        }
        
        const deploymentFile = path.join(deploymentDir, 'algebra-v4.json');
        fs.writeFileSync(
            deploymentFile,
            JSON.stringify({
                network,
                chainId: hre.network.config.chainId,
                deployer: deployer.address,
                WNativeToken: WNativeTokenAddress,
                deployments,
                timestamp: new Date().toISOString()
            }, null, 2)
        );
        
        console.log("=".repeat(60));
        console.log("Deployment Summary:");
        console.log("=".repeat(60));
        Object.entries(deployments).forEach(([name, address]) => {
            console.log(`${name}: ${address}`);
        });
        console.log("=".repeat(60));
        console.log(`\nDeployment info saved to: ${deploymentFile}`);

    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

