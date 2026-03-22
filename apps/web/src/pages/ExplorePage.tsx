import { useState, useCallback } from "react";
import { useAssets } from "@/hooks/useAssets";
import { FilterBar } from "@/components/explore/FilterBar";
import { AssetGrid } from "@/components/explore/AssetGrid";
import { Pagination } from "@/components/explore/Pagination";
import type { AssetFilters } from "@/lib/types";

const PAGE_SIZE = 24;

const DEFAULT_FILTERS: AssetFilters = {
  sort: "newest",
  page: 1,
  limit: PAGE_SIZE,
};

export function ExplorePage() {
  const [filters, setFilters] = useState<AssetFilters>(DEFAULT_FILTERS);

  const { data, isLoading, isError, isFetching } = useAssets(filters);

  const handleFilterChange = useCallback((next: AssetFilters) => {
    setFilters({ ...next, limit: PAGE_SIZE });
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="max-w-[1440px] mx-auto px-6 pb-24" style={{ paddingTop: "calc(66px + 48px)" }}>
      {/* Page header */}
      <div style={{ marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            letterSpacing: "-0.02em",
            color: "#1C1710",
            marginBottom: "8px",
          }}
        >
          Explore assets
        </h1>
        <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 300, fontSize: "14px", color: "rgba(28,23,16,0.55)" }}>
          Browse tokenized real-world assets across land, luxury goods, and collectibles.
        </p>
      </div>

      {/* Divider */}
      <div className="divider mb-8" />

      {/* Filter bar */}
      <div className="mb-8">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          total={data?.pagination.total}
        />
      </div>

      {/* Asset grid */}
      <AssetGrid
        assets={data?.data}
        isLoading={isLoading}
        isError={isError}
        isFetching={isFetching && !isLoading}
      />

      {/* Pagination */}
      {data && (
        <Pagination
          page={filters.page ?? 1}
          total={data.pagination.total}
          limit={PAGE_SIZE}
          onChange={handlePageChange}
        />
      )}
    </div>
  );
}
