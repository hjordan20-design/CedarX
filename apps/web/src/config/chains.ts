import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;

export const wagmiConfig = getDefaultConfig({
  appName: "CedarX",
  appDescription: "The real asset marketplace.",
  appUrl: "https://cedarx.io",
  projectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || "cedarx-dev",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(
      alchemyKey
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
        : undefined
    ),
    [sepolia.id]: http(
      alchemyKey
        ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
        : undefined
    ),
  },
});
