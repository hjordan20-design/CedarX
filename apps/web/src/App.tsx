import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { HomePage } from "@/pages/HomePage";
import { PageSpinner } from "@/components/common/LoadingStates";

// ─── Wallet providers — lazy-loaded separate chunk ───────────────────────────
// Defers wagmi / RainbowKit / viem / WalletConnect (~600 KB min) off the
// critical rendering path. The chunk loads in parallel with React rendering.
const WalletProviders = React.lazy(() => import("@/providers/WalletProviders"));

// ─── Route-level code splitting ──────────────────────────────────────────────
// HomePage is in the main bundle (first paint). All other pages load on demand.
const ExplorePage     = React.lazy(() => import("@/pages/ExplorePage").then((m) => ({ default: m.ExplorePage })));
const SellPage        = React.lazy(() => import("@/pages/SellPage").then((m) => ({ default: m.SellPage })));
const AboutPage       = React.lazy(() => import("@/pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const AssetDetailPage = React.lazy(() => import("@/pages/AssetDetailPage").then((m) => ({ default: m.AssetDetailPage })));
const TosPage         = React.lazy(() => import("@/pages/TosPage").then((m) => ({ default: m.TosPage })));
const ActivityPage    = React.lazy(() => import("@/pages/ActivityPage").then((m) => ({ default: m.ActivityPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

// App routes rendered in the Suspense fallback (no wallet) and inside
// WalletProviders (wallet ready). TanStack Query deduplicates the API calls.
function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<HomePage />} />
        <Route path="/explore"    element={<Suspense fallback={<PageSpinner />}><ExplorePage /></Suspense>} />
        <Route path="/sell"       element={<Suspense fallback={<PageSpinner />}><SellPage /></Suspense>} />
        <Route path="/about"      element={<Suspense fallback={<PageSpinner />}><AboutPage /></Suspense>} />
        <Route path="/assets/:id" element={<Suspense fallback={<PageSpinner />}><AssetDetailPage /></Suspense>} />
        <Route path="/tos"        element={<Suspense fallback={<PageSpinner />}><TosPage /></Suspense>} />
        <Route path="/activity"   element={<Suspense fallback={<PageSpinner />}><ActivityPage /></Suspense>} />
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        {/*
          Suspense fallback renders the full app WITHOUT wallet providers.
          Header shows a placeholder "Connect wallet" button (no wagmi hooks).
          The wallet chunk loads in parallel — users see it mount within
          100-200ms on a fast connection, with no visible flash.
        */}
        <Suspense fallback={<AppRoutes />}>
          <WalletProviders>
            <AppRoutes />
          </WalletProviders>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
