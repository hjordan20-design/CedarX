import { useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAssets } from "@/hooks/useAssets";
import { FilterBar } from "@/components/explore/FilterBar";
import { AssetGrid } from "@/components/explore/AssetGrid";
import { Pagination } from "@/components/explore/Pagination";
import type { AssetFilters } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 24;
const VALID_PAGE_SIZES = new Set([24, 48, 100, 200]);

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // In-memory cursor map: page number → cursor for that page's starting point.
  const cursorMapRef = useRef<Map<string, string>>(new Map());

  // URL is the single source of truth for all filter state.
  const rawListingFilter = searchParams.get("listingFilter");
  const legacyListedOff = searchParams.get("listedOnly") === "false";
  const listingFilter: AssetFilters["listingFilter"] =
    rawListingFilter === "unlisted" || rawListingFilter === "all" || rawListingFilter === "listed"
      ? rawListingFilter
      : legacyListedOff ? "all" : "listed";

  const rawLimit = Number(searchParams.get("limit"));
  const pageSize = VALID_PAGE_SIZES.has(rawLimit) ? rawLimit : DEFAULT_PAGE_SIZE;

  const sort = (searchParams.get("sort") as AssetFilters["sort"]) ?? "newest";
  const page = Number(searchParams.get("page")) || 1;
  const search = searchParams.get("search") ?? undefined;
  const state  = searchParams.get("state")  ?? undefined;
  const county = searchParams.get("county") ?? undefined;
  const minAcreage = searchParams.get("minAcreage") ? Number(searchParams.get("minAcreage")) : undefined;
  const maxAcreage = searchParams.get("maxAcreage") ? Number(searchParams.get("maxAcreage")) : undefined;
  const minPrice   = searchParams.get("minPrice")   ? Number(searchParams.get("minPrice"))   : undefined;
  const maxPrice   = searchParams.get("maxPrice")   ? Number(searchParams.get("maxPrice"))   : undefined;

  const filterSig = `${sort}|${listingFilter}|${state ?? ""}|${county ?? ""}|${search ?? ""}|${pageSize}`;
  const cursor = cursorMapRef.current.get(`${filterSig}:${page}`);

  const filters: AssetFilters = {
    sort,
    page,
    limit: pageSize,
    listingFilter,
    // Land pivot: always filter to Fabrica (real estate) assets only
    protocol: "fabrica",
    search,
    state,
    county,
    minAcreage,
    maxAcreage,
    minPrice,
    maxPrice,
    ...(cursor ? { cursor } : {}),
  };

  const { data, isLoading, isError, error, isFetching } = useAssets(filters);

  if (data?.pagination.nextCursor) {
    cursorMapRef.current.set(`${filterSig}:${page + 1}`, data.pagination.nextCursor);
  }

  const handleFilterChange = useCallback((next: AssetFilters) => {
    cursorMapRef.current.clear();

    setSearchParams(
      (params) => {
        if (next.sort && next.sort !== "newest") params.set("sort", next.sort);
        else params.delete("sort");

        if (next.limit && next.limit !== DEFAULT_PAGE_SIZE) params.set("limit", String(next.limit));
        else params.delete("limit");

        if (next.search) params.set("search", next.search);
        else params.delete("search");

        if (next.listingFilter && next.listingFilter !== "listed") params.set("listingFilter", next.listingFilter);
        else params.delete("listingFilter");

        if (next.state) params.set("state", next.state);
        else params.delete("state");

        if (next.county) params.set("county", next.county);
        else params.delete("county");

        if (next.minAcreage != null) params.set("minAcreage", String(next.minAcreage));
        else params.delete("minAcreage");

        if (next.maxAcreage != null) params.set("maxAcreage", String(next.maxAcreage));
        else params.delete("maxAcreage");

        if (next.minPrice != null) params.set("minPrice", String(next.minPrice));
        else params.delete("minPrice");

        if (next.maxPrice != null) params.set("maxPrice", String(next.maxPrice));
        else params.delete("maxPrice");

        params.delete("listedOnly");
        params.delete("page");
        return params;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    setSearchParams(
      (params) => { params.set("page", String(page)); return params; },
      { replace: true },
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setSearchParams]);

  const pageTitle = state
    ? county ? `${county} County, ${state}` : `Land in ${state}`
    : "Browse Properties";

  const pageDescription = state
    ? county
      ? `Tokenized land parcels in ${county} County, ${state}. Buy with USDC.`
      : `Tokenized land parcels across ${state}. Filter by county, acreage, and price.`
    : "Tokenized real estate and land parcels on the blockchain. Buy and sell with USDC.";

  return (
    <div className="max-w-[1440px] mx-auto px-6 pb-24 pt-[82px] sm:pt-[114px]">
      <div className="mb-3 sm:mb-10">
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
          {pageTitle}
        </h1>
        <p className="hidden sm:block" style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 300, fontSize: "17px", color: "var(--cedar-muted)" }}>
          {pageDescription}
        </p>
      </div>

      <div className="divider hidden sm:block mb-8" />

      <div className="mb-4 sm:mb-8">
        <FilterBar
          filters={filters}
          onChange={handleFilterChange}
          total={data?.pagination.total}
        />
      </div>

      <AssetGrid
        assets={data?.data}
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        isFetching={isFetching && !isLoading}
        total={data?.pagination.total ?? undefined}
      />

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
