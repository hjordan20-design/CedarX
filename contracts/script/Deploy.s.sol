// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {RelayXKey} from "../src/RelayXKey.sol";

/// @notice Deployment script for RelayXKey.
///
/// Usage — Sepolia testnet:
///   forge script script/Deploy.s.sol:DeployRelayXKey \
///     --rpc-url $SEPOLIA_RPC_URL \
///     --broadcast \
///     --verify \
///     --etherscan-api-key $ETHERSCAN_API_KEY \
///     -vvvv
///
/// Required environment variables:
///   DEPLOYER_PRIVATE_KEY  — deployer's private key (testnet only; use --ledger on mainnet)
///   RELAYX_OWNER          — contract owner (should be a multisig on mainnet)
contract DeployRelayXKey is Script {
    // ─── USDC addresses ───────────────────────────────────────────────────────
    address constant USDC_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;

    function run() external {
        address owner = vm.envAddress("RELAYX_OWNER");
        require(owner != address(0), "Deploy: RELAYX_OWNER not set");

        // ── Resolve USDC for chain ────────────────────────────────────────────
        address usdcAddress;
        uint256 chainId = block.chainid;

        if (chainId == 1) {
            usdcAddress = USDC_MAINNET;
        } else if (chainId == 11155111) {
            usdcAddress = USDC_SEPOLIA;
        } else {
            revert("Deploy: unsupported chain — add USDC address");
        }

        console2.log("=== RelayXKey Deployment ===");
        console2.log("Chain ID:", chainId);
        console2.log("USDC:    ", usdcAddress);
        console2.log("Owner:   ", owner);

        vm.startBroadcast();

        RelayXKey key = new RelayXKey(usdcAddress, owner);

        vm.stopBroadcast();

        console2.log("RelayXKey deployed at:", address(key));
        console2.log("");
        console2.log("Next steps:");
        console2.log("  1. Set VITE_RELAYX_KEY_CONTRACT_ADDRESS in frontend .env");
        console2.log("  2. Record address in deployment docs");
        if (chainId == 1) {
            console2.log("  3. Transfer ownership to multisig");
        }
    }
}
