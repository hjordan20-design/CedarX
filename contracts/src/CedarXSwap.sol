// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {ICedarXSwap} from "./interfaces/ICedarXSwap.sol";

/// @title CedarXSwap
/// @author CedarX
/// @notice Atomic peer-to-peer swap contract for tokenized real-world assets.
///
///         Supports ERC-721, ERC-1155, and ERC-20 token listings, settled in
///         USDC on Ethereum L1. A configurable platform fee (default 1.5%) is
///         deducted from the buyer's payment and routed to the CedarX treasury
///         wallet in the same atomic transaction.
///
///         Security properties:
///         - ReentrancyGuard on all state-changing external functions
///         - Check-Effects-Interactions pattern throughout
///         - Ownable2Step (two-phase ownership transfer)
///         - Pausable for emergency circuit-breaker
///         - SafeERC20 for USDC transfers (handles non-standard ERC-20s)
///         - No delegatecall / proxy patterns — simple, flat, auditable
///
/// @custom:security-contact security@cedarx.io
contract CedarXSwap is ICedarXSwap, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    uint256 public constant MAX_FEE_BPS = 500; // 5% hard cap

    uint256 private constant BPS_DENOMINATOR = 10_000;

    // ─── Immutables ───────────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    address public immutable USDC;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    uint256 public feeBps;

    /// @inheritdoc ICedarXSwap
    address public treasury;

    /// @inheritdoc ICedarXSwap
    uint256 public nextListingId;

    /// @dev listingId → Listing
    mapping(uint256 => Listing) private _listings;

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @param usdcAddress    USDC token contract on Ethereum L1
    /// @param treasuryWallet Address that will receive platform fees
    /// @param initialFeeBps  Initial fee in basis points (e.g., 150 = 1.5%)
    /// @param owner_         Initial contract owner (use Ownable2Step's two-step)
    constructor(
        address usdcAddress,
        address treasuryWallet,
        uint256 initialFeeBps,
        address owner_
    ) Ownable(owner_) {
        if (usdcAddress == address(0)) revert ZeroAddress();
        if (treasuryWallet == address(0)) revert ZeroAddress();
        if (initialFeeBps > MAX_FEE_BPS) revert FeeTooHigh(initialFeeBps, MAX_FEE_BPS);

        USDC = usdcAddress;
        treasury = treasuryWallet;
        feeBps = initialFeeBps;
        nextListingId = 1; // start at 1 so 0 can be used as a sentinel
    }

    // ─── Seller actions ───────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    function list(
        address tokenContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 askingPrice,
        TokenStandard standard
    ) external whenNotPaused nonReentrant returns (uint256 listingId) {
        // ── Validate inputs ───────────────────────────────────────────────────
        if (tokenContract == address(0)) revert ZeroAddress();
        if (quantity == 0) revert ZeroQuantity();
        if (askingPrice == 0) revert ZeroPrice();

        if (standard == TokenStandard.ERC721) {
            // For ERC-721, quantity is always 1
            quantity = 1;
        }

        // ── Effects ───────────────────────────────────────────────────────────
        listingId = nextListingId++;

        _listings[listingId] = Listing({
            seller: msg.sender,
            tokenContract: tokenContract,
            tokenId: tokenId,
            quantity: quantity,
            askingPrice: askingPrice,
            standard: standard,
            active: true
        });

        emit Listed(listingId, msg.sender, tokenContract, tokenId, quantity, askingPrice, standard);

        // ── No external interactions in list() ────────────────────────────────
        // We do NOT pull the token here. Seller must approve the contract.
        // This mirrors OpenSea's "lazy transfer" model — the token remains in
        // the seller's wallet until a buyer executes. This avoids locking up
        // seller assets and simplifies the cancel flow (no token to return).
    }

    /// @inheritdoc ICedarXSwap
    function cancel(uint256 listingId) external nonReentrant {
        Listing storage listing = _listings[listingId];

        // ── Validate ──────────────────────────────────────────────────────────
        if (!listing.active) revert ListingNotActive(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId, msg.sender);

        // ── Effects ───────────────────────────────────────────────────────────
        listing.active = false;

        emit Cancelled(listingId, msg.sender);

        // ── No interactions needed ────────────────────────────────────────────
        // Token was never pulled; nothing to return.
    }

    /// @inheritdoc ICedarXSwap
    function updatePrice(uint256 listingId, uint256 newPrice) external nonReentrant {
        Listing storage listing = _listings[listingId];

        // ── Validate ──────────────────────────────────────────────────────────
        if (!listing.active) revert ListingNotActive(listingId);
        if (listing.seller != msg.sender) revert NotSeller(listingId, msg.sender);
        if (newPrice == 0) revert ZeroPrice();
        if (newPrice == listing.askingPrice) revert SamePriceAsListed();

        // ── Effects ───────────────────────────────────────────────────────────
        uint256 oldPrice = listing.askingPrice;
        listing.askingPrice = newPrice;

        emit PriceUpdated(listingId, oldPrice, newPrice);
    }

    // ─── Buyer actions ────────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    /// @dev Atomic swap sequence (all in one transaction):
    ///      1. Validate listing is active, caller is not the seller
    ///      2. Mark listing inactive (Effects before Interactions)
    ///      3. Calculate fee split
    ///      4. Transfer USDC from buyer → seller (net amount)
    ///      5. Transfer USDC from buyer → treasury (fee)
    ///      6. Transfer token from seller → buyer
    function buy(uint256 listingId) external whenNotPaused nonReentrant {
        Listing storage listing = _listings[listingId];

        // ── Validate ──────────────────────────────────────────────────────────
        if (!listing.active) revert ListingNotActive(listingId);

        address seller = listing.seller;
        if (seller == msg.sender) revert CannotBuyOwnListing();

        // Cache all listing fields before any state changes
        address tokenContract = listing.tokenContract;
        uint256 tokenId = listing.tokenId;
        uint256 quantity = listing.quantity;
        uint256 salePrice = listing.askingPrice;
        TokenStandard standard = listing.standard;

        // Check buyer has approved enough USDC (fail fast, better UX)
        uint256 allowed = IERC20(USDC).allowance(msg.sender, address(this));
        if (allowed < salePrice) revert InsufficientUSDCAllowance(salePrice, allowed);

        // ── Effects ───────────────────────────────────────────────────────────
        // Mark inactive BEFORE any external calls (CEI pattern)
        listing.active = false;

        // ── Interactions ─────────────────────────────────────────────────────
        uint256 fee = _calculateFee(salePrice);
        uint256 sellerProceeds = salePrice - fee;

        // 1. USDC: buyer → seller (net of fee)
        IERC20(USDC).safeTransferFrom(msg.sender, seller, sellerProceeds);

        // 2. USDC: buyer → treasury (fee)
        if (fee > 0) {
            IERC20(USDC).safeTransferFrom(msg.sender, treasury, fee);
        }

        // 3. Token: seller → buyer
        _transferToken(standard, tokenContract, seller, msg.sender, tokenId, quantity);

        emit Sold(listingId, msg.sender, seller, tokenContract, tokenId, quantity, salePrice, fee);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    // ─── Admin functions ──────────────────────────────────────────────────────

    /// @inheritdoc ICedarXSwap
    function setFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        uint256 oldFee = feeBps;
        feeBps = newFeeBps;
        emit FeeUpdated(oldFee, newFeeBps);
    }

    /// @inheritdoc ICedarXSwap
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @inheritdoc ICedarXSwap
    function pause() external onlyOwner {
        _pause();
    }

    /// @inheritdoc ICedarXSwap
    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Calculate platform fee for a given sale price
    function _calculateFee(uint256 salePrice) internal view returns (uint256) {
        return (salePrice * feeBps) / BPS_DENOMINATOR;
    }

    /// @dev Dispatch a token transfer based on the token standard
    function _transferToken(
        TokenStandard standard,
        address tokenContract,
        address from,
        address to,
        uint256 tokenId,
        uint256 quantity
    ) internal {
        if (standard == TokenStandard.ERC721) {
            IERC721(tokenContract).safeTransferFrom(from, to, tokenId);
        } else if (standard == TokenStandard.ERC1155) {
            IERC1155(tokenContract).safeTransferFrom(from, to, tokenId, quantity, "");
        } else {
            // ERC-20: tokenId is ignored, transfer `quantity` tokens
            IERC20(tokenContract).safeTransferFrom(from, to, quantity);
        }
    }
}
