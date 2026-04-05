import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hero } from "@/components/home/Hero";
import { StatsBar } from "@/components/home/StatsBar";
import { CategoryLanes } from "@/components/home/CategoryLanes";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";
import { EmailCapture } from "@/components/home/EmailCapture";
import { fetchHomepage } from "@/lib/api";
import type { MarketStats } from "@/lib/types";

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
  const queryClient = useQueryClient();

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

  // Pre-populate child caches so StatsBar renders from homepage response
  useEffect(() => {
    if (!homepage) return;
    queryClient.setQueryData<MarketStats>(["stats"], homepage.stats);
  }, [homepage, queryClient]);

  return (
    <>
      <Hero />
      <StatsBar />
      <CategoryLanes />
      <CategoryCards />
      <HowItWorks />
      <EmailCapture />
    </>
  );
}
