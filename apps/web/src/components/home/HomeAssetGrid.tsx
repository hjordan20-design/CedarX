import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAssets } from "@/lib/api";
import { AssetCard } from "@/components/explore/AssetCard";
import { CardSkeleton } from "@/components/common/LoadingStates";
import type { Asset, AssetFilters, Paginated } from "@/lib/types";

const MAX_ITEMS = 8;
const SKELETON_COUNT = 4;
const CACHE_KEY = "cedar-home-listings-cache";

function readCachedListings(): Paginated<Asset> | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Paginated<Asset>) : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedListings(data: Paginated<Asset>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* blocked */ }
}

interface HomeAssetGridProps {
  filters: AssetFilters;
}

export function HomeAssetGrid({ filters }: HomeAssetGridProps) {
  const queryFilters = { ...filters, limit: MAX_ITEMS };
  const { data, isLoading, isError } = useQuery({
    queryKey: ["assets", queryFilters],
    queryFn: async () => {
      const result = await fetchAssets(queryFilters);
      writeCachedListings(result);
      return result;
    },
    staleTime: 30_000,
    placeholderData: readCachedListings,
  });

  const assets = data?.data;
  const isEmpty = !isLoading && (!assets || assets.length === 0);
  const showPlaceholder = isError || isEmpty;

  return (
    <section className="max-w-7xl mx-auto px-6" style={{ paddingTop: "20px", paddingBottom: "48px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "26px",
              letterSpacing: "-0.01em",
              color: "var(--cedar-text)",
            }}
          >
            {isLoading ? "Loading" : "Latest listings"}
          </h2>
          {!isLoading && data?.pagination.total != null && (
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "var(--cedar-muted)" }}>
              {data.pagination.total.toLocaleString("en-US")} total
            </span>
          )}
        </div>
        <Link
          to="/explore"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(196,133,42,0.70)",
            textDecoration: "none",
            transition: "color 0.3s ease",
          }}
        >
          Browse all <ArrowRight size={13} />
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(196,133,42,0.10)", marginBottom: "20px" }} />

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i}><CardSkeleton /></div>
          ))}
        </div>
      )}

      {/* Empty / indexing state */}
      {!isLoading && showPlaceholder && (
        <div className="py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-8 h-px bg-cedar-amber mb-2" />
          <p className="text-cedar-text font-sans" style={{ fontSize: "16px" }}>
            Assets loading soon.
          </p>
          <p className="text-cedar-muted font-sans max-w-sm leading-relaxed" style={{ fontSize: "14px" }}>
            CedarX is currently indexing protocols. Check back shortly — listings will appear here once the indexer syncs.
          </p>
        </div>
      )}

      {/* Live asset grid */}
      {!isLoading && !showPlaceholder && assets && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id}>
              <AssetCard asset={asset} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
