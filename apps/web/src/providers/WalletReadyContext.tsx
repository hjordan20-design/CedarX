import { createContext, useContext } from "react";

/**
 * Becomes `true` only once WalletProviders (WagmiProvider + RainbowKitProvider)
 * have mounted. Components that call wagmi/rainbowkit hooks must be rendered
 * conditionally on this value being true.
 */
const WalletReadyContext = createContext(false);

export const useWalletReady = () => useContext(WalletReadyContext);

export function WalletReadyProvider({ children }: { children: React.ReactNode }) {
  return (
    <WalletReadyContext.Provider value={true}>
      {children}
    </WalletReadyContext.Provider>
  );
}
