import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let TinyBankC: TinyBank;

  const MANAGER_NUMBERS = 5;
  let owner: HardhatEthersSigner;
  let managers: HardhatEthersSigner[] = [];
  let hacker: HardhatEthersSigner;

  beforeEach(async () => {
    signers = await hre.ethers.getSigners();

    owner = signers[0];
    for (let i = 0; i < MANAGER_NUMBERS; i++) {
      managers[i] = signers[i + 1];
    }
    hacker = signers[MANAGER_NUMBERS + 1];

    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);

    const managerAddress: string[] = [];
    for (let i = 0; i < MANAGER_NUMBERS; i++) {
      managerAddress[i] = managers[i].address;
    }

    TinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
      owner.address,
      managerAddress,
      MANAGER_NUMBERS,
    ]);

    await myTokenC.setManager(await TinyBankC.getAddress());
  });

  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await TinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await TinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("Staking", () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
      await TinyBankC.stake(stakingAmount);
      expect(await TinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await TinyBankC.totalStaked()).equal(stakingAmount);
      expect(await myTokenC.balanceOf(await TinyBankC.getAddress())).equal(
        await TinyBankC.totalStaked()
      );
    });
  });

  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
      await TinyBankC.stake(stakingAmount);
      await TinyBankC.withdraw(stakingAmount);
      expect(await TinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
      await TinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const initialBalance = await myTokenC.balanceOf(signer0.address);

      for (var i = 0; i < BLOCKS; i++) {
        await hre.ethers.provider.send("evm_mine", []);
      }

      await TinyBankC.withdraw(stakingAmount);

      const expectedReward = hre.ethers.parseUnits(BLOCKS.toString(), DECIMALS);

      expect(await myTokenC.balanceOf(signer0.address)).to.be.closeTo(
        initialBalance + expectedReward,
        hre.ethers.parseUnits("1", DECIMALS)
      );
    });
  });

  describe("multi manager assignment", () => {
    const new_reward = hre.ethers.parseUnits("5", DECIMALS);

    it("should revert confirm by non-manager", async () => {
      await expect(TinyBankC.connect(hacker).confirm()).to.be.revertedWith(
        "You are not a manager"
      );
    });

    it("should revert when not all managers confirm", async () => {
      for (let i = 0; i < MANAGER_NUMBERS - 1; i++) {
        await TinyBankC.connect(managers[i]).confirm();
      }
      await expect(
        TinyBankC.connect(owner).setRewardPerBlock(new_reward)
      ).to.be.revertedWith("Not all confirmed yet");
    });
  });
});
