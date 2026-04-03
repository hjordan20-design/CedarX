import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/config/chains";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { PropertyDetailPage } from "@/pages/PropertyDetailPage";
import { MyKeysPage } from "@/pages/MyKeysPage";
import { MarketPage } from "@/pages/MarketPage";
import { SellPage } from "@/pages/SellPage";
import { RedemptionPage } from "@/pages/RedemptionPage";
import { LandlordPage } from "@/pages/LandlordPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const rkTheme = darkTheme({
  accentColor: "#0D9488",
  accentColorForeground: "#FFFFFF",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rkTheme}>
          <BrowserRouter>
            <ScrollToTop />
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/properties/:id" element={<PropertyDetailPage />} />
                <Route path="/my-keys" element={<MyKeysPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/sell" element={<SellPage />} />
                <Route path="/redeem/:id" element={<RedemptionPage />} />
                <Route path="/landlords" element={<LandlordPage />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
