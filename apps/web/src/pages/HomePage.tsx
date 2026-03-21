import { useState, useCallback } from "react";
import { Hero } from "@/components/home/Hero";
import { HomeAssetGrid } from "@/components/home/HomeAssetGrid";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";
import type { AssetFilters } from "@/lib/types";

const DEFAULT_FILTERS: AssetFilters = { sort: "newest" };

/** Amber gradient rule — glows at centre, fades to transparent at both ends */
function AmberDivider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: "1px",
        background: "linear-gradient(to right, transparent 0%, rgba(196,133,42,0.22) 35%, rgba(196,133,42,0.22) 65%, transparent 100%)",
      }}
    />
  );
}

export function HomePage() {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);

  const handleFilterChange = useCallback((next: AssetFilters) => {
    setFilters(next);
  }, []);

  return (
    <>
      <Hero filters={filters} onFilterChange={handleFilterChange} />
      <AmberDivider />
      <HomeAssetGrid filters={filters} />
      <AmberDivider />
      <CategoryCards />
      <HowItWorks />
    </>
  );
}
