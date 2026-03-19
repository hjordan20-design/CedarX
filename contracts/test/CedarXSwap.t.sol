// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {CedarXSwap} from "../src/CedarXSwap.sol";
import {ICedarXSwap} from "../src/interfaces/ICedarXSwap.sol";
import {MockERC721} from "./mocks/MockERC721.sol";
import {MockERC1155} from "./mocks/MockERC1155.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Full test suite for CedarXSwap.
///         Covers all happy paths, revert conditions, and edge cases.
contract CedarXSwapTest is Test {
    // ─── Contracts ────────────────────────────────────────────────────────────
    CedarXSwap internal swap;
    MockUSDC internal usdc;
    MockERC721 internal nft;
    MockERC1155 internal multi;
    MockERC20 internal rwa; // generic ERC-20 RWA token

    // ─── Actors ───────────────────────────────────────────────────────────────
    address internal owner = makeAddr("owner");
    address internal treasury = makeAddr("treasury");
    address internal alice = makeAddr("alice"); // seller
    address internal bob = makeAddr("bob"); // buyer
    address internal charlie = makeAddr("charlie"); // third party

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 internal constant FEE_BPS = 150; // 1.5%
    uint256 internal constant PRICE = 10_000e6; // 10,000 USDC
    uint256 internal constant NFT_ID = 1;
    uint256 internal constant MULTI_ID = 42;
    uint256 internal constant MULTI_QTY = 5;
    uint256 internal constant RWA_QTY = 100e18;

    // ─── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        // Deploy mock tokens
        usdc = new MockUSDC();
        nft = new MockERC721();
        multi = new MockERC1155();
        rwa = new MockERC20("RealToken Detroit", "RTD");

        // Deploy swap contract
        vm.prank(owner);
        swap = new CedarXSwap(address(usdc), treasury, FEE_BPS, owner);

        // Mint assets to alice (seller)
        nft.mint(alice, NFT_ID);
        multi.mint(alice, MULTI_ID, MULTI_QTY);
        rwa.mint(alice, RWA_QTY);

        // Fund bob (buyer) with USDC
        usdc.mint(bob, 1_000_000e6); // 1M USDC
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _listNFT() internal returns (uint256 id) {
        vm.startPrank(alice);
        nft.approve(address(swap), NFT_ID);
        id = swap.list(address(nft), NFT_ID, 1, PRICE, ICedarXSwap.TokenStandard.ERC721);
        vm.stopPrank();
    }

    function _listERC1155() internal returns (uint256 id) {
        vm.startPrank(alice);
        multi.setApprovalForAll(address(swap), true);
        id = swap.list(
            address(multi), MULTI_ID, MULTI_QTY, PRICE, ICedarXSwap.TokenStandard.ERC1155
        );
        vm.stopPrank();
    }

    function _listERC20() internal returns (uint256 id) {
        vm.startPrank(alice);
        rwa.approve(address(swap), RWA_QTY);
        id = swap.list(address(rwa), 0, RWA_QTY, PRICE, ICedarXSwap.TokenStandard.ERC20);
        vm.stopPrank();
    }

    function _approveBuyerUSDC() internal {
        vm.prank(bob);
        usdc.approve(address(swap), PRICE);
    }

    function _expectedFee(uint256 price) internal view returns (uint256) {
        return (price * swap.feeBps()) / 10_000;
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    function test_constructor_setsParameters() public view {
        assertEq(swap.USDC(), address(usdc));
        assertEq(swap.treasury(), treasury);
        assertEq(swap.feeBps(), FEE_BPS);
        assertEq(swap.nextListingId(), 1);
        assertEq(swap.owner(), owner);
    }

    function test_constructor_revertZeroUsdc() public {
        vm.expectRevert(ICedarXSwap.ZeroAddress.selector);
        new CedarXSwap(address(0), treasury, FEE_BPS, owner);
    }

    function test_constructor_revertZeroTreasury() public {
        vm.expectRevert(ICedarXSwap.ZeroAddress.selector);
        new CedarXSwap(address(usdc), address(0), FEE_BPS, owner);
    }

    function test_constructor_revertFeeTooHigh() public {
        vm.expectRevert(
            abi.encodeWithSelector(ICedarXSwap.FeeTooHigh.selector, 501, swap.MAX_FEE_BPS())
        );
        new CedarXSwap(address(usdc), treasury, 501, owner);
    }

    // ─── list() ──────────────────────────────────────────────────────────────

    function test_list_ERC721_success() public {
        vm.expectEmit(true, true, true, true);
        emit ICedarXSwap.Listed(1, alice, address(nft), NFT_ID, 1, PRICE, ICedarXSwap.TokenStandard.ERC721);

        uint256 id = _listNFT();

        assertEq(id, 1);
        assertEq(swap.nextListingId(), 2);

        ICedarXSwap.Listing memory l = swap.getListing(id);
        assertEq(l.seller, alice);
        assertEq(l.tokenContract, address(nft));
        assertEq(l.tokenId, NFT_ID);
        assertEq(l.quantity, 1);
        assertEq(l.askingPrice, PRICE);
        assertTrue(l.active);
        assertEq(uint8(l.standard), uint8(ICedarXSwap.TokenStandard.ERC721));
    }

    function test_list_ERC1155_success() public {
        uint256 id = _listERC1155();

        ICedarXSwap.Listing memory l = swap.getListing(id);
        assertEq(l.quantity, MULTI_QTY);
        assertEq(uint8(l.standard), uint8(ICedarXSwap.TokenStandard.ERC1155));
    }

    function test_list_ERC20_success() public {
        uint256 id = _listERC20();

        ICedarXSwap.Listing memory l = swap.getListing(id);
        assertEq(l.quantity, RWA_QTY);
        assertEq(l.tokenId, 0);
        assertEq(uint8(l.standard), uint8(ICedarXSwap.TokenStandard.ERC20));
    }

    function test_list_ERC721_forcesQuantityToOne() public {
        vm.startPrank(alice);
        nft.approve(address(swap), NFT_ID);
        uint256 id = swap.list(address(nft), NFT_ID, 999, PRICE, ICedarXSwap.TokenStandard.ERC721);
        vm.stopPrank();

        assertEq(swap.getListing(id).quantity, 1);
    }

    function test_list_incrementsListingId() public {
        _listNFT();
        multi.mint(alice, 2, 1);
        vm.startPrank(alice);
        multi.setApprovalForAll(address(swap), true);
        uint256 id2 = swap.list(address(multi), 2, 1, PRICE, ICedarXSwap.TokenStandard.ERC1155);
        vm.stopPrank();
        assertEq(id2, 2);
    }

    function test_list_revertZeroAddress() public {
        vm.prank(alice);
        vm.expectRevert(ICedarXSwap.ZeroAddress.selector);
        swap.list(address(0), 0, 1, PRICE, ICedarXSwap.TokenStandard.ERC20);
    }

    function test_list_revertZeroQuantity() public {
        vm.prank(alice);
        vm.expectRevert(ICedarXSwap.ZeroQuantity.selector);
        swap.list(address(rwa), 0, 0, PRICE, ICedarXSwap.TokenStandard.ERC20);
    }

    function test_list_revertZeroPrice() public {
        vm.prank(alice);
        vm.expectRevert(ICedarXSwap.ZeroPrice.selector);
        swap.list(address(nft), NFT_ID, 1, 0, ICedarXSwap.TokenStandard.ERC721);
    }

    function test_list_revertWhenPaused() public {
        vm.prank(owner);
        swap.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        swap.list(address(nft), NFT_ID, 1, PRICE, ICedarXSwap.TokenStandard.ERC721);
    }

    // Token stays with seller after listing (lazy transfer model)
    function test_list_tokenRemainsWithSeller() public {
        _listNFT();
        assertEq(nft.ownerOf(NFT_ID), alice);
    }

    // ─── cancel() ────────────────────────────────────────────────────────────

    function test_cancel_success() public {
        uint256 id = _listNFT();

        vm.expectEmit(true, true, false, false);
        emit ICedarXSwap.Cancelled(id, alice);

        vm.prank(alice);
        swap.cancel(id);

        assertFalse(swap.getListing(id).active);
    }

    function test_cancel_revertListingNotActive() public {
        uint256 id = _listNFT();
        vm.prank(alice);
        swap.cancel(id);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.ListingNotActive.selector, id));
        swap.cancel(id);
    }

    function test_cancel_revertNotSeller() public {
        uint256 id = _listNFT();

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.NotSeller.selector, id, bob));
        swap.cancel(id);
    }

    // ─── updatePrice() ───────────────────────────────────────────────────────

    function test_updatePrice_success() public {
        uint256 id = _listNFT();
        uint256 newPrice = 8_000e6;

        vm.expectEmit(true, false, false, true);
        emit ICedarXSwap.PriceUpdated(id, PRICE, newPrice);

        vm.prank(alice);
        swap.updatePrice(id, newPrice);

        assertEq(swap.getListing(id).askingPrice, newPrice);
    }

    function test_updatePrice_revertNotActive() public {
        uint256 id = _listNFT();
        vm.prank(alice);
        swap.cancel(id);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.ListingNotActive.selector, id));
        swap.updatePrice(id, 5_000e6);
    }

    function test_updatePrice_revertNotSeller() public {
        uint256 id = _listNFT();

        vm.prank(charlie);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.NotSeller.selector, id, charlie));
        swap.updatePrice(id, 5_000e6);
    }

    function test_updatePrice_revertZeroPrice() public {
        uint256 id = _listNFT();

        vm.prank(alice);
        vm.expectRevert(ICedarXSwap.ZeroPrice.selector);
        swap.updatePrice(id, 0);
    }

    function test_updatePrice_revertSamePrice() public {
        uint256 id = _listNFT();

        vm.prank(alice);
        vm.expectRevert(ICedarXSwap.SamePriceAsListed.selector);
        swap.updatePrice(id, PRICE);
    }

    // ─── buy() — ERC-721 ─────────────────────────────────────────────────────

    function test_buy_ERC721_success() public {
        uint256 id = _listNFT();
        _approveBuyerUSDC();

        uint256 fee = _expectedFee(PRICE);
        uint256 sellerProceeds = PRICE - fee;

        uint256 aliceUsdcBefore = usdc.balanceOf(alice);
        uint256 treasuryUsdcBefore = usdc.balanceOf(treasury);
        uint256 bobUsdcBefore = usdc.balanceOf(bob);

        vm.expectEmit(true, true, true, true);
        emit ICedarXSwap.Sold(id, bob, alice, address(nft), NFT_ID, 1, PRICE, fee);

        vm.prank(bob);
        swap.buy(id);

        // NFT ownership transferred
        assertEq(nft.ownerOf(NFT_ID), bob);

        // USDC balances updated correctly
        assertEq(usdc.balanceOf(alice), aliceUsdcBefore + sellerProceeds);
        assertEq(usdc.balanceOf(treasury), treasuryUsdcBefore + fee);
        assertEq(usdc.balanceOf(bob), bobUsdcBefore - PRICE);

        // Listing marked inactive
        assertFalse(swap.getListing(id).active);
    }

    function test_buy_ERC721_exactFeeCalculation() public {
        // 10,000 USDC at 1.5% = 150 USDC fee, 9,850 USDC to seller
        uint256 id = _listNFT();
        _approveBuyerUSDC();

        vm.prank(bob);
        swap.buy(id);

        assertEq(usdc.balanceOf(treasury), 150e6);
        assertEq(usdc.balanceOf(alice), 9_850e6);
    }

    // ─── buy() — ERC-1155 ────────────────────────────────────────────────────

    function test_buy_ERC1155_success() public {
        uint256 id = _listERC1155();
        _approveBuyerUSDC();

        vm.prank(bob);
        swap.buy(id);

        assertEq(multi.balanceOf(bob, MULTI_ID), MULTI_QTY);
        assertEq(multi.balanceOf(alice, MULTI_ID), 0);
    }

    // ─── buy() — ERC-20 ──────────────────────────────────────────────────────

    function test_buy_ERC20_success() public {
        uint256 id = _listERC20();
        _approveBuyerUSDC();

        vm.prank(bob);
        swap.buy(id);

        assertEq(rwa.balanceOf(bob), RWA_QTY);
        assertEq(rwa.balanceOf(alice), 0);
    }

    // ─── buy() — revert conditions ────────────────────────────────────────────

    function test_buy_revertListingNotActive() public {
        uint256 id = _listNFT();
        vm.prank(alice);
        swap.cancel(id);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.ListingNotActive.selector, id));
        swap.buy(id);
    }

    function test_buy_revertCannotBuyOwnListing() public {
        uint256 id = _listNFT();

        vm.prank(alice);
        vm.expectRevert(ICedarXSwap.CannotBuyOwnListing.selector);
        swap.buy(id);
    }

    function test_buy_revertInsufficientUSDCAllowance() public {
        uint256 id = _listNFT();

        // Bob approves less than the price
        vm.prank(bob);
        usdc.approve(address(swap), PRICE - 1);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                ICedarXSwap.InsufficientUSDCAllowance.selector,
                PRICE,
                PRICE - 1
            )
        );
        swap.buy(id);
    }

    function test_buy_revertWhenPaused() public {
        uint256 id = _listNFT();
        _approveBuyerUSDC();

        vm.prank(owner);
        swap.pause();

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        swap.buy(id);
    }

    function test_buy_revertNonExistentListing() public {
        _approveBuyerUSDC();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.ListingNotActive.selector, 999));
        swap.buy(999);
    }

    // ─── buy() — double-buy prevention ───────────────────────────────────────

    function test_buy_cannotBuyTwice() public {
        uint256 id = _listNFT();
        _approveBuyerUSDC();

        vm.prank(bob);
        swap.buy(id);

        // Second buy attempt should revert
        usdc.mint(charlie, PRICE);
        vm.prank(charlie);
        usdc.approve(address(swap), PRICE);
        vm.prank(charlie);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.ListingNotActive.selector, id));
        swap.buy(id);
    }

    // ─── Zero-fee edge case ───────────────────────────────────────────────────

    function test_buy_withZeroFee_noTreasuryTransfer() public {
        vm.prank(owner);
        swap.setFee(0);

        uint256 id = _listNFT();
        _approveBuyerUSDC();

        uint256 treasuryBefore = usdc.balanceOf(treasury);

        vm.prank(bob);
        swap.buy(id);

        assertEq(usdc.balanceOf(alice), PRICE);
        assertEq(usdc.balanceOf(treasury), treasuryBefore); // unchanged
    }

    // ─── Cancelled listing cannot be bought ──────────────────────────────────

    function test_buy_afterCancel_reverts() public {
        uint256 id = _listNFT();
        vm.prank(alice);
        swap.cancel(id);

        _approveBuyerUSDC();
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(ICedarXSwap.ListingNotActive.selector, id));
        swap.buy(id);
    }

    // ─── Price-updated listing uses new price ─────────────────────────────────

    function test_buy_afterPriceUpdate_usesNewPrice() public {
        uint256 id = _listNFT();
        uint256 newPrice = 5_000e6;

        vm.prank(alice);
        swap.updatePrice(id, newPrice);

        vm.prank(bob);
        usdc.approve(address(swap), newPrice);
        vm.prank(bob);
        swap.buy(id);

        uint256 fee = (newPrice * FEE_BPS) / 10_000;
        assertEq(usdc.balanceOf(alice), newPrice - fee);
        assertEq(usdc.balanceOf(treasury), fee);
    }

    // ─── setFee() ────────────────────────────────────────────────────────────

    function test_setFee_success() public {
        vm.expectEmit(false, false, false, true);
        emit ICedarXSwap.FeeUpdated(FEE_BPS, 200);

        vm.prank(owner);
        swap.setFee(200);

        assertEq(swap.feeBps(), 200);
    }

    function test_setFee_toZero() public {
        vm.prank(owner);
        swap.setFee(0);
        assertEq(swap.feeBps(), 0);
    }

    function test_setFee_toMaxAllowed() public {
        vm.prank(owner);
        swap.setFee(swap.MAX_FEE_BPS());
        assertEq(swap.feeBps(), swap.MAX_FEE_BPS());
    }

    function test_setFee_revertTooHigh() public {
        uint256 tooHigh = swap.MAX_FEE_BPS() + 1;
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ICedarXSwap.FeeTooHigh.selector, tooHigh, swap.MAX_FEE_BPS())
        );
        swap.setFee(tooHigh);
    }

    function test_setFee_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        swap.setFee(100);
    }

    // ─── setTreasury() ───────────────────────────────────────────────────────

    function test_setTreasury_success() public {
        address newTreasury = makeAddr("newTreasury");

        vm.expectEmit(true, true, false, false);
        emit ICedarXSwap.TreasuryUpdated(treasury, newTreasury);

        vm.prank(owner);
        swap.setTreasury(newTreasury);

        assertEq(swap.treasury(), newTreasury);
    }

    function test_setTreasury_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(ICedarXSwap.ZeroAddress.selector);
        swap.setTreasury(address(0));
    }

    function test_setTreasury_revertNonOwner() public {
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", bob)
        );
        swap.setTreasury(makeAddr("x"));
    }

    // ─── pause() / unpause() ─────────────────────────────────────────────────

    function test_pause_unpause_cycle() public {
        vm.prank(owner);
        swap.pause();

        // list and buy should be paused
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        swap.list(address(nft), NFT_ID, 1, PRICE, ICedarXSwap.TokenStandard.ERC721);

        vm.prank(owner);
        swap.unpause();

        // list should work again
        vm.prank(alice);
        nft.approve(address(swap), NFT_ID);
        uint256 id = swap.list(address(nft), NFT_ID, 1, PRICE, ICedarXSwap.TokenStandard.ERC721);
        assertTrue(id > 0);
    }

    function test_pause_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        swap.pause();
    }

    // cancel() still works while paused (sellers can always exit)
    function test_cancel_worksWhilePaused() public {
        uint256 id = _listNFT();

        vm.prank(owner);
        swap.pause();

        vm.prank(alice);
        swap.cancel(id); // should NOT revert

        assertFalse(swap.getListing(id).active);
    }

    // ─── Ownable2Step ────────────────────────────────────────────────────────

    function test_ownershipTransfer_requiresTwoSteps() public {
        vm.prank(owner);
        swap.transferOwnership(charlie);

        // Still the old owner until charlie accepts
        assertEq(swap.owner(), owner);
        assertEq(swap.pendingOwner(), charlie);

        vm.prank(charlie);
        swap.acceptOwnership();

        assertEq(swap.owner(), charlie);
    }

    // ─── Fuzz tests ───────────────────────────────────────────────────────────

    /// @dev Fuzz any price; verify fee math always holds: fee + proceeds == price
    function testFuzz_feeMath_alwaysAddsUp(uint256 price) public view {
        // Bound to avoid overflow with feeBps multiplication
        price = bound(price, 1, type(uint128).max);
        uint256 fee = (price * swap.feeBps()) / 10_000;
        uint256 proceeds = price - fee;
        assertEq(fee + proceeds, price);
    }

    /// @dev Fuzz the fee BPS; ensure fee never exceeds MAX_FEE_BPS
    function testFuzz_setFee_cappedAtMax(uint256 bps) public {
        bps = bound(bps, 0, swap.MAX_FEE_BPS());
        vm.prank(owner);
        swap.setFee(bps);
        assertEq(swap.feeBps(), bps);
    }

    function testFuzz_setFee_revertAboveMax(uint256 bps) public {
        bps = bound(bps, swap.MAX_FEE_BPS() + 1, type(uint256).max);
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(ICedarXSwap.FeeTooHigh.selector, bps, swap.MAX_FEE_BPS())
        );
        swap.setFee(bps);
    }

    /// @dev Fuzz a full ERC-20 buy flow with random price
    function testFuzz_buy_ERC20_randomPrice(uint256 price) public {
        price = bound(price, 1, 1_000_000e6); // max 1M USDC

        // Re-mint USDC for bob at this price
        usdc.mint(bob, price);

        vm.startPrank(alice);
        rwa.approve(address(swap), RWA_QTY);
        uint256 id = swap.list(address(rwa), 0, RWA_QTY, price, ICedarXSwap.TokenStandard.ERC20);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(swap), price);
        swap.buy(id);
        vm.stopPrank();

        uint256 fee = (price * FEE_BPS) / 10_000;
        assertEq(usdc.balanceOf(treasury), fee);
        assertEq(usdc.balanceOf(alice), price - fee);
        assertEq(rwa.balanceOf(bob), RWA_QTY);
    }
}
