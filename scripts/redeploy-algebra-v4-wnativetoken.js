const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Redeployment script for Algebra V4 contracts that use WNativeToken
 * 
 * This script redeploys only the contracts that depend on WNativeToken address
 * with the correct WSTT testnet address: 0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9
 * 
 * Contracts that need redeployment:
 * 1. Quoter
 * 2. QuoterV2
 * 3. SwapRouter
 * 4. NonfungibleTokenPositionDescriptor
 * 5. NonfungiblePositionManager
 * 
 * Note: Other contracts don't use WNativeToken, so they can be reused.
 */

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const network = hre.network.name;
    
    console.log("=".repeat(60));
    console.log("Redeploying Algebra V4 Contracts with Correct WSTT Address");
    console.log("=".repeat(60));
    console.log("Network:", network);
    console.log("Deployer address:", deployer.address);
    
    const deployerBalance = await deployer.provider.getBalance(deployer.address);
    const balanceEth = hre.ethers.utils.formatEther(deployerBalance.toString());
    console.log("Deployer balance:", balanceEth, "ETH/STT");
    console.log("");
    
    // Load existing deployment
    const deploymentFile = path.join(__dirname, '../deployments', network, 'algebra-v4.json');
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ Deployment file not found:", deploymentFile);
        console.error("   Please run the full deployment script first.");
        process.exit(1);
    }
    
    const existingDeployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    const deployments = { ...existingDeployment.deployments }; // Copy existing deployments
    
    // Correct WSTT address for Somnia Testnet
    const correctWSTTAddress = '0xDa928F6A86497b3d3571fC4c2bAD04448Cc756A9';
    const wrongWSTTAddress = '0x046EDe9564A72571df6F5e44d0405360c0f4dCab';
    
    console.log("Correct WSTT Testnet Address:", correctWSTTAddress);
    console.log("Wrong Address Used:", wrongWSTTAddress);
    console.log("");
    
    // Check if wrong address was used
    if (existingDeployment.WNativeToken === wrongWSTTAddress) {
        console.log("⚠️  CONFIRMED: Wrong WNativeToken address was used in previous deployment!");
        console.log("   Redeploying affected contracts...\n");
    } else {
        console.log("ℹ️  WNativeToken address appears correct in deployment file.");
        console.log("   Current:", existingDeployment.WNativeToken);
        console.log("   Expected:", correctWSTTAddress);
        console.log("");
    }
    
    // Helper function to get contract factory from npm package artifacts
    async function getContractFactoryFromPackage(packageName, contractPath, contractName) {
        try {
            const possiblePaths = [
                `${packageName}/artifacts/contracts/${contractPath}/${contractName}.sol/${contractName}.json`,
                `${packageName}/artifacts/contracts/${contractPath}.sol/${contractName}.json`,
                `${packageName}/artifacts/${contractPath}/${contractName}.sol/${contractName}.json`,
                `${packageName}/artifacts/contracts/${contractName}.sol/${contractName}.json`,
            ];
            
            let artifact;
            for (const path of possiblePaths) {
                try {
                    artifact = require(path);
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (artifact && artifact.abi && artifact.bytecode) {
                return await hre.ethers.getContractFactory(artifact.abi, artifact.bytecode);
            }
            throw new Error(`Artifact not found for ${contractName}`);
        } catch (e) {
            console.log(`  Trying fallback for ${contractName}...`);
            return await hre.ethers.getContractFactory(contractName);
        }
    }

    // Helper function to link libraries in bytecode
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
        const factoryAddress = deployments.AlgebraFactory;
        const poolDeployerAddress = deployments.AlgebraPoolDeployer;
        const nftDescriptorAddress = deployments.NFTDescriptor;
        
        console.log("Using existing deployments:");
        console.log("  AlgebraFactory:", factoryAddress);
        console.log("  AlgebraPoolDeployer:", poolDeployerAddress);
        console.log("  NFTDescriptor:", nftDescriptorAddress);
        console.log("");
        
        // Step 1: Redeploy Quoter
        console.log("Step 1: Redeploying Quoter with correct WSTT address...");
        try {
            const Quoter = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "lens/Quoter",
                "Quoter"
            );
            const quoter = await Quoter.deploy(factoryAddress, correctWSTTAddress, poolDeployerAddress);
            await quoter.deployed();
            deployments.Quoter = quoter.address;
            console.log("✓ Quoter redeployed to:", quoter.address);
        } catch (error) {
            console.log("⚠ Quoter redeployment failed:", error.message);
        }
        console.log("");
        
        // Step 2: Redeploy QuoterV2
        console.log("Step 2: Redeploying QuoterV2 with correct WSTT address...");
        try {
            const QuoterV2 = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "lens/QuoterV2",
                "QuoterV2"
            );
            const quoterV2 = await QuoterV2.deploy(factoryAddress, correctWSTTAddress, poolDeployerAddress);
            await quoterV2.deployed();
            deployments.QuoterV2 = quoterV2.address;
            console.log("✓ QuoterV2 redeployed to:", quoterV2.address);
        } catch (error) {
            console.log("⚠ QuoterV2 redeployment failed:", error.message);
        }
        console.log("");
        
        // Step 3: Redeploy SwapRouter
        console.log("Step 3: Redeploying SwapRouter with correct WSTT address...");
        try {
            const SwapRouter = await getContractFactoryFromPackage(
                "@cryptoalgebra/integral-periphery",
                "SwapRouter",
                "SwapRouter"
            );
            const swapRouter = await SwapRouter.deploy(factoryAddress, correctWSTTAddress, poolDeployerAddress);
            await swapRouter.deployed();
            deployments.SwapRouter = swapRouter.address;
            console.log("✓ SwapRouter redeployed to:", swapRouter.address);
        } catch (error) {
            console.log("⚠ SwapRouter redeployment failed:", error.message);
        }
        console.log("");
        
        // Step 4: Redeploy NonfungibleTokenPositionDescriptor
        console.log("Step 4: Redeploying NonfungibleTokenPositionDescriptor with correct WSTT address...");
        let nftPositionDescriptorAddress;
        try {
            const nativeCurrencySymbol = network.includes('testnet') ? 'STT' : 'SOMI';
            if (!nftDescriptorAddress) {
                throw new Error("NFTDescriptor not found - required for NonfungibleTokenPositionDescriptor");
            }
            const artifact = require("@cryptoalgebra/integral-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json");
            
            // Link the NFTDescriptor library
            let linkedBytecode = artifact.bytecode;
            if (artifact.linkReferences && Object.keys(artifact.linkReferences).length > 0) {
                const linkRefKey = Object.keys(artifact.linkReferences).find(key => 
                    artifact.linkReferences[key].NFTDescriptor
                );
                if (linkRefKey && artifact.linkReferences[linkRefKey].NFTDescriptor) {
                    const linkRef = {
                        [linkRefKey]: {
                            NFTDescriptor: artifact.linkReferences[linkRefKey].NFTDescriptor.map(ref => ({
                                start: ref.start,
                                length: ref.length || 20
                            }))
                        }
                    };
                    linkedBytecode = linkLibraries(artifact.bytecode, linkRef, {
                        NFTDescriptor: nftDescriptorAddress
                    });
                }
            }
            
            const NonfungibleTokenPositionDescriptor = await hre.ethers.getContractFactory(
                artifact.abi,
                linkedBytecode
            );
            const nftPositionDescriptor = await NonfungibleTokenPositionDescriptor.deploy(
                correctWSTTAddress,
                nativeCurrencySymbol,
                []
            );
            await nftPositionDescriptor.deployed();
            nftPositionDescriptorAddress = nftPositionDescriptor.address;
            deployments.NonfungibleTokenPositionDescriptor = nftPositionDescriptorAddress;
            console.log("✓ NonfungibleTokenPositionDescriptor redeployed to:", nftPositionDescriptorAddress);
        } catch (error) {
            console.log("⚠ NonfungibleTokenPositionDescriptor redeployment failed:", error.message);
        }
        console.log("");
        
        // Step 5: Redeploy NonfungiblePositionManager
        console.log("Step 5: Redeploying NonfungiblePositionManager with correct WSTT address...");
        try {
            const descriptorAddress = deployments.Proxy || nftPositionDescriptorAddress || deployments.NonfungibleTokenPositionDescriptor;
            if (descriptorAddress) {
                const NonfungiblePositionManager = await getContractFactoryFromPackage(
                    "@cryptoalgebra/integral-periphery",
                    "NonfungiblePositionManager",
                    "NonfungiblePositionManager"
                );
                const nftPositionManager = await NonfungiblePositionManager.deploy(
                    factoryAddress,
                    correctWSTTAddress,
                    descriptorAddress,
                    poolDeployerAddress
                );
                await nftPositionManager.deployed();
                deployments.NonfungiblePositionManager = nftPositionManager.address;
                console.log("✓ NonfungiblePositionManager redeployed to:", nftPositionManager.address);
            } else {
                console.log("⚠ Skipping NonfungiblePositionManager - Descriptor not available");
            }
        } catch (error) {
            console.log("⚠ NonfungiblePositionManager redeployment failed:", error.message);
        }
        console.log("");
        
        // Step 6: Redeploy AlgebraEternalFarming (depends on NonfungiblePositionManager)
        console.log("Step 6: Redeploying AlgebraEternalFarming with new NonfungiblePositionManager...");
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
                console.log("✓ AlgebraEternalFarming redeployed to:", eternalFarming.address);
            } else {
                console.log("⚠ Skipping AlgebraEternalFarming - NonfungiblePositionManager not available");
            }
        } catch (error) {
            console.log("⚠ AlgebraEternalFarming redeployment failed:", error.message);
        }
        console.log("");
        
        // Step 7: Redeploy FarmingCenter (depends on AlgebraEternalFarming and NonfungiblePositionManager)
        console.log("Step 7: Redeploying FarmingCenter with new contracts...");
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
                console.log("✓ FarmingCenter redeployed to:", farmingCenter.address);
                
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
            } else {
                console.log("⚠ Skipping FarmingCenter - Required contracts not available");
            }
        } catch (error) {
            console.log("⚠ FarmingCenter redeployment failed:", error.message);
        }
        console.log("");
        
        // Update deployment file
        fs.writeFileSync(
            deploymentFile,
            JSON.stringify({
                ...existingDeployment,
                WNativeToken: correctWSTTAddress,
                deployments,
                redeploymentTimestamp: new Date().toISOString(),
                redeploymentNote: "Redeployed contracts that use WNativeToken with correct WSTT testnet address"
            }, null, 2)
        );
        
        console.log("=".repeat(60));
        console.log("Redeployment Summary:");
        console.log("=".repeat(60));
        console.log("✅ Contracts Redeployed:");
        if (deployments.Quoter && deployments.Quoter !== existingDeployment.deployments.Quoter) {
            console.log(`   Quoter: ${deployments.Quoter} (was: ${existingDeployment.deployments.Quoter})`);
        }
        if (deployments.QuoterV2 && deployments.QuoterV2 !== existingDeployment.deployments.QuoterV2) {
            console.log(`   QuoterV2: ${deployments.QuoterV2} (was: ${existingDeployment.deployments.QuoterV2})`);
        }
        if (deployments.SwapRouter && deployments.SwapRouter !== existingDeployment.deployments.SwapRouter) {
            console.log(`   SwapRouter: ${deployments.SwapRouter} (was: ${existingDeployment.deployments.SwapRouter})`);
        }
        if (deployments.NonfungibleTokenPositionDescriptor && deployments.NonfungibleTokenPositionDescriptor !== existingDeployment.deployments.NonfungibleTokenPositionDescriptor) {
            console.log(`   NonfungibleTokenPositionDescriptor: ${deployments.NonfungibleTokenPositionDescriptor} (was: ${existingDeployment.deployments.NonfungibleTokenPositionDescriptor})`);
        }
        if (deployments.NonfungiblePositionManager && deployments.NonfungiblePositionManager !== existingDeployment.deployments.NonfungiblePositionManager) {
            console.log(`   NonfungiblePositionManager: ${deployments.NonfungiblePositionManager} (was: ${existingDeployment.deployments.NonfungiblePositionManager})`);
        }
        console.log("");
        console.log("✅ Contracts Kept (don't use WNativeToken):");
        console.log(`   AlgebraPoolDeployer: ${deployments.AlgebraPoolDeployer}`);
        console.log(`   AlgebraFactory: ${deployments.AlgebraFactory}`);
        console.log(`   AlgebraCommunityVault: ${deployments.AlgebraCommunityVault}`);
        console.log(`   AlgebraVaultFactoryStub: ${deployments.AlgebraVaultFactoryStub}`);
        console.log(`   EntryPoint: ${deployments.EntryPoint}`);
        console.log(`   PluginFactory: ${deployments.PluginFactory}`);
        console.log(`   TickLens: ${deployments.TickLens}`);
        console.log(`   NFTDescriptor: ${deployments.NFTDescriptor}`);
        console.log(`   AlgebraInterfaceMulticall: ${deployments.AlgebraInterfaceMulticall}`);
        console.log("=".repeat(60));
        console.log(`\nDeployment info updated: ${deploymentFile}`);
        
    } catch (error) {
        console.error("Redeployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

