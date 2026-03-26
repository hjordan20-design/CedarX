/**
 * WalletProviders — lazy-loaded chunk that initializes wagmi + RainbowKit.
 *
 * Imported via React.lazy() in App.tsx so the wagmi / RainbowKit / viem /
 * WalletConnect SDK bundle (~600 KB min+gz) is split into its own chunk and
 * does NOT block the critical rendering path.
 */
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/config/chains";
import { WalletReadyProvider } from "./WalletReadyContext";

const rkTheme = lightTheme({
  accentColor: "#C4852A",
  accentColorForeground: "#FFFFFF",
  borderRadius: "none",
  fontStack: "system",
  overlayBlur: "small",
});

export default function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider theme={rkTheme}>
        <WalletReadyProvider>
          {children}
        </WalletReadyProvider>
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
