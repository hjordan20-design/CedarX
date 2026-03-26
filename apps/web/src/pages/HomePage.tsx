import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hero } from "@/components/home/Hero";
import { StatsBar } from "@/components/home/StatsBar";
import { HomeAssetGrid } from "@/components/home/HomeAssetGrid";
import { TrendingSection } from "@/components/home/TrendingSection";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";
import { EmailCapture } from "@/components/home/EmailCapture";
import { fetchHomepage } from "@/lib/api";
import type { AssetFilters, Paginated, Asset, MarketStats } from "@/lib/types";

const DEFAULT_FILTERS: AssetFilters = { sort: "newest", listingFilter: "listed" };
const HOMEPAGE_CACHE_KEY = "cedar-homepage-cache";

function readCachedHomepage() {
  try {
    const raw = localStorage.getItem(HOMEPAGE_CACHE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}

function writeCachedHomepage(data: unknown) {
  try { localStorage.setItem(HOMEPAGE_CACHE_KEY, JSON.stringify(data)); } catch { /* blocked */ }
}

export function HomePage() {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);
  const queryClient = useQueryClient();

  // Single combined request — replaces fetchStats + fetchAssets + fetchTrending
  const { data: homepage } = useQuery({
    queryKey: ["homepage"],
    queryFn: async () => {
      const result = await fetchHomepage();
      writeCachedHomepage(result);
      return result;
    },
    staleTime: 60_000,
    placeholderData: readCachedHomepage,
  });

  // Pre-populate the TanStack Query cache for child components so they don't
  // fire separate network requests (stats, trending, assets are already loaded).
  useEffect(() => {
    if (!homepage) return;
    queryClient.setQueryData<MarketStats>(["stats"], homepage.stats);
    queryClient.setQueryData<{ data: Asset[] }>(["trending-assets"], { data: homepage.trending });
    // Pre-populate the default home listing query (newest listed, limit 8)
    const defaultKey = { sort: "newest", listingFilter: "listed", limit: 8 };
    queryClient.setQueryData<Paginated<Asset>>(["assets", defaultKey], homepage.listings);
  }, [homepage, queryClient]);

  const handleFilterChange = useCallback((next: AssetFilters) => {
    setFilters(next);
  }, []);

  return (
    <>
      <Hero filters={filters} onFilterChange={handleFilterChange} />
      <StatsBar />
      <HomeAssetGrid filters={filters} />
      <TrendingSection />
      <CategoryCards />
      <HowItWorks />
      <EmailCapture />
    </>
  );
}
