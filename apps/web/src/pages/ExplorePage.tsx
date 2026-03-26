import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { FilterBar } from "@/components/explore/FilterBar";
import { AssetGrid } from "@/components/explore/AssetGrid";
import { Pagination } from "@/components/explore/Pagination";
import type { AssetFilters, Category } from "@/lib/types";

const CATEGORY_INFO: Record<string, { title: string; description: string }> = {
  "real-estate": {
    title: "Real Estate",
    description:
      "Tokenized property deeds and fractional real estate. From raw land parcels to residential homes.",
  },
  collectibles: {
    title: "Collectibles",
    description:
      "Authenticated physical collectibles — sports memorabilia, rare coins, and trading cards.",
  },
  "luxury-goods": {
    title: "Luxury Goods",
    description:
      "Authenticated watches, jewelry, and handbags. Each token is backed by a physically verified item.",
  },
  watches: {
    title: "Watches",
    description: "Luxury timepieces from top brands. Authenticated and tokenized on-chain.",
  },
  art: {
    title: "Art",
    description:
      "Tokenized physical artwork from galleries and private collections. Coming soon.",
  },
};

const DEFAULT_PAGE_SIZE = 24;
const VALID_PAGE_SIZES = new Set([24, 48, 100, 200]);
const VALID_CATEGORIES = new Set<string>(["real-estate", "luxury-goods", "art", "collectibles", "watches"]);

function categoryFromParam(param: string | null): Category | undefined {
  return param && VALID_CATEGORIES.has(param) ? (param as Category) : undefined;
}

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // In-memory cursor map: page number → cursor for that page's starting point.
  // Keyed by `${filterSignature}:${page}` so it auto-invalidates when filters change.
  // Not persisted in the URL — cursor navigation is a perf optimisation, not state.
  const cursorMapRef = useRef<Map<string, string>>(new Map());

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

  const sort = (searchParams.get("sort") as AssetFilters["sort"]) ?? "newest";
  const page = Number(searchParams.get("page")) || 1;
  const category = categoryFromParam(searchParams.get("category"));
  const search = searchParams.get("search") ?? undefined;

  // Build a stable signature for the current filter set (excluding page).
  // Used to scope the cursor map so stale cursors don't leak across filter changes.
  const filterSig = `${sort}|${listingFilter}|${category ?? ""}|${search ?? ""}|${pageSize}`;

  // Look up the cursor for the current page (populated after user navigates forward).
  const cursor = cursorMapRef.current.get(`${filterSig}:${page}`);

  const filters: AssetFilters = {
    sort,
    page,
    limit: pageSize,
    listingFilter,
    category,
    search,
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading, isError, error, isFetching } = useAssets(filters);

  // After each successful fetch, store the nextCursor for the following page.
  // This is a ref write — no re-render needed.
  if (data?.pagination.nextCursor) {
    cursorMapRef.current.set(`${filterSig}:${page + 1}`, data.pagination.nextCursor);
  }

  const handleFilterChange = useCallback((next: AssetFilters) => {
    // Clear cursor map whenever filters change — cursors belong to a specific
    // filter combination and must not carry over.
    cursorMapRef.current.clear();

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
    <div className="max-w-[1440px] mx-auto px-6 pb-24 pt-[82px] sm:pt-[114px]">
      {/* Page header — switches to category info when a category is selected */}
      <div className="mb-3 sm:mb-10">
        {filters.category && CATEGORY_INFO[filters.category] ? (
          <>
            <h1
              style={{
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 300,
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.02em",
                color: "var(--cedar-text)",
                marginBottom: "8px",
              }}
            >
              {CATEGORY_INFO[filters.category].title}
            </h1>
            <p className="hidden sm:block" style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 300, fontSize: "17px", color: "var(--cedar-muted)" }}>
              {CATEGORY_INFO[filters.category].description}
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 300,
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                letterSpacing: "-0.02em",
                color: "var(--cedar-text)",
                marginBottom: "8px",
              }}
            >
              Explore assets
            </h1>
            <p className="hidden sm:block" style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 300, fontSize: "17px", color: "var(--cedar-muted)" }}>
              Browse tokenized real-world assets across real estate, collectibles, and luxury goods.
            </p>
          </>
        )}
      </div>

      {/* Divider — hidden on mobile */}
      <div className="divider hidden sm:block mb-8" />

      {/* Filter bar */}
      <div className="mb-4 sm:mb-8">
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
        error={error as Error | null}
        isFetching={isFetching && !isLoading}
        total={data?.pagination.total ?? undefined}
      />

      {/* Pagination — supports both exact-count and unknown-count modes */}
      {data && (data.pagination.total !== null ? data.pagination.total > pageSize : data.pagination.hasMore || (filters.page ?? 1) > 1) && (
        <Pagination
          page={filters.page ?? 1}
          total={data.pagination.total}
          hasMore={data.pagination.hasMore}
          limit={pageSize}
          onChange={handlePageChange}
        />
      )}
    </div>
  );
}
