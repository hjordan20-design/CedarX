import { useState, useCallback } from "react";
import { Hero } from "@/components/home/Hero";
import { HomeAssetGrid } from "@/components/home/HomeAssetGrid";
import { CategoryCards } from "@/components/home/CategoryCards";
import { HowItWorks } from "@/components/home/HowItWorks";
import type { AssetFilters } from "@/lib/types";

const DEFAULT_FILTERS: AssetFilters = { sort: "newest" };

/**
 * Thin amber gradient rule — peaks in the middle, fades to transparent at both ends.
 * Used between same-color sections to add subtle warmth without a hard line.
 */
function AmberDivider() {
  return (
    <div
      aria-hidden="true"
      style={{
        height: "1px",
        background: "linear-gradient(to right, transparent 0%, rgba(196,133,42,0.20) 35%, rgba(196,133,42,0.20) 65%, transparent 100%)",
      }}
    />
  );
}

/**
 * 120px gradient zone — blends the asset grid section (#0D0D0C) into the
 * CategoryCards section (#0A0A09), with an amber centerline visible at mid-fade.
 * Prevents a hard colour seam between the two sections.
 */
function SectionFade() {
  return (
    <div
      aria-hidden="true"
      style={{ height: "120px", position: "relative" }}
    >
      {/* Colour gradient — hero bg → section bg */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, #0D0D0C 0%, #0A0A09 100%)",
        }}
      />
      {/* Amber centerline at the visual midpoint */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: "1px",
          transform: "translateY(-50%)",
          background: "linear-gradient(to right, transparent 0%, rgba(196,133,42,0.16) 35%, rgba(196,133,42,0.16) 65%, transparent 100%)",
        }}
      />
    </div>
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
      <SectionFade />
      <CategoryCards />
      <HowItWorks />
    </>
  );
}
