const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Market", function () {
    let usdt, nft, market, account1, account2;

    beforeEach(async () => {
        [account1, account2] = await ethers.getSigners();

        const USDT = await ethers.getContractFactory("USDT");
        usdt = await USDT.deploy();
        const NFT = await ethers.getContractFactory("NFTM");
        nft = await NFT.deploy(account1.address);
        const Market = await ethers.getContractFactory("NFTMarket");
        market = await Market.deploy(usdt.address, nft.address);

        await nft.safeMint(account2.address);
        await nft.safeMint(account2.address);
        await usdt.approve(market.address, "1000000000000000000");
        await nft.connect(account2).setApprovalForAll(account1.address, true);
    });

    it("its erc20 address should be usdt", async function () {
        expect(await market.erc20()).to.equal(usdt.address);
    });

    it("its erc721 address should be nft", async function () {
        expect(await market.erc721()).to.equal(nft.address);
    });

    it("account2 should have 2 nfts", async function () {
        expect(await nft.balanceOf(account2.address)).to.equal(2);
    });

    it("account1 should have usdt", async function () {
        expect(await usdt.balanceOf(account1.address)).to.equal("100000000000000000000000000");
    });

    it("account1 should have no nfts", async function () {
        expect(await nft.balanceOf(account1.address)).to.equal(0);
    });

    // 上架
    it("account2 can list 2 nfts", async function () {
        const price = 
        "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
        
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 0, price)).to.emit(market, "NewOrder");
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 1, price)).to.emit(market, "NewOrder");
        
        expect(await nft.balanceOf(account2.address)).to.equal(0);
        expect(await nft.balanceOf(market.address)).to.equal(2);
        expect(await market.isListed(0)).to.equal(true);
        expect(await market.isListed(1)).to.equal(true);
        
        expect((await market.getAllNFTs())[0][0]).to.equal(account2.address);
        expect((await market.getAllNFTs())[0][1]).to.equal(0);
        expect((await market.getAllNFTs())[0][2]).to.equal(500000000000000);
        expect((await market.getAllNFTs())[1][0]).to.equal(account2.address);
        expect((await market.getAllNFTs())[1][1]).to.equal(1);
        expect((await market.getAllNFTs())[1][2]).to.equal(500000000000000);
        expect(await market.getOrderLength()).to.equal(2);
        
        expect((await market.connect(account2).getMyNFTs())[0][0]).to.equal(account2.address);
        expect((await market.connect(account2).getMyNFTs())[0][1]).to.equal(0);
        expect((await market.connect(account2).getMyNFTs())[0][2]).to.equal("500000000000000");
    });
    
    // 取消
    it("account2 can unlist one nft", async function () {
        const price = 
        "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 0, price)).to.emit(market, "NewOrder");
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 1, price)).to.emit(market, "NewOrder");
        expect(await market.getOrderLength()).to.equal(2);
        expect(await market.isListed(1)).to.equal(true);
        expect(await market.connect(account2).cancelOrder(1)).to.emit(market, "CancelOrder");
        expect(await market.getOrderLength()).to.equal(1);
        expect(await market.isListed(1)).to.equal(false);
    });    
    
    // 改价
    it("account2 can change price", async function () {
        const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";   // 0.0005
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 0, price)).to.emit(market, "NewOrder");
        expect(await market.getOrderLength()).to.equal(1);
        expect(await market.isListed(0)).to.equal(true);
        expect(await market.connect(account2).changePrice(0, "1000000000000000")).to.emit(market, "ChangePrice");
        // const changePriceTx = await market.connect(account2).changePrice(0, "1000000000000000");
        // console.log(changePriceTx);
        // const changePriceEvent = changePriceTx.events.find(event => event.event === "ChangePrice");
        // const tokenId = changePriceEvent.args.tokenId;
        // const previousPrice = changePriceEvent.args.previousPrice;
        // const newPrice = changePriceEvent.args.newPrice;
        // console.log("Token ID:", tokenId);
        // console.log("Previous Price:", previousPrice);
        // console.log("New Price:", newPrice);
    });
    
    // 购买
    it("account1 can buy nft from market", async function () {
        const price = "0x0000000000000000000000000000000000000000000000000001c6bf52634000";
        
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 0, price)).to.emit(market, "NewOrder");
        expect(await nft['safeTransferFrom(address,address,uint256,bytes)'](account2.address, market.address, 1, price)).to.emit(market, "NewOrder");
        
        expect(await nft.balanceOf(account2.address)).to.equal(0);
        expect(await nft.balanceOf(market.address)).to.equal(2);
        expect(await market.isListed(0)).to.equal(true);
        expect(await market.isListed(1)).to.equal(true);

        expect(await market.buy(0, 500000000000000)).to.emit(market, "Deal");
        expect(await nft.balanceOf(account1.address)).to.equal(1);
        expect(await nft.balanceOf(market.address)).to.equal(1);
        expect(await market.isListed(0)).to.equal(false);
    });
});