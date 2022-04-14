import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const { VALIDATOR_ADDRESS, TOKEN_ADDRESS_ETH } = process.env;

async function main() {
  const validator = VALIDATOR_ADDRESS as string;
  const token = TOKEN_ADDRESS_ETH as string;
  const bridgeContractFactory = await ethers.getContractFactory("Bridge");
  // const bridgeContract = await bridgeContractFactory.deploy(validator, token);
  //
  // await bridgeContract.deployed();
  //
  // console.log("ETH bridge contract deployed to:", bridgeContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
