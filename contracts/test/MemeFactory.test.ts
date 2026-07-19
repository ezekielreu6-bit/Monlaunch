import { expect } from "chai";
import { ethers } from "hardhat";
import { MemeFactory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MemeFactory", function () {
  let factory: MemeFactory;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const TOKEN_NAME = "Test Pepe";
  const TOKEN_SYMBOL = "TPEPE";
  const METADATA_URI = "ipfs://QmTestHash123";

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const MemeFactory = await ethers.getContractFactory("MemeFactory");
    factory = await MemeFactory.deploy();
    await factory.waitForDeployment();
  });

  // ─── Deployment ──────────────────────────────────────────────────────────

  describe("Deployment", () => {
    it("sets the deployer as owner", async () => {
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("has zero tokens at start", async () => {
      expect(await factory.totalTokens()).to.equal(0n);
    });

    it("exposes correct constants", async () => {
      expect(await factory.TOTAL_SUPPLY()).to.equal(
        ethers.parseEther("1000000000")
      );
      expect(await factory.TRADE_FEE_BPS()).to.equal(100n);
      expect(await factory.GRADUATION_THRESHOLD()).to.equal(
        ethers.parseEther("10")
      );
    });
  });

  // ─── Token creation ───────────────────────────────────────────────────────

  describe("createToken", () => {
    it("creates a token and records it", async () => {
      const tx = await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI);
      const receipt = await tx.wait();

      expect(await factory.totalTokens()).to.equal(1n);

      const tokenAddress = await factory.allTokens(0);
      const info = await factory.tokens(tokenAddress);

      expect(info.name).to.equal(TOKEN_NAME);
      expect(info.symbol).to.equal(TOKEN_SYMBOL);
      expect(info.metadataURI).to.equal(METADATA_URI);
      expect(info.creator).to.equal(user1.address);
      expect(info.graduated).to.equal(false);
      expect(info.tokenReserve).to.equal(await factory.TOTAL_SUPPLY());
    });

    it("emits TokenCreated event", async () => {
      await expect(
        factory
          .connect(user1)
          .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI)
      ).to.emit(factory, "TokenCreated");
    });

    it("allows initial buy on creation", async () => {
      const buyAmount = ethers.parseEther("0.1");
      const tx = await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI, {
          value: buyAmount,
        });
      await tx.wait();

      const tokenAddress = await factory.allTokens(0);
      const token = await ethers.getContractAt("MemeToken", tokenAddress);
      const balance = await token.balanceOf(user1.address);

      expect(balance).to.be.gt(0n);
    });

    it("reverts with empty name", async () => {
      await expect(
        factory.connect(user1).createToken("", TOKEN_SYMBOL, METADATA_URI)
      ).to.be.revertedWith("Name required");
    });

    it("reverts with empty metadataURI", async () => {
      await expect(
        factory.connect(user1).createToken(TOKEN_NAME, TOKEN_SYMBOL, "")
      ).to.be.revertedWith("Metadata URI required");
    });
  });

  // ─── Buying ───────────────────────────────────────────────────────────────

  describe("buy", () => {
    let tokenAddress: string;

    beforeEach(async () => {
      const tx = await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI);
      await tx.wait();
      tokenAddress = await factory.allTokens(0);
    });

    it("transfers tokens to buyer", async () => {
      const monIn = ethers.parseEther("0.5");
      const [expectedOut] = await factory.quoteBuy(tokenAddress, monIn);

      await factory.connect(user2).buy(tokenAddress, { value: monIn });

      const token = await ethers.getContractAt("MemeToken", tokenAddress);
      const balance = await token.balanceOf(user2.address);
      expect(balance).to.equal(expectedOut);
    });

    it("increases MON reserve after buy", async () => {
      const infoBefore = await factory.tokens(tokenAddress);
      const monIn = ethers.parseEther("1");

      await factory.connect(user2).buy(tokenAddress, { value: monIn });

      const infoAfter = await factory.tokens(tokenAddress);
      expect(infoAfter.monReserve).to.be.gt(infoBefore.monReserve);
    });

    it("collects fee", async () => {
      const monIn = ethers.parseEther("1");
      await factory.connect(user2).buy(tokenAddress, { value: monIn });

      const fees = await factory.feesAccumulated();
      const expectedFee = (monIn * 100n) / 10000n;
      expect(fees).to.equal(expectedFee);
    });

    it("emits TokensBought event", async () => {
      await expect(
        factory
          .connect(user2)
          .buy(tokenAddress, { value: ethers.parseEther("0.1") })
      ).to.emit(factory, "TokensBought");
    });

    it("reverts with zero value", async () => {
      await expect(
        factory.connect(user2).buy(tokenAddress, { value: 0n })
      ).to.be.revertedWith("Send MON to buy");
    });

    it("price increases after consecutive buys", async () => {
      const price1 = await factory.getSpotPrice(tokenAddress);
      await factory
        .connect(user2)
        .buy(tokenAddress, { value: ethers.parseEther("1") });
      const price2 = await factory.getSpotPrice(tokenAddress);
      expect(price2).to.be.gt(price1);
    });
  });

  // ─── Selling ──────────────────────────────────────────────────────────────

  describe("sell", () => {
    let tokenAddress: string;

    beforeEach(async () => {
      // Create token and buy some
      await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI);
      tokenAddress = await factory.allTokens(0);
      await factory
        .connect(user2)
        .buy(tokenAddress, { value: ethers.parseEther("1") });
    });

    it("transfers MON back to seller", async () => {
      const token = await ethers.getContractAt("MemeToken", tokenAddress);
      const tokenBalance = await token.balanceOf(user2.address);

      const balanceBefore = await ethers.provider.getBalance(user2.address);

      // Approve and sell half
      const sellAmount = tokenBalance / 2n;
      await token
        .connect(user2)
        .approve(await factory.getAddress(), sellAmount);
      const tx = await factory
        .connect(user2)
        .sell(tokenAddress, sellAmount, 0n);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user2.address);
      expect(balanceAfter + gasUsed).to.be.gt(balanceBefore);
    });

    it("emits TokensSold event", async () => {
      const token = await ethers.getContractAt("MemeToken", tokenAddress);
      const tokenBalance = await token.balanceOf(user2.address);
      await token
        .connect(user2)
        .approve(await factory.getAddress(), tokenBalance);

      await expect(
        factory.connect(user2).sell(tokenAddress, tokenBalance, 0n)
      ).to.emit(factory, "TokensSold");
    });

    it("respects minMonOut slippage guard", async () => {
      const token = await ethers.getContractAt("MemeToken", tokenAddress);
      const tokenBalance = await token.balanceOf(user2.address);
      await token
        .connect(user2)
        .approve(await factory.getAddress(), tokenBalance);

      const [expectedOut] = await factory.quoteSell(tokenAddress, tokenBalance);
      const tooHigh = expectedOut + ethers.parseEther("999");

      await expect(
        factory.connect(user2).sell(tokenAddress, tokenBalance, tooHigh)
      ).to.be.revertedWith("Slippage: too little MON out");
    });
  });

  // ─── Graduation ───────────────────────────────────────────────────────────

  describe("Graduation", () => {
    let tokenAddress: string;

    beforeEach(async () => {
      await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI);
      tokenAddress = await factory.allTokens(0);
    });

    it("graduates token when threshold is reached", async () => {
      // Graduation at 10 MON raised — buy in chunks
      for (let i = 0; i < 5; i++) {
        await factory
          .connect(user2)
          .buy(tokenAddress, { value: ethers.parseEther("2.5") });
      }

      const info = await factory.tokens(tokenAddress);
      expect(info.graduated).to.equal(true);
    });

    it("emits TokenGraduated event", async () => {
      await expect(
        factory
          .connect(user2)
          .buy(tokenAddress, { value: ethers.parseEther("12") })
      ).to.emit(factory, "TokenGraduated");
    });

    it("blocks buys after graduation", async () => {
      await factory
        .connect(user2)
        .buy(tokenAddress, { value: ethers.parseEther("12") });

      await expect(
        factory
          .connect(user2)
          .buy(tokenAddress, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Token has graduated - trade on DEX");
    });
  });

  // ─── View helpers ─────────────────────────────────────────────────────────

  describe("View helpers", () => {
    let tokenAddress: string;

    beforeEach(async () => {
      await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI);
      tokenAddress = await factory.allTokens(0);
    });

    it("getSpotPrice returns a positive price", async () => {
      const price = await factory.getSpotPrice(tokenAddress);
      expect(price).to.be.gt(0n);
    });

    it("quoteBuy is consistent with actual buy", async () => {
      const monIn = ethers.parseEther("0.5");
      const [expectedTokens] = await factory.quoteBuy(tokenAddress, monIn);

      await factory.connect(user2).buy(tokenAddress, { value: monIn });

      const token = await ethers.getContractAt("MemeToken", tokenAddress);
      const actual = await token.balanceOf(user2.address);
      expect(actual).to.equal(expectedTokens);
    });

    it("getGraduationProgress returns 0 at start and 10000 when graduated", async () => {
      const progress0 = await factory.getGraduationProgress(tokenAddress);
      expect(progress0).to.equal(0n);

      await factory
        .connect(user2)
        .buy(tokenAddress, { value: ethers.parseEther("15") });

      const progress1 = await factory.getGraduationProgress(tokenAddress);
      expect(progress1).to.equal(10000n);
    });

    it("getTokensPaginated returns tokens newest-first", async () => {
      // Create 3 tokens
      await factory.connect(user1).createToken("A", "A", METADATA_URI);
      await factory.connect(user1).createToken("B", "B", METADATA_URI);
      await factory.connect(user1).createToken("C", "C", METADATA_URI);

      // Total: 4 (the one from beforeEach + 3 above)
      const page = await factory.getTokensPaginated(0, 2);
      expect(page.length).to.equal(2);

      // Newest should be first
      const totalCount = await factory.totalTokens();
      const newestAddr = await factory.allTokens(totalCount - 1n);
      expect(page[0]).to.equal(newestAddr);
    });
  });

  // ─── Admin ────────────────────────────────────────────────────────────────

  describe("Admin", () => {
    it("allows owner to withdraw fees", async () => {
      await factory
        .connect(user1)
        .createToken(TOKEN_NAME, TOKEN_SYMBOL, METADATA_URI);
      const tokenAddress = await factory.allTokens(0);
      await factory
        .connect(user2)
        .buy(tokenAddress, { value: ethers.parseEther("2") });

      const fees = await factory.feesAccumulated();
      expect(fees).to.be.gt(0n);

      const ownerBalBefore = await ethers.provider.getBalance(owner.address);
      const tx = await factory.connect(owner).withdrawFees();
      const receipt = await tx.wait();
      const gas = receipt!.gasUsed * receipt!.gasPrice;
      const ownerBalAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalAfter + gas).to.be.gt(ownerBalBefore);
    });

    it("blocks non-owner from withdrawing fees", async () => {
      await expect(
        factory.connect(user1).withdrawFees()
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("allows owner to set creation fee", async () => {
      await factory
        .connect(owner)
        .setCreationFee(ethers.parseEther("0.01"));
      expect(await factory.creationFee()).to.equal(
        ethers.parseEther("0.01")
      );
    });
  });
});
