import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";
import { AssetCard } from "@/components/explore/AssetCard";
import { CardSkeleton } from "@/components/common/LoadingStates";
import type { AssetFilters } from "@/lib/types";

const MAX_ITEMS = 8;
const SKELETON_COUNT = 8;

interface HomeAssetGridProps {
  filters: AssetFilters;
}

export function HomeAssetGrid({ filters }: HomeAssetGridProps) {
  const { data, isLoading, isError } = useAssets({ ...filters, limit: MAX_ITEMS });

  const assets = data?.data;
  const isEmpty = !isLoading && (!assets || assets.length === 0);
  const showPlaceholder = isError || isEmpty;

  // Don't render the section at all when no real data is available
  // (hero right column already shows placeholder cards)
  if (!isLoading && showPlaceholder) return null;

  return (
    <section className="max-w-7xl mx-auto px-6" style={{ paddingTop: "48px", paddingBottom: "48px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h2
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "22px",
              letterSpacing: "-0.01em",
              color: "#1C1710",
            }}
          >
            {isLoading ? "Loading" : "Latest listings"}
          </h2>
          {!isLoading && data?.pagination.total != null && (
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "rgba(28,23,16,0.35)" }}>
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
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(196,133,42,0.70)",
            textDecoration: "none",
            transition: "color 0.3s ease",
          }}
        >
          Browse all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-flow-col auto-cols-[72vw] gap-3 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory card-scroll-row sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="snap-start"><CardSkeleton /></div>
          ))}
        </div>
      )}

      {/* Live asset grid */}
      {!isLoading && !showPlaceholder && assets && (
        <div className="grid grid-flow-col auto-cols-[72vw] gap-3 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory card-scroll-row sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="snap-start">
              <AssetCard asset={asset} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
