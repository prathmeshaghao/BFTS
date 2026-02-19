import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet Contract", function () {
  async function deployWallet() {
    const Wallet = await ethers.getContractFactory("Wallet");
    const wallet = await Wallet.deploy();
    return wallet;
  }

  it("Should deposit funds", async function () {
    const wallet = await deployWallet();
    const [owner] = await ethers.getSigners();

    await wallet.deposit({ value: ethers.parseEther("1") });

    const balance = await wallet.getBalance(owner.address);
    expect(balance).to.equal(ethers.parseEther("1"));
  });

  it("Should withdraw funds", async function () {
    const wallet = await deployWallet();
    const [owner] = await ethers.getSigners();

    await wallet.deposit({ value: ethers.parseEther("1") });
    await wallet.withdraw(ethers.parseEther("0.5"));

    const balance = await wallet.getBalance(owner.address);
    expect(balance).to.equal(ethers.parseEther("0.5"));
  });

  it("Should transfer funds", async function () {
    const wallet = await deployWallet();
    const [owner, user2] = await ethers.getSigners();

    await wallet.deposit({ value: ethers.parseEther("1") });
    await wallet.transferTo(user2.address, ethers.parseEther("0.3"));

    const bal2 = await wallet.getBalance(user2.address);
    expect(bal2).to.equal(ethers.parseEther("0.3"));
  });
});
