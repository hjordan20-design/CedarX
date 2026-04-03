import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined;

function alchemyRpc(network: string) {
  return alchemyKey
    ? `https://${network}.g.alchemy.com/v2/${alchemyKey}`
    : undefined;
}

export const wagmiConfig = getDefaultConfig({
  appName: "RelayX",
  appDescription: "Keys to furnished rentals.",
  appUrl: "https://relayx.io",
  projectId: (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string) || "relayx-dev",
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(alchemyRpc("eth-mainnet")),
    [sepolia.id]: http(alchemyRpc("eth-sepolia")),
  },
});

export { mainnet, sepolia };
