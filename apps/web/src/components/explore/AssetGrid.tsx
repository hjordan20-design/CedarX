import { CardSkeleton, ErrorMessage } from "@/components/common/LoadingStates";
import { AssetCard } from "./AssetCard";
import type { Asset } from "@/lib/types";

const SKELETON_COUNT = 12;

interface AssetGridProps {
  assets: Asset[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
}

export function AssetGrid({ assets, isLoading, isError, isFetching }: AssetGridProps) {
  if (isError) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <ErrorMessage message="Failed to load assets. Check that the indexer API is running." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-cedar-border">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <div key={i} className="bg-cedar-bg">
            <CardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-3 text-center">
        <p className="text-cedar-muted font-sans text-sm">No assets match your filters.</p>
        <p className="text-cedar-muted/60 font-sans text-xs">Try adjusting your search or clearing filters.</p>
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-200 ${isFetching ? "opacity-70" : "opacity-100"}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-cedar-border">
        {assets.map((asset) => (
          <div key={asset.id} className="bg-cedar-bg">
            <AssetCard asset={asset} />
          </div>
        ))}
      </div>
    </div>
  );
}
