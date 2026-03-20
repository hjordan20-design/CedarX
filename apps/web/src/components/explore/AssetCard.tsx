import { Link } from "react-router-dom";
import type { Asset } from "@/lib/types";
import { ProtocolBadge } from "@/components/common/ProtocolBadge";
import { CategoryTag } from "@/components/common/CategoryTag";
import { formatUSDC, formatAcreage, formatYield } from "@/lib/formatters";

interface AssetCardProps {
  asset: Asset;
}

function AssetSubtitle({ asset }: { asset: Asset }) {
  const { details, category } = asset;
  if (category === "land" && details.state) {
    const parts: string[] = [];
    if (details.county) parts.push(details.county);
    parts.push(details.state);
    if (details.acreage) parts.push(formatAcreage(details.acreage));
    return <p className="text-cedar-muted text-xs font-sans truncate">{parts.join(" · ")}</p>;
  }
  if (category === "fixed-income" && details.apy !== undefined) {
    return <p className="text-cedar-muted text-xs font-sans">{formatYield(details.apy)} APY</p>;
  }
  if (category === "rental-property" && details.property_address) {
    return <p className="text-cedar-muted text-xs font-sans truncate">{details.property_address}</p>;
  }
  return null;
}

function PriceLine({ asset }: { asset: Asset }) {
  if (asset.currentListingPrice != null) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-cedar-text font-mono text-sm">{formatUSDC(asset.currentListingPrice)}</span>
        <span className="text-cedar-muted text-[10px] font-sans">listed</span>
      </div>
    );
  }
  if (asset.lastSalePrice != null) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-cedar-muted font-mono text-sm">{formatUSDC(asset.lastSalePrice)}</span>
        <span className="text-cedar-muted text-[10px] font-sans">last sale</span>
      </div>
    );
  }
  return <span className="text-cedar-muted text-sm font-mono">—</span>;
}

function AssetImage({ asset }: { asset: Asset }) {
  if (asset.imageUrl) {
    return (
      <img
        src={asset.imageUrl}
        alt={asset.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }
  return null;
}

function AssetImageFallback({ asset }: { asset: Asset }) {
  const bgMap: Record<string, string> = {
    land: "bg-cedar-green/10",
    "fixed-income": "bg-cedar-amber/10",
    "rental-property": "bg-cedar-surface-alt",
  };
  return (
    <div className={`w-full h-full flex items-center justify-center ${bgMap[asset.category] ?? "bg-cedar-surface-alt"}`}>
      <span className="text-cedar-muted/40 font-mono text-xs tracking-widest uppercase">{asset.category}</span>
    </div>
  );
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link
      to={`/assets/${encodeURIComponent(asset.id)}`}
      className="group card flex flex-col overflow-hidden hover:border-cedar-muted transition-colors duration-200"
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-cedar-surface-alt">
        {asset.imageUrl ? (
          <>
            <AssetImage asset={asset} />
            <div className="hidden w-full h-full absolute inset-0">
              <AssetImageFallback asset={asset} />
            </div>
          </>
        ) : (
          <AssetImageFallback asset={asset} />
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <ProtocolBadge protocol={asset.protocol} />
          <CategoryTag category={asset.category} />
        </div>

        {/* Name + subtitle */}
        <div className="flex-1 min-w-0">
          <h3 className="text-cedar-text text-sm font-sans font-medium leading-snug line-clamp-2">
            {asset.name}
          </h3>
          <div className="mt-0.5">
            <AssetSubtitle asset={asset} />
          </div>
        </div>

        {/* Price */}
        <div className="border-t border-cedar-border pt-3">
          <PriceLine asset={asset} />
        </div>
      </div>
    </Link>
  );
}
