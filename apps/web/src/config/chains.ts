import { http } from "wagmi";
import { mainnet, sepolia, polygon } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Polygon key (VITE_ALCHEMY_API_KEY) — must be a Polygon-enabled Alchemy app.
// Ethereum key (VITE_ALCHEMY_ETH_API_KEY) — Ethereum-enabled Alchemy app.
// Falls back to the same key when not set (works if using a multi-chain key).
const alchemyPolyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;
const alchemyEthKey  = (import.meta.env.VITE_ALCHEMY_ETH_API_KEY || alchemyPolyKey) as string | undefined;

function alchemyRpc(network: string, key: string | undefined) {
  return key ? `https://${network}.g.alchemy.com/v2/${key}` : undefined;
}

export const wagmiConfig = getDefaultConfig({
  appName: "CedarX",
  appDescription: "The real-world asset marketplace.",
  appUrl: "https://cedarx.io",
  projectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || "cedarx-dev",
  chains: [mainnet, polygon, sepolia],
  transports: {
    [mainnet.id]: http(alchemyRpc("eth-mainnet",      alchemyEthKey)),
    [polygon.id]: http(alchemyRpc("polygon-mainnet",  alchemyPolyKey)),
    [sepolia.id]: http(alchemyRpc("eth-sepolia",      alchemyEthKey)),
  },
});

export { mainnet, polygon, sepolia };
