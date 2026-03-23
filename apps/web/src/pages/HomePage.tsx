import { useState, useCallback } from "react";
import { Hero } from "@/components/home/Hero";
import { HomeAssetGrid } from "@/components/home/HomeAssetGrid";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";
import type { AssetFilters } from "@/lib/types";

const DEFAULT_FILTERS: AssetFilters = { sort: "newest", listedOnly: true };

export function HomePage() {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);

  const handleFilterChange = useCallback((next: AssetFilters) => {
    setFilters(next);
  }, []);

  return (
    <>
      <Hero filters={filters} onFilterChange={handleFilterChange} />
      <HomeAssetGrid filters={filters} />
      <CategoryCards />
      <HowItWorks />
    </>
  );
}
