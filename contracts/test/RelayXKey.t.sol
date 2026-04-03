// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {RelayXKey} from "../src/RelayXKey.sol";
import {IRelayXKey} from "../src/interfaces/IRelayXKey.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

/// @notice Test suite for RelayXKey ERC-721 contract.
contract RelayXKeyTest is Test {
    // ─── Contracts ────────────────────────────────────────────────────────────
    RelayXKey internal key;
    MockUSDC internal usdc;

    // ─── Actors ───────────────────────────────────────────────────────────────
    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice"); // buyer
    address internal bob = makeAddr("bob"); // secondary buyer
    address internal charlie = makeAddr("charlie"); // third party

    // ─── Constants ────────────────────────────────────────────────────────────
    bytes32 internal constant PROP_ID = keccak256("property-001");
    string internal constant UNIT = "Suite 101";
    uint256 internal constant START_DATE = 1_700_000_000; // ~Nov 2023
    uint256 internal constant END_DATE = 1_700_100_000; // ~1 day later
    uint256 internal constant PRICE = 500e6; // 500 USDC

    // ─── Setup ────────────────────────────────────────────────────────────────

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(owner);
        key = new RelayXKey(address(usdc), owner);

        // Fund alice with USDC
        usdc.mint(alice, 1_000_000e6);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _mintKey() internal returns (uint256 tokenId) {
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);
        tokenId = key.mint(PROP_ID, UNIT, START_DATE, END_DATE, PRICE);
        vm.stopPrank();
    }

    // ─── Constructor ─────────────────────────────────────────────────────────

    function test_constructor_setsParameters() public view {
        assertEq(key.usdcAddress(), address(usdc));
        assertEq(key.owner(), owner);
        assertEq(key.name(), "RelayX Key");
        assertEq(key.symbol(), "RXKEY");
    }

    function test_constructor_revertZeroUsdc() public {
        vm.expectRevert(IRelayXKey.ZeroAddress.selector);
        new RelayXKey(address(0), owner);
    }

    // ─── mint() ──────────────────────────────────────────────────────────────

    function test_mint_success() public {
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);

        vm.expectEmit(true, true, true, true);
        emit IRelayXKey.KeyMinted(1, alice, PROP_ID, UNIT, START_DATE, END_DATE, PRICE);

        uint256 tokenId = key.mint(PROP_ID, UNIT, START_DATE, END_DATE, PRICE);
        vm.stopPrank();

        assertEq(tokenId, 1);
        assertEq(key.ownerOf(tokenId), alice);
        assertEq(key.balanceOf(alice), 1);

        // USDC transferred to owner
        assertEq(usdc.balanceOf(owner), PRICE);
    }

    function test_mint_storesMetadata() public {
        uint256 tokenId = _mintKey();

        IRelayXKey.KeyMetadata memory meta = key.getKeyMetadata(tokenId);
        assertEq(meta.propertyId, PROP_ID);
        assertEq(keccak256(bytes(meta.unit)), keccak256(bytes(UNIT)));
        assertEq(meta.startDate, START_DATE);
        assertEq(meta.endDate, END_DATE);
        assertEq(meta.priceUsdc, PRICE);
        assertEq(uint8(meta.state), uint8(IRelayXKey.KeyState.Tradeable));
    }

    function test_mint_incrementsTokenId() public {
        uint256 id1 = _mintKey();

        // Mint a second key
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);
        uint256 id2 = key.mint(PROP_ID, UNIT, START_DATE, END_DATE, PRICE);
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_mint_revertInvalidDateRange() public {
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);

        vm.expectRevert(IRelayXKey.InvalidDateRange.selector);
        key.mint(PROP_ID, UNIT, END_DATE, START_DATE, PRICE);
        vm.stopPrank();
    }

    function test_mint_revertSameDates() public {
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);

        vm.expectRevert(IRelayXKey.InvalidDateRange.selector);
        key.mint(PROP_ID, UNIT, START_DATE, START_DATE, PRICE);
        vm.stopPrank();
    }

    function test_mint_revertZeroPrice() public {
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);

        vm.expectRevert(IRelayXKey.ZeroPrice.selector);
        key.mint(PROP_ID, UNIT, START_DATE, END_DATE, 0);
        vm.stopPrank();
    }

    function test_mint_revertInsufficientAllowance() public {
        vm.startPrank(alice);
        usdc.approve(address(key), PRICE - 1);

        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.InsufficientUSDCAllowance.selector, PRICE, PRICE - 1)
        );
        key.mint(PROP_ID, UNIT, START_DATE, END_DATE, PRICE);
        vm.stopPrank();
    }

    // ─── redeem() ────────────────────────────────────────────────────────────

    function test_redeem_success() public {
        uint256 tokenId = _mintKey();

        vm.expectEmit(true, true, false, false);
        emit IRelayXKey.KeyRedeemed(tokenId, alice);

        vm.prank(alice);
        key.redeem(tokenId);

        IRelayXKey.KeyMetadata memory meta = key.getKeyMetadata(tokenId);
        assertEq(uint8(meta.state), uint8(IRelayXKey.KeyState.Redeemed));
    }

    function test_redeem_revertNotOwner() public {
        uint256 tokenId = _mintKey();

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.NotTokenOwner.selector, tokenId, bob)
        );
        key.redeem(tokenId);
    }

    function test_redeem_revertAlreadyRedeemed() public {
        uint256 tokenId = _mintKey();

        vm.prank(alice);
        key.redeem(tokenId);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenNotTradeable.selector, tokenId)
        );
        key.redeem(tokenId);
    }

    function test_redeem_revertNonExistentToken() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenDoesNotExist.selector, 999)
        );
        key.redeem(999);
    }

    // ─── Transfer blocking after redeem ──────────────────────────────────────

    function test_transfer_blockedAfterRedeem() public {
        uint256 tokenId = _mintKey();

        vm.prank(alice);
        key.redeem(tokenId);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenNotTradeable.selector, tokenId)
        );
        key.transferFrom(alice, bob, tokenId);
    }

    function test_transfer_allowedBeforeRedeem() public {
        uint256 tokenId = _mintKey();

        vm.prank(alice);
        key.transferFrom(alice, bob, tokenId);

        assertEq(key.ownerOf(tokenId), bob);
    }

    function test_safeTransfer_blockedAfterRedeem() public {
        uint256 tokenId = _mintKey();

        vm.prank(alice);
        key.redeem(tokenId);

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenNotTradeable.selector, tokenId)
        );
        key.safeTransferFrom(alice, bob, tokenId);
    }

    // ─── burn() ──────────────────────────────────────────────────────────────

    function test_burn_success() public {
        uint256 tokenId = _mintKey();

        vm.expectEmit(true, false, false, false);
        emit IRelayXKey.KeyBurned(tokenId);

        vm.prank(owner);
        key.burn(tokenId);

        // Token no longer exists
        vm.expectRevert();
        key.ownerOf(tokenId);
    }

    function test_burn_revertNonOwner() public {
        uint256 tokenId = _mintKey();

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice)
        );
        key.burn(tokenId);
    }

    function test_burn_revertNonExistentToken() public {
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenDoesNotExist.selector, 999)
        );
        key.burn(999);
    }

    // ─── tokenURI() ──────────────────────────────────────────────────────────

    function test_tokenURI_returnsBase64Json() public {
        uint256 tokenId = _mintKey();

        string memory uri = key.tokenURI(tokenId);

        // Should start with the data URI prefix
        assertTrue(bytes(uri).length > 0);
        // Check that it starts with "data:application/json;base64,"
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory uriBytes = bytes(uri);
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
    }

    function test_tokenURI_revertNonExistent() public {
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenDoesNotExist.selector, 999)
        );
        key.tokenURI(999);
    }

    // ─── setUsdcAddress() ────────────────────────────────────────────────────

    function test_setUsdcAddress_success() public {
        address newUsdc = makeAddr("newUsdc");

        vm.expectEmit(true, true, false, false);
        emit IRelayXKey.UsdcAddressUpdated(address(usdc), newUsdc);

        vm.prank(owner);
        key.setUsdcAddress(newUsdc);

        assertEq(key.usdcAddress(), newUsdc);
    }

    function test_setUsdcAddress_revertZero() public {
        vm.prank(owner);
        vm.expectRevert(IRelayXKey.ZeroAddress.selector);
        key.setUsdcAddress(address(0));
    }

    function test_setUsdcAddress_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice)
        );
        key.setUsdcAddress(makeAddr("x"));
    }

    // ─── withdraw() ──────────────────────────────────────────────────────────

    function test_withdraw_success() public {
        // Send some USDC directly to the contract
        usdc.mint(address(key), 1_000e6);

        uint256 ownerBefore = usdc.balanceOf(owner);

        vm.expectEmit(true, false, false, true);
        emit IRelayXKey.UsdcWithdrawn(owner, 1_000e6);

        vm.prank(owner);
        key.withdraw();

        assertEq(usdc.balanceOf(owner), ownerBefore + 1_000e6);
        assertEq(usdc.balanceOf(address(key)), 0);
    }

    function test_withdraw_noBalanceNoOp() public {
        uint256 ownerBefore = usdc.balanceOf(owner);

        vm.prank(owner);
        key.withdraw(); // should not revert

        assertEq(usdc.balanceOf(owner), ownerBefore);
    }

    function test_withdraw_revertNonOwner() public {
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice)
        );
        key.withdraw();
    }

    // ─── ERC721Enumerable ────────────────────────────────────────────────────

    function test_enumerable_totalSupply() public {
        _mintKey();

        vm.startPrank(alice);
        usdc.approve(address(key), PRICE);
        key.mint(PROP_ID, UNIT, START_DATE, END_DATE, PRICE);
        vm.stopPrank();

        assertEq(key.totalSupply(), 2);

        // Burn one
        vm.prank(owner);
        key.burn(1);

        assertEq(key.totalSupply(), 1);
    }

    // ─── getKeyMetadata() ────────────────────────────────────────────────────

    function test_getKeyMetadata_revertNonExistent() public {
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenDoesNotExist.selector, 42)
        );
        key.getKeyMetadata(42);
    }

    // ─── Full lifecycle ──────────────────────────────────────────────────────

    function test_fullLifecycle_mintRedeemBurn() public {
        // Mint
        uint256 tokenId = _mintKey();
        assertEq(key.ownerOf(tokenId), alice);

        // Redeem
        vm.prank(alice);
        key.redeem(tokenId);

        IRelayXKey.KeyMetadata memory meta = key.getKeyMetadata(tokenId);
        assertEq(uint8(meta.state), uint8(IRelayXKey.KeyState.Redeemed));

        // Transfer blocked
        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenNotTradeable.selector, tokenId)
        );
        key.transferFrom(alice, bob, tokenId);

        // Burn by owner
        vm.prank(owner);
        key.burn(tokenId);

        assertEq(key.totalSupply(), 0);
    }

    function test_fullLifecycle_mintTransferRedeem() public {
        // Mint to alice
        uint256 tokenId = _mintKey();

        // Alice transfers to bob (tradeable state)
        vm.prank(alice);
        key.transferFrom(alice, bob, tokenId);
        assertEq(key.ownerOf(tokenId), bob);

        // Bob redeems
        vm.prank(bob);
        key.redeem(tokenId);

        IRelayXKey.KeyMetadata memory meta = key.getKeyMetadata(tokenId);
        assertEq(uint8(meta.state), uint8(IRelayXKey.KeyState.Redeemed));

        // Bob cannot transfer after redeem
        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(IRelayXKey.TokenNotTradeable.selector, tokenId)
        );
        key.transferFrom(bob, charlie, tokenId);
    }
}
