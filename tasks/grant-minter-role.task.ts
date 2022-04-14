import { task } from "hardhat/config";

task("grantMinterRole", "Grants minter role")
  .addParam("tokenaddr", "The address of token contract")
  .addParam("minteraddr", "The address of minter account")
  .setAction(async ({ tokenaddr: tokenAddress, minteraddr: minterAddress }, hre) => {
    const token = await hre.ethers.getContractAt("Token", tokenAddress);
    const role = hre.ethers.utils.id("MINTER_ROLE");
    // const role = hre.ethers.utils.id("BURNER_ROLE");

    await token.grantRole(role, minterAddress);

    console.log(`Minter role ${role} from token contract ${tokenAddress} is granted to ${minterAddress}`);
  });
