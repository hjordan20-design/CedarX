import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { FilterBar } from "@/components/explore/FilterBar";
import { AssetGrid } from "@/components/explore/AssetGrid";
import { Pagination } from "@/components/explore/Pagination";
import type { AssetFilters, Category } from "@/lib/types";

const PAGE_SIZE = 24;
const VALID_CATEGORIES = new Set<string>(["real-estate", "luxury-goods", "art", "collectibles"]);

function categoryFromParam(param: string | null): Category | undefined {
  return param && VALID_CATEGORIES.has(param) ? (param as Category) : undefined;
}

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<AssetFilters>(() => ({
    sort: "newest",
    page: 1,
    limit: PAGE_SIZE,
    listedOnly: true,
    category: categoryFromParam(searchParams.get("category")),
  }));

  const { data, isLoading, isError, isFetching } = useAssets(filters);

  // Sync URL → state when the user navigates back/forward.
  useEffect(() => {
    const cat = categoryFromParam(searchParams.get("category"));
    setFilters((prev) => {
      if (prev.category === cat) return prev;
      return { ...prev, category: cat, page: 1 };
    });
  }, [searchParams]);

  const handleFilterChange = useCallback((next: AssetFilters) => {
    const updated: AssetFilters = { ...next, limit: PAGE_SIZE };
    setFilters(updated);
    // Persist category in URL so the back button restores the filter.
    setSearchParams(
      (params) => {
        if (updated.category) params.set("category", updated.category);
        else params.delete("category");
        return params;
      },
      { replace: false },
    );
  }, [setSearchParams]);

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
        <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 300, fontSize: "17px", color: "rgba(28,23,16,0.50)" }}>
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
        total={data?.pagination.total}
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
