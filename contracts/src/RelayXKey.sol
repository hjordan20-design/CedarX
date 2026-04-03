// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {IRelayXKey} from "./interfaces/IRelayXKey.sol";

/// @title RelayXKey
/// @author RelayX
/// @notice ERC-721 contract for RelayX property reservation keys.
///
///         Each token represents a reservation key with on-chain metadata
///         (propertyId, unit, dates, price). Keys have three lifecycle states:
///         - Tradeable: default after mint, standard ERC-721 transfers enabled
///         - Redeemed: locked to wallet, transfers disabled
///         - Expired: burned by contract owner
///
///         Payment is in USDC, transferred from buyer to contract owner on mint.
///
/// @custom:security-contact security@relayx.io
contract RelayXKey is IRelayXKey, ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;
    using Strings for address;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The USDC token used for payment
    address public usdcAddress;

    /// @notice Auto-incrementing token ID counter (starts at 1)
    uint256 private _nextTokenId;

    /// @dev tokenId → KeyMetadata
    mapping(uint256 => KeyMetadata) private _keyMetadata;

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @param usdcAddress_ USDC token contract address
    /// @param owner_       Initial contract owner
    constructor(
        address usdcAddress_,
        address owner_
    ) ERC721("RelayX Key", "RXKEY") Ownable(owner_) {
        if (usdcAddress_ == address(0)) revert ZeroAddress();
        usdcAddress = usdcAddress_;
        _nextTokenId = 1;
    }

    // ─── External functions ──────────────────────────────────────────────────

    /// @inheritdoc IRelayXKey
    function mint(
        bytes32 propertyId,
        string calldata unit,
        uint256 startDate,
        uint256 endDate,
        uint256 priceUsdc
    ) external nonReentrant returns (uint256 tokenId) {
        // ── Validate ──────────────────────────────────────────────────────────
        if (startDate >= endDate) revert InvalidDateRange();
        if (priceUsdc == 0) revert ZeroPrice();

        // Check USDC allowance (fail fast for better UX)
        uint256 allowed = IERC20(usdcAddress).allowance(msg.sender, address(this));
        if (allowed < priceUsdc) revert InsufficientUSDCAllowance(priceUsdc, allowed);

        // ── Effects ───────────────────────────────────────────────────────────
        tokenId = _nextTokenId++;

        _keyMetadata[tokenId] = KeyMetadata({
            propertyId: propertyId,
            unit: unit,
            startDate: startDate,
            endDate: endDate,
            priceUsdc: priceUsdc,
            state: KeyState.Tradeable
        });

        // ── Interactions ──────────────────────────────────────────────────────
        // Transfer USDC from buyer to contract owner
        IERC20(usdcAddress).safeTransferFrom(msg.sender, owner(), priceUsdc);

        // Mint the NFT to the buyer
        _safeMint(msg.sender, tokenId);

        emit KeyMinted(tokenId, msg.sender, propertyId, unit, startDate, endDate, priceUsdc);
    }

    /// @inheritdoc IRelayXKey
    function redeem(uint256 tokenId) external {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner(tokenId, msg.sender);

        KeyMetadata storage meta = _keyMetadata[tokenId];
        if (meta.state != KeyState.Tradeable) revert TokenNotTradeable(tokenId);

        meta.state = KeyState.Redeemed;

        emit KeyRedeemed(tokenId, msg.sender);
    }

    /// @inheritdoc IRelayXKey
    function burn(uint256 tokenId) external onlyOwner {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);

        _keyMetadata[tokenId].state = KeyState.Expired;
        _burn(tokenId);

        emit KeyBurned(tokenId);
    }

    /// @inheritdoc IRelayXKey
    function setUsdcAddress(address newUsdcAddress) external onlyOwner {
        if (newUsdcAddress == address(0)) revert ZeroAddress();
        address oldAddress = usdcAddress;
        usdcAddress = newUsdcAddress;
        emit UsdcAddressUpdated(oldAddress, newUsdcAddress);
    }

    /// @inheritdoc IRelayXKey
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = IERC20(usdcAddress).balanceOf(address(this));
        if (balance > 0) {
            IERC20(usdcAddress).safeTransfer(owner(), balance);
            emit UsdcWithdrawn(owner(), balance);
        }
    }

    // ─── View functions ──────────────────────────────────────────────────────

    /// @inheritdoc IRelayXKey
    function getKeyMetadata(
        uint256 tokenId
    ) external view returns (KeyMetadata memory metadata) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);
        return _keyMetadata[tokenId];
    }

    /// @notice Returns on-chain JSON metadata for the token
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist(tokenId);

        KeyMetadata storage meta = _keyMetadata[tokenId];

        string memory stateStr;
        if (meta.state == KeyState.Tradeable) {
            stateStr = "Tradeable";
        } else if (meta.state == KeyState.Redeemed) {
            stateStr = "Redeemed";
        } else {
            stateStr = "Expired";
        }

        string memory json = string(
            abi.encodePacked(
                '{"name":"RelayX Key #',
                tokenId.toString(),
                '","description":"Property reservation key",',
                '"attributes":[',
                '{"trait_type":"propertyId","value":"',
                _bytes32ToHexString(meta.propertyId),
                '"},',
                '{"trait_type":"unit","value":"',
                meta.unit,
                '"},',
                '{"trait_type":"startDate","value":',
                meta.startDate.toString(),
                "},",
                '{"trait_type":"endDate","value":',
                meta.endDate.toString(),
                "},",
                '{"trait_type":"priceUsdc","value":',
                meta.priceUsdc.toString(),
                "},",
                '{"trait_type":"state","value":"',
                stateStr,
                '"}]}'
            )
        );

        return string(
            abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json)))
        );
    }

    // ─── Internal overrides ──────────────────────────────────────────────────

    /// @dev Override _update to prevent transfers of redeemed tokens.
    ///      Mints (from == address(0)) and burns (to == address(0)) are always allowed.
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow mints and burns unconditionally
        if (from != address(0) && to != address(0)) {
            // This is a transfer — block if redeemed
            if (_keyMetadata[tokenId].state == KeyState.Redeemed) {
                revert TokenNotTradeable(tokenId);
            }
        }

        return super._update(to, tokenId, auth);
    }

    /// @dev Required override for ERC721Enumerable
    function _increaseBalance(
        address account,
        uint128 value
    ) internal override {
        super._increaseBalance(account, value);
    }

    /// @dev Required override for ERC721Enumerable
    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    /// @dev Convert bytes32 to a "0x..." hex string
    function _bytes32ToHexString(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(66); // "0x" + 64 hex chars
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }
}
