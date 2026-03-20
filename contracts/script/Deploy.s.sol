// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {CedarXSwap} from "../src/CedarXSwap.sol";

/// @notice Deployment script for CedarXSwap.
///
/// Usage — Sepolia testnet:
///   forge script script/Deploy.s.sol:DeployCedarXSwap \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $ETHERSCAN_API_KEY \
///     -vvvv
///
/// Usage — Ethereum mainnet (after audit):
///   forge script script/Deploy.s.sol:DeployCedarXSwap \
///     --rpc-url $MAINNET_RPC_URL \
///     --broadcast \
///     --verify \
///     --ledger \
///     --sender $DEPLOYER_ADDRESS \
///     --etherscan-api-key $ETHERSCAN_API_KEY \
///     -vvvv
///
/// Required environment variables:
///   DEPLOYER_PRIVATE_KEY   — deployer's private key (testnet only; use --ledger on mainnet)
///   CEDARX_TREASURY        — wallet that receives platform fees
///   CEDARX_OWNER           — contract owner (should be a multisig on mainnet)
///   CEDARX_FEE_BPS         — platform fee in basis points (e.g., 150 = 1.5%)
///
/// Chain-specific USDC addresses are resolved automatically.
contract DeployCedarXSwap is Script {
    // ─── USDC addresses ───────────────────────────────────────────────────────
    address constant USDC_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    // Circle's official USDC on Sepolia:
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        // ── Load config from environment ──────────────────────────────────────
        address treasury = vm.envAddress("CEDARX_TREASURY");
        address owner = vm.envAddress("CEDARX_OWNER");
        uint256 feeBps = vm.envUint("CEDARX_FEE_BPS");

        require(treasury != address(0), "Deploy: CEDARX_TREASURY not set");
        require(owner != address(0), "Deploy: CEDARX_OWNER not set");
        require(feeBps <= 500, "Deploy: fee exceeds 5% cap");

        // ── Resolve USDC address for this chain ───────────────────────────────
        address usdcAddress;
        uint256 chainId = block.chainid;

        if (chainId == 1) {
            usdcAddress = USDC_MAINNET;
        } else if (chainId == 11155111) {
            usdcAddress = USDC_SEPOLIA;
        } else {
            revert("Deploy: unsupported chain — add USDC address for this network");
        }

        // ── Deploy ────────────────────────────────────────────────────────────
        console2.log("=== CedarXSwap Deployment ===");
        console2.log("Chain ID:    ", chainId);
        console2.log("USDC:        ", usdcAddress);
        console2.log("Treasury:    ", treasury);
        console2.log("Owner:       ", owner);
        console2.log("Fee (bps):   ", feeBps);
        console2.log("Fee (pct):   ", feeBps * 100 / 10000, ".");
        console2.log("");

        vm.startBroadcast();

        CedarXSwap swap = new CedarXSwap(usdcAddress, treasury, feeBps, owner);

        vm.stopBroadcast();

        // ── Post-deployment checks ────────────────────────────────────────────
        console2.log("CedarXSwap deployed at:", address(swap));
        console2.log("");

        require(swap.USDC() == usdcAddress, "Post-deploy: wrong USDC");
        require(swap.treasury() == treasury, "Post-deploy: wrong treasury");
        require(swap.owner() == owner, "Post-deploy: wrong owner");
        require(swap.feeBps() == feeBps, "Post-deploy: wrong fee");
        require(swap.nextListingId() == 1, "Post-deploy: bad initial listing ID");

        console2.log("All post-deployment checks passed.");
        console2.log("");
        console2.log("Next steps:");
        console2.log("  1. Verify contract on Etherscan (--verify flag handles this)");
        console2.log("  2. Record address in packages/shared-types/src/whitelist.ts");
        console2.log("  3. Set VITE_CEDARX_SWAP_CONTRACT_ADDRESS in frontend .env");
        console2.log("  4. Set CEDARX_SWAP_CONTRACT_ADDRESS in indexer .env");
        if (chainId == 1) {
            console2.log("  5. Transfer ownership to multisig via swap.transferOwnership()");
        }
    }
}
