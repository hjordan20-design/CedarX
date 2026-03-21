import { http } from "wagmi";
import { mainnet, sepolia, polygon } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;

function alchemyRpc(network: string) {
  return alchemyKey
    ? `https://${network}.g.alchemy.com/v2/${alchemyKey}`
    : undefined;
}

export const wagmiConfig = getDefaultConfig({
  appName: "CedarX",
  appDescription: "The real-world asset marketplace.",
  appUrl: "https://cedarx.io",
  projectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || "cedarx-dev",
  chains: [mainnet, polygon, sepolia],
  transports: {
    [mainnet.id]: http(alchemyRpc("eth-mainnet")),
    [polygon.id]: http(alchemyRpc("polygon-mainnet")),
    [sepolia.id]: http(alchemyRpc("eth-sepolia")),
  },
});

export { mainnet, polygon, sepolia };
