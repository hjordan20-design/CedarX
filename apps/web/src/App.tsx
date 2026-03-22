import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/config/chains";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { ExplorePage } from "@/pages/ExplorePage";
import { AboutPage } from "@/pages/AboutPage";
import { AssetDetailPage } from "@/pages/AssetDetailPage";
import { TosPage } from "@/pages/TosPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// RainbowKit light theme — CSS custom property overrides in globals.css do the heavy lifting
const rkTheme = lightTheme({
  accentColor: "#C4852A",
  accentColorForeground: "#FFFFFF",
  borderRadius: "none",
  fontStack: "system",
  overlayBlur: "small",
});

// Scrolls to top on every route change
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
                <Route path="/"             element={<HomePage />} />
                <Route path="/explore"      element={<ExplorePage />} />
                <Route path="/about"        element={<AboutPage />} />
                <Route path="/assets/:id"   element={<AssetDetailPage />} />
                <Route path="/tos"          element={<TosPage />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
