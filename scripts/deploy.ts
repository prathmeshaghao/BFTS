import { ethers } from "hardhat";

async function main() {
  const Wallet = await ethers.getContractFactory("Wallet");
  const wallet = await Wallet.deploy();
  const [deployer] = await ethers.getSigners();
  await wallet.waitForDeployment();
  console.log("Deploying with:", deployer.address);
  console.log("Deployed to:", await wallet.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
