import { expect } from "chai";
import { ethers, network, web3 } from "hardhat";
import { BigNumber, Contract } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const toBigNumber = (amount: number): BigNumber => ethers.utils.parseUnits(amount.toString());

const ZERO_ADDRESS = ethers.constants.AddressZero;

enum CHAIN_ID {
  rinkeby = 4,
  bscTestnet = 97,
  hardhat = network.config.chainId as number,
}

describe("Bridge ETH --> BSC", () => {
  const tokenInitialBalance = toBigNumber(100);
  const transferAmount = toBigNumber(25);
  const nonce = 1;

  let ethToken: Contract,
    bscToken: Contract,
    ethBridge: Contract,
    bscBridge: Contract,
    owner: SignerWithAddress,
    validator: SignerWithAddress,
    ethAccount: SignerWithAddress,
    bscAccount: SignerWithAddress,
    validatorAddress: string,
    ethAccountAddress: string,
    bscAccountAddress: string;

  let signature: string; // latest signed message

  let clean: any; // snapshot

  before(async () => {
    [owner, validator, ethAccount, bscAccount] = await ethers.getSigners();
    validatorAddress = validator.address;
    ethAccountAddress = ethAccount.address;
    bscAccountAddress = bscAccount.address;

    const tokenContractFactory = await ethers.getContractFactory("Token");
    const bridgeContractFactory = await ethers.getContractFactory("Bridge");
    const minterRole = ethers.utils.id("MINTER_ROLE");

    // --- ETH chain deployments ---
    ethToken = await tokenContractFactory.deploy("Bridge Token", "BRT", tokenInitialBalance);
    await ethToken.deployed();

    ethBridge = await bridgeContractFactory.deploy(validatorAddress, ethToken.address, CHAIN_ID.bscTestnet);
    await ethBridge.deployed();

    await ethToken.grantRole(minterRole, owner.address);
    await ethToken.grantRole(minterRole, ethBridge.address);
    await ethToken.mint(ethAccountAddress, tokenInitialBalance);

    // --- BSC chain deployments ---
    bscToken = await tokenContractFactory.deploy("Binance-Peg Bridge Token", "BRT", 0);
    await bscToken.deployed();
    // await bscToken.mint(account1Address, tokenInitialBalance);

    bscBridge = await bridgeContractFactory.deploy(validatorAddress, bscToken.address, CHAIN_ID.rinkeby);
    await bscBridge.deployed();

    await bscToken.grantRole(minterRole, bscBridge.address);

    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });

  afterEach(async () => {
    await network.provider.request({ method: "evm_revert", params: [clean] });
    clean = await network.provider.request({ method: "evm_snapshot", params: [] });
  });

  describe("[swap from eth bridge]", () => {
    it("Should revert when receiver address is zero", async () => {
      await expect(ethBridge.connect(ethAccount).swap(ZERO_ADDRESS, transferAmount)).to.be.revertedWith("Not valid address");
    });

    it("Should revert when transfer price is zero", async () => {
      await expect(ethBridge.connect(ethAccount).swap(bscAccountAddress, 0)).to.be.revertedWith("Not valid amount");
    });

    it("Should burn specified amount of tokens and emit SwapInitialized event", async () => {
      await expect(ethBridge.connect(ethAccount).swap(bscAccountAddress, transferAmount))
        .to.emit(ethBridge, "SwapInitialized")
        .withArgs(ethAccountAddress, bscAccountAddress, transferAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet);

      expect(await ethToken.balanceOf(ethAccountAddress)).to.equal(tokenInitialBalance.sub(transferAmount));
      expect(await ethToken.totalSupply()).to.equal(tokenInitialBalance.mul(2).sub(transferAmount));
    });
  });

  describe("[redeem from bsc bridge]", () => {
    beforeEach(async () => {
      await ethBridge.connect(ethAccount).swap(bscAccountAddress, transferAmount);

      // `ethers` usage
      const messageHash = ethers.utils.solidityKeccak256(
        ["address", "address", "uint256", "uint256", "uint256", "uint256"],
        [ethAccountAddress, bscAccountAddress, transferAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet],
      );
      signature = await validator.signMessage(ethers.utils.arrayify(messageHash));
    });

    it("Should revert when user redeems the same data the second time", async () => {
      await bscBridge.connect(bscAccount).redeem(
        ethAccountAddress, bscAccountAddress, transferAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet, signature,
      );
      await expect(bscBridge.connect(bscAccount).redeem(
        ethAccountAddress, bscAccountAddress, transferAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet, signature,
      )).to.be.revertedWith("Operation has been already processed");
    });

    it("Should revert when user redeems the incorrect data", async () => {
      await expect(bscBridge.connect(bscAccount).redeem(
        ethAccountAddress, bscAccountAddress, transferAmount, 2, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet, signature,
      )).to.be.revertedWith("Not valid data");
    });

    it("Should mint tokens to the specified address", async () => {
      await bscBridge.connect(bscAccount).redeem(
        ethAccountAddress, bscAccountAddress, transferAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet, signature,
      );

      expect(await bscToken.balanceOf(bscAccountAddress)).to.equal(transferAmount);
      expect(await bscToken.totalSupply()).to.equal(transferAmount);
    });
  });

  describe("swap from bsc bridge and redeem from eth bridge", () => {
    const newAmount = toBigNumber(7);

    beforeEach(async () => {
      await ethBridge.connect(ethAccount).swap(bscAccountAddress, transferAmount);
      await bscBridge.connect(bscAccount).redeem(
        ethAccountAddress, bscAccountAddress, transferAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.bscTestnet, signature,
      );
    });

    it("[swap from bsc bridge] Should burn specified amount of tokens and emit SwapInitialized event", async () => {
      await expect(bscBridge.connect(bscAccount).swap(ethAccountAddress, newAmount))
        .to.emit(bscBridge, "SwapInitialized")
        .withArgs(bscAccountAddress, ethAccountAddress, newAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.rinkeby);

      expect(await bscToken.balanceOf(bscAccountAddress)).to.equal(transferAmount.sub(newAmount));
      expect(await bscToken.totalSupply()).to.equal(transferAmount.sub(newAmount));
    });

    it("[redeem from eth bridge] Should mint tokens to the specified address", async () => {
      await bscBridge.connect(bscAccount).swap(ethAccountAddress, newAmount);

      // `web3` usage
      const newAmountBN = web3.utils.toBN(newAmount.toString());
      const messageHash = web3.utils.soliditySha3(
        bscAccountAddress, ethAccountAddress, newAmountBN, nonce, CHAIN_ID.hardhat, CHAIN_ID.rinkeby,
      ) as string;
      const signature = await web3.eth.sign(messageHash, validatorAddress);

      await expect(ethBridge.connect(ethAccount).redeem(
        bscAccountAddress, ethAccountAddress, newAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.rinkeby, signature,
      ))
        .to.emit(ethBridge, "Redeemed")
        .withArgs(bscAccountAddress, ethAccountAddress, newAmount, nonce, CHAIN_ID.hardhat, CHAIN_ID.rinkeby);

      expect(await ethToken.balanceOf(ethAccountAddress)).to.equal(tokenInitialBalance.sub(transferAmount).add(newAmount));
      expect(await ethToken.totalSupply()).to.equal(tokenInitialBalance.mul(2).sub(transferAmount).add(newAmount));
    });
  });

  describe("admin", () => {
    it("[updateValidator] Should set a new validator address", async () => {
      const newValidatorAddress = owner.address;

      await bscBridge.updateValidator(newValidatorAddress);
      expect(await bscBridge.getValidator()).to.equal(newValidatorAddress);
    });
  });

});
