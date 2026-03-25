import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { FilterBar } from "@/components/explore/FilterBar";
import { AssetGrid } from "@/components/explore/AssetGrid";
import { Pagination } from "@/components/explore/Pagination";
import type { AssetFilters, Category } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 24;
const VALID_PAGE_SIZES = new Set([24, 48, 100, 200]);
const VALID_CATEGORIES = new Set<string>(["real-estate", "luxury-goods", "art", "collectibles", "watches"]);

function categoryFromParam(param: string | null): Category | undefined {
  return param && VALID_CATEGORIES.has(param) ? (param as Category) : undefined;
}

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL is the single source of truth for all filter state.
  // Deriving filters here means back/forward navigation automatically restores them.
  // listingFilter defaults to "listed"; only stored in URL when changed.
  const rawListingFilter = searchParams.get("listingFilter");
  // Backward-compat: old ?listedOnly=false links map to "all"
  const legacyListedOff = searchParams.get("listedOnly") === "false";
  const listingFilter: AssetFilters["listingFilter"] =
    rawListingFilter === "unlisted" || rawListingFilter === "all" || rawListingFilter === "listed"
      ? rawListingFilter
      : legacyListedOff ? "all" : "listed";

  const rawLimit = Number(searchParams.get("limit"));
  const pageSize = VALID_PAGE_SIZES.has(rawLimit) ? rawLimit : DEFAULT_PAGE_SIZE;

  const filters: AssetFilters = {
    sort: (searchParams.get("sort") as AssetFilters["sort"]) ?? "newest",
    page: Number(searchParams.get("page")) || 1,
    limit: pageSize,
    listingFilter,
    category: categoryFromParam(searchParams.get("category")),
    search: searchParams.get("search") ?? undefined,
  };

  const { data, isLoading, isError, isFetching } = useAssets(filters);

  const handleFilterChange = useCallback((next: AssetFilters) => {
    const prevCategory = categoryFromParam(searchParams.get("category"));
    // Only push a new history entry when the category changes — that's what
    // the back button should undo. Sort/search/page changes replace in-place.
    const categoryChanged = next.category !== prevCategory;

    setSearchParams(
      (params) => {
        if (next.category) params.set("category", next.category);
        else params.delete("category");

        if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
        else params.delete("sort");

        if (next.limit && next.limit !== DEFAULT_PAGE_SIZE) params.set("limit", String(next.limit));
        else params.delete("limit");

        if (next.search) params.set("search", next.search);
        else params.delete("search");

        // Only store listingFilter when it differs from the default ("listed")
        if (next.listingFilter && next.listingFilter !== "listed") params.set("listingFilter", next.listingFilter);
        else params.delete("listingFilter");
        // Clean up old listedOnly param if present
        params.delete("listedOnly");

        // Reset to page 1 whenever filters change
        params.delete("page");
        return params;
      },
      { replace: !categoryChanged },
    );
  }, [searchParams, setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    setSearchParams(
      (params) => { params.set("page", String(page)); return params; },
      { replace: true },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

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
          Browse tokenized real-world assets across real estate, collectibles, and luxury goods.
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
          limit={pageSize}
          onChange={handlePageChange}
        />
      )}
    </div>
  );
}
