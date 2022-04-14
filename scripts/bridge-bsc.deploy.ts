import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

const { VALIDATOR_ADDRESS, TOKEN_ADDRESS_BSC } = process.env;
const CHAIN_ID_TO = 4; // rinkeby

async function main() {
  const validator = VALIDATOR_ADDRESS as string;
  const token = TOKEN_ADDRESS_BSC as string;
  const bridgeContractFactory = await ethers.getContractFactory("Bridge");
  const bridgeContract = await bridgeContractFactory.deploy(validator, token, CHAIN_ID_TO);

  await bridgeContract.deployed();

  console.log("BSC bridge contract deployed to:", bridgeContract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
