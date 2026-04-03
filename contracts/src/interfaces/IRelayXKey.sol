// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IRelayXKey
/// @notice Interface for the RelayX ERC-721 key contract
/// @dev Each token represents a property reservation key with metadata and state management
interface IRelayXKey {
    // ─── Enums ───────────────────────────────────────────────────────────────

    /// @notice The lifecycle state of a key
    enum KeyState {
        Tradeable, // Default after mint — standard ERC-721 transfers allowed
        Redeemed, // Locked to wallet — transfers disabled
        Expired // Burned — token no longer exists
    }

    // ─── Structs ─────────────────────────────────────────────────────────────

    /// @notice Metadata stored on-chain for each minted key
    struct KeyMetadata {
        bytes32 propertyId;
        string unit;
        uint256 startDate;
        uint256 endDate;
        uint256 priceUsdc;
        KeyState state;
    }

    // ─── Events ──────────────────────────────────────────────────────────────

    /// @notice Emitted when a new key is minted
    event KeyMinted(
        uint256 indexed tokenId,
        address indexed buyer,
        bytes32 indexed propertyId,
        string unit,
        uint256 startDate,
        uint256 endDate,
        uint256 priceUsdc
    );

    /// @notice Emitted when a key is redeemed (locked)
    event KeyRedeemed(uint256 indexed tokenId, address indexed owner);

    /// @notice Emitted when a key is burned (expired)
    event KeyBurned(uint256 indexed tokenId);

    /// @notice Emitted when the USDC address is updated
    event UsdcAddressUpdated(address indexed oldAddress, address indexed newAddress);

    /// @notice Emitted when USDC is withdrawn by the owner
    event UsdcWithdrawn(address indexed to, uint256 amount);

    // ─── Errors ──────────────────────────────────────────────────────────────

    error ZeroAddress();
    error InvalidDateRange();
    error ZeroPrice();
    error TokenNotTradeable(uint256 tokenId);
    error NotTokenOwner(uint256 tokenId, address caller);
    error TokenDoesNotExist(uint256 tokenId);
    error InsufficientUSDCAllowance(uint256 required, uint256 allowed);

    // ─── Functions ───────────────────────────────────────────────────────────

    /// @notice Mint a new key NFT. Buyer pays priceUsdc in USDC.
    /// @param propertyId  Unique identifier for the property
    /// @param unit        Unit identifier (e.g., "Suite 101")
    /// @param startDate   Check-in date as unix timestamp
    /// @param endDate     Check-out date as unix timestamp
    /// @param priceUsdc   Price in USDC (6-decimal units)
    /// @return tokenId    The ID of the newly minted token
    function mint(
        bytes32 propertyId,
        string calldata unit,
        uint256 startDate,
        uint256 endDate,
        uint256 priceUsdc
    ) external returns (uint256 tokenId);

    /// @notice Redeem a key, locking it to the current wallet. Only the token owner can call.
    /// @param tokenId The token to redeem
    function redeem(uint256 tokenId) external;

    /// @notice Burn an expired key. Only the contract owner can call.
    /// @param tokenId The token to burn
    function burn(uint256 tokenId) external;

    /// @notice Update the USDC token address. Only the contract owner can call.
    /// @param newUsdcAddress The new USDC contract address
    function setUsdcAddress(address newUsdcAddress) external;

    /// @notice Withdraw accumulated USDC to the contract owner.
    function withdraw() external;

    /// @notice Get the metadata for a given token
    /// @param tokenId The token to query
    /// @return metadata The key metadata struct
    function getKeyMetadata(uint256 tokenId) external view returns (KeyMetadata memory metadata);
}
