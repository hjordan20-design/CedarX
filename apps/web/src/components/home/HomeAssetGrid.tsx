import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";
import { AssetCard } from "@/components/explore/AssetCard";
import { CardSkeleton } from "@/components/common/LoadingStates";
import { FeaturedAssets } from "./FeaturedAssets";
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

  return (
    <section className="max-w-7xl mx-auto px-6 pt-4 pb-10 sm:py-10">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3 sm:mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-sans text-sm font-medium text-cedar-text tracking-widest uppercase">
            {isLoading ? "Loading" : showPlaceholder ? "Featured listings" : "Latest listings"}
          </h2>
          {!isLoading && !showPlaceholder && data?.pagination.total != null && (
            <span className="text-cedar-muted/60 font-mono text-xs tabular-nums">
              {data.pagination.total.toLocaleString("en-US")} total
            </span>
          )}
        </div>
        <Link
          to="/explore"
          className="inline-flex items-center gap-1.5 text-cedar-muted text-xs hover:text-cedar-text transition-colors tracking-widest uppercase"
        >
          Browse all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-flow-col auto-cols-[72vw] gap-3 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory card-scroll-row sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-px sm:bg-cedar-border sm:overflow-visible sm:mx-0 sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="snap-start bg-cedar-bg"><CardSkeleton /></div>
          ))}
        </div>
      )}

      {/* Live asset grid */}
      {!isLoading && !showPlaceholder && assets && (
        <div className="grid grid-flow-col auto-cols-[72vw] gap-3 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory card-scroll-row sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-px sm:bg-cedar-border sm:overflow-visible sm:mx-0 sm:px-0 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="snap-start bg-cedar-bg">
              <AssetCard asset={asset} />
            </div>
          ))}
        </div>
      )}

      {/* Placeholder cards when API is offline */}
      {!isLoading && showPlaceholder && <FeaturedAssets />}
    </section>
  );
}
