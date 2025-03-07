const { run } = require("hardhat");

async function verifyContract(deployedAddress, _unlockTime) {
    console.log("Verifying Lock contract...");

    try {
        await run("verify:verify", {
            address: deployedAddress,
            constructorArguments: [_unlockTime],
        });

        console.log("Verification successful");
    } catch (error) {
        console.error("Verification failed:", error);
    }
}

// Example usage:
// Suppose your Lock contract was deployed to 0x123...abc address
// and the unlock time was set to 1718926200 (timestamp)
verifyContract("0x123...abc", 1718926200)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
