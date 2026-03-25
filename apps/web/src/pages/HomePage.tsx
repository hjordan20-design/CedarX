import { useState, useCallback } from "react";
import { Hero } from "@/components/home/Hero";
import { StatsBar } from "@/components/home/StatsBar";
import { HomeAssetGrid } from "@/components/home/HomeAssetGrid";
import { TrendingSection } from "@/components/home/TrendingSection";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";
import { EmailCapture } from "@/components/home/EmailCapture";
import type { AssetFilters } from "@/lib/types";

const DEFAULT_FILTERS: AssetFilters = { sort: "newest", listingFilter: "listed" };

export function HomePage() {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);

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
