import { ethers } from "hardhat";

async function main() {
  const tokenContractFactory = await ethers.getContractFactory("Token");
  const tokenContract = await tokenContractFactory.deploy("Binance-Peg Manul Token", "MNL", 0);

  await tokenContract.deployed();

  console.log("Binance-Peg Manul Token contract deployed to:", tokenContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
