import { task } from "hardhat/config";

task("redeem", "Mints tokens to recipient")
  .addParam("bridgeaddr", "The address of bridge contract")
  .addParam("fromaddr", "The address of tokens sender on primary chain")
  .addParam("toaddr", "The address of tokens recipient on current chain")
  .addParam("amount", "The amount of tokens to redeem")
  .addParam("nonce", "The operation number")
  .addParam("fromchainid", "Primary chain id")
  .addParam("tochainid", "Current chain id")
  .addParam("signature", "Signed message")
  .setAction(async ({
    bridgeaddr: bridgeAddress,
    fromaddr: fromAddress,
    toaddr: toAddress,
    amount,
    nonce,
    fromchainid: fromChainId,
    tochainid: toChainId,
    signature,
  }, hre) => {
    const value = hre.ethers.utils.parseUnits(amount);
    const bridge = await hre.ethers.getContractAt("Bridge", bridgeAddress);

    await bridge.redeem(fromAddress, toAddress, value, nonce, fromChainId, toChainId, signature);

    console.log(`Minted ${amount} tokens to ${toAddress}`);
  });
