import { ethers } from "hardhat";

async function main() {
  const factoryAddress =
    process.env.FACTORY_ADDRESS ||
    "0xEA2530C202BcDc14bF57277137A3802e19705D7e";
  const [signer] = await ethers.getSigners();

  console.log(`Setting creation fee on: ${factoryAddress}`);
  console.log(`Signer: ${signer.address}`);

  const factory = await ethers.getContractAt(
    "MemeFactory",
    factoryAddress,
    signer
  );

  const fee = ethers.parseEther("0.01"); // 0.01 MON to launch a token
  const tx = await factory.setCreationFee(fee);
  console.log(`Tx sent: ${tx.hash}`);
  await tx.wait();

  const newFee = await factory.creationFee();
  console.log(
    `✓ Creation fee set to ${ethers.formatEther(newFee)} MON`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
