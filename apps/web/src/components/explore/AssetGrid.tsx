import { CardSkeleton } from "@/components/common/LoadingStates";
import { AssetCard } from "./AssetCard";
import type { Asset } from "@/lib/types";

const SKELETON_COUNT = 12;

interface AssetGridProps {
  assets: Asset[] | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  total?: number;
}

export function AssetGrid({ assets, isLoading, isError, isFetching, total }: AssetGridProps) {
  if (isError) {
    return (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <div className="w-8 h-px bg-cedar-amber mb-2" />
        <p className="text-cedar-text font-sans text-base">
          Assets loading soon.
        </p>
        <p className="text-cedar-muted font-sans text-sm max-w-sm leading-relaxed">
          CedarX is currently indexing protocols. Check back shortly — listings will appear here once the indexer syncs.
        </p>
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
    const isIndexing = total === 0 || total === undefined;
    return isIndexing ? (
      <div className="py-24 flex flex-col items-center gap-4 text-center">
        <div className="w-8 h-px bg-cedar-amber mb-2" />
        <p className="text-cedar-text font-sans text-base">
          Assets loading soon.
        </p>
        <p className="text-cedar-muted font-sans text-sm max-w-sm leading-relaxed">
          CedarX is currently indexing protocols. Check back shortly — listings will appear here once the indexer syncs.
        </p>
      </div>
    ) : (
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
