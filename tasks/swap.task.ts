import { task } from "hardhat/config";

task("swap", "Burns user tokens and emits `SwapInitialized` event")
  .addParam("bridgeaddr", "The address of bridge contract")
  .addParam("toaddr", "The address of tokens recipient on another chain")
  .addParam("amount", "The amount of tokens to swap")
  .setAction(async ({ bridgeaddr: bridgeAddress, toaddr: toAddress, amount }, hre) => {
    const value = hre.ethers.utils.parseUnits(amount);
    const bridge = await hre.ethers.getContractAt("Bridge", bridgeAddress);

    await bridge.swap(toAddress, value);

    console.log(`Burned ${amount} tokens and emitted 'SwapInitialized' event`);

    // --- [TEST] get signature ---
    const [owner, validator] = await hre.ethers.getSigners();
    const nonce = 1;
    const rinkebyId = 4;
    const bscTestnetId = 97;
    const messageHash = hre.ethers.utils.solidityKeccak256(
      ["address", "address", "uint256", "uint256", "uint256", "uint256"],
      [owner.address, toAddress, value, nonce, rinkebyId, bscTestnetId],
    );
    const signature = await validator.signMessage(hre.ethers.utils.arrayify(messageHash));

    console.log("[Test] SwapInitialized parameters: ");
    console.log(owner.address, toAddress, value, nonce, rinkebyId, bscTestnetId);
    console.log(`[Test] Signature: ${signature}`);
  });
