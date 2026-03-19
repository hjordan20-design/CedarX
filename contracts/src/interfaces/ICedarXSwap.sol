// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICedarXSwap
/// @notice Interface for the CedarX atomic swap marketplace contract
/// @dev Supports ERC-721, ERC-1155, and ERC-20 token listings settled in USDC
interface ICedarXSwap {
    // ─── Enums ───────────────────────────────────────────────────────────────

    /// @notice The token standard of the listed asset
    enum TokenStandard {
        ERC721,
        ERC1155,
        ERC20
    }

    // ─── Structs ─────────────────────────────────────────────────────────────

    /// @notice A marketplace listing created by a seller
    struct Listing {
        /// @dev Seller's address
        address seller;
        /// @dev Token contract address
        address tokenContract;
        /// @dev Token ID for ERC-721 / ERC-1155 (ignored for ERC-20)
        uint256 tokenId;
        /// @dev Token amount for ERC-1155 / ERC-20 (always 1 for ERC-721)
        uint256 quantity;
        /// @dev Asking price in USDC (6-decimal units)
        uint256 askingPrice;
        /// @dev Token standard: ERC721, ERC1155, or ERC20
        TokenStandard standard;
        /// @dev Whether this listing is still active
        bool active;
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a seller creates a new listing
    event Listed(
        uint256 indexed listingId,
        address indexed seller,
        address indexed tokenContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 askingPrice,
        TokenStandard standard
    );

    /// @notice Emitted when a seller cancels their listing
    event Cancelled(uint256 indexed listingId, address indexed seller);

    /// @notice Emitted when a seller updates their listing price
    event PriceUpdated(uint256 indexed listingId, uint256 oldPrice, uint256 newPrice);

    /// @notice Emitted when a listing is purchased
    event Sold(
        uint256 indexed listingId,
        address indexed buyer,
        address indexed seller,
        address tokenContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 salePrice,
        uint256 fee
    );

    /// @notice Emitted when the platform fee is changed
    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);

    /// @notice Emitted when the treasury wallet is changed
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ZeroAddress();
    error ZeroQuantity();
    error ZeroPrice();
    error ListingNotActive(uint256 listingId);
    error NotSeller(uint256 listingId, address caller);
    error FeeTooHigh(uint256 requested, uint256 maximum);
    error SamePriceAsListed();
    error CannotBuyOwnListing();
    error InsufficientUSDCAllowance(uint256 required, uint256 allowed);

    // ─── Seller actions ───────────────────────────────────────────────────────

    /// @notice Create a new listing.
    /// @dev Caller must have approved this contract to transfer the token before calling.
    /// @param tokenContract The address of the ERC-721/1155/ERC-20 token contract
    /// @param tokenId       Token ID (ERC-721/1155). Pass 0 for ERC-20.
    /// @param quantity      Amount to list. Must be 1 for ERC-721.
    /// @param askingPrice   Price in USDC (6 decimals). Buyer pays this exact amount.
    /// @param standard      Token standard of the listed token
    /// @return listingId    The ID of the newly created listing
    function list(
        address tokenContract,
        uint256 tokenId,
        uint256 quantity,
        uint256 askingPrice,
        TokenStandard standard
    ) external returns (uint256 listingId);

    /// @notice Cancel an active listing. Only the original seller may cancel.
    /// @param listingId The ID of the listing to cancel
    function cancel(uint256 listingId) external;

    /// @notice Update the asking price of an active listing. Only the original seller may update.
    /// @param listingId  The ID of the listing to update
    /// @param newPrice   New asking price in USDC (6 decimals)
    function updatePrice(uint256 listingId, uint256 newPrice) external;

    // ─── Buyer actions ────────────────────────────────────────────────────────

    /// @notice Purchase an active listing.
    /// @dev Caller must have approved this contract to spend `askingPrice` USDC before calling.
    ///      The atomic sequence in a single transaction:
    ///        1. USDC transferred from buyer → seller (minus fee)
    ///        2. Fee transferred from buyer → treasury
    ///        3. Token transferred from seller → buyer
    ///      If any step fails the entire transaction reverts.
    /// @param listingId The ID of the listing to purchase
    function buy(uint256 listingId) external;

    // ─── View functions ───────────────────────────────────────────────────────

    /// @notice Returns a listing by its ID
    function getListing(uint256 listingId) external view returns (Listing memory);

    /// @notice The USDC token address (payment currency)
    function USDC() external view returns (address);

    /// @notice Platform fee in basis points (e.g., 150 = 1.5%)
    function feeBps() external view returns (uint256);

    /// @notice Maximum allowed fee in basis points (hard cap)
    function MAX_FEE_BPS() external view returns (uint256);

    /// @notice The wallet that receives platform fees
    function treasury() external view returns (address);

    /// @notice The next listing ID that will be assigned
    function nextListingId() external view returns (uint256);

    // ─── Admin functions ──────────────────────────────────────────────────────

    /// @notice Update the platform fee. Capped at MAX_FEE_BPS.
    /// @param newFeeBps New fee in basis points
    function setFee(uint256 newFeeBps) external;

    /// @notice Update the treasury wallet address
    /// @param newTreasury New treasury address. Must not be zero.
    function setTreasury(address newTreasury) external;

    /// @notice Pause the contract in an emergency (disables list and buy)
    function pause() external;

    /// @notice Unpause the contract
    function unpause() external;
}
