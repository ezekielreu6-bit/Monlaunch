import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("═══════════════════════════════════════════════════");
  console.log("  MemeFactory — Deployment Script");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Network  : ${network.name} (chainId: ${network.config.chainId})`);
  console.log(`Deployer : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance  : ${ethers.formatEther(balance)} MON`);
  console.log("───────────────────────────────────────────────────");

  if (balance === 0n) {
    throw new Error(
      "Deployer has 0 balance. Get testnet MON from the Monad faucet first:\n" +
        "  https://faucet.monad.xyz"
    );
  }

  // ── Deploy MemeFactory ───────────────────────────────────────────────────
  console.log("\n[1/2] Deploying MemeFactory...");
  const MemeFactory = await ethers.getContractFactory("MemeFactory");
  const factory = await MemeFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✓ MemeFactory deployed: ${factoryAddress}`);

  // ── Verify constants ─────────────────────────────────────────────────────
  console.log("\n[2/2] Reading on-chain constants...");
  const virtualReserve = await factory.VIRTUAL_MON_RESERVE();
  const graduation = await factory.GRADUATION_THRESHOLD();
  const supply = await factory.TOTAL_SUPPLY();
  const fee = await factory.TRADE_FEE_BPS();
  const creationFee = await factory.creationFee();

  console.log(`  Total supply per token : ${ethers.formatEther(supply)} tokens`);
  console.log(`  Virtual MON reserve    : ${ethers.formatEther(virtualReserve)} MON`);
  console.log(`  Graduation threshold   : ${ethers.formatEther(graduation)} MON`);
  console.log(`  Trade fee              : ${fee} bps (${Number(fee) / 100}%)`);
  console.log(`  Creation fee           : ${ethers.formatEther(creationFee)} MON`);

  // ── Save deployment info ─────────────────────────────────────────────────
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      MemeFactory: factoryAddress,
    },
    constants: {
      TOTAL_SUPPLY: supply.toString(),
      VIRTUAL_MON_RESERVE: virtualReserve.toString(),
      GRADUATION_THRESHOLD: graduation.toString(),
      TRADE_FEE_BPS: fee.toString(),
    },
  };

  const outDir = path.join(__dirname, "../deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n✓ Deployment info saved to: deployments/${network.name}.json`);

  // ── Also export ABI for the frontend ────────────────────────────────────
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const abiOutDir = path.join(__dirname, "../deployments/abi");
  fs.mkdirSync(abiOutDir, { recursive: true });

  for (const contractName of ["MemeFactory", "MemeToken"]) {
    const artifactPath = path.join(
      artifactsDir,
      `${contractName}.sol`,
      `${contractName}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      fs.writeFileSync(
        path.join(abiOutDir, `${contractName}.json`),
        JSON.stringify(artifact.abi, null, 2)
      );
      console.log(`✓ ABI exported: deployments/abi/${contractName}.json`);
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  Deployment complete!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`\nNext steps:`);
  console.log(`  1. Copy the contract address below into your .env`);
  console.log(`     NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
  console.log(`  2. View on explorer:`);
  console.log(`     https://testnet.monadexplorer.com/address/${factoryAddress}`);
  console.log(`  3. (Optional) Verify the contract:`);
  console.log(`     pnpm hardhat verify --network monadTestnet ${factoryAddress}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
