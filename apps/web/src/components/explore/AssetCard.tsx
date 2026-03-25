import { Link } from "react-router-dom";
import type { Asset } from "@/lib/types";
import { VERIFIED_CONTRACTS } from "@/lib/types";
import { ProtocolBadge } from "@/components/common/ProtocolBadge";
import { CategoryTag } from "@/components/common/CategoryTag";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { formatTokenPrice, formatUSDC, formatAcreage } from "@/lib/formatters";

function AssetSubtitle({ asset }: { asset: Asset }) {
  const { details, category } = asset;
  if (category === "real-estate") {
    const parts: string[] = [];
    if (details.county) parts.push(details.county);
    if (details.state) parts.push(details.state);
    if (details.acreage) parts.push(formatAcreage(details.acreage));
    if (parts.length) return <p className="text-cedar-muted text-[13px] font-sans truncate">{parts.join(" · ")}</p>;
  }
  if (category === "luxury-goods") {
    const parts: string[] = [];
    if (details.brand) parts.push(details.brand);
    if (details.model) parts.push(details.model);
    if (parts.length) return <p className="text-cedar-muted text-[13px] font-sans truncate">{parts.join(" · ")}</p>;
  }
  if (category === "art") {
    const parts: string[] = [];
    if (details.artist) parts.push(details.artist);
    if (details.medium) parts.push(details.medium);
    if (parts.length) return <p className="text-cedar-muted text-[13px] font-sans truncate">{parts.join(" · ")}</p>;
  }
  if (category === "collectibles" && details.brand) {
    return <p className="text-cedar-muted text-[13px] font-sans truncate">{details.brand}</p>;
  }
  return null;
}

function PriceLine({ asset }: { asset: Asset }) {
  if (asset.currentListingPrice != null) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-cedar-text font-mono text-sm">{formatTokenPrice(asset.currentListingPrice, asset.currentListingPaymentTokenSymbol)}</span>
        <span className="text-cedar-muted text-xs font-sans">listed</span>
      </div>
    );
  }
  if (asset.hasActiveListing) {
    // Active listing exists but price not yet synced
    return <span className="text-cedar-muted text-sm font-sans">Listed</span>;
  }
  if (!asset.hasActiveListing) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-sans border border-cedar-amber/50 text-cedar-amber/80 group-hover:border-cedar-amber group-hover:text-cedar-amber transition-colors">
        Make Offer
      </span>
    );
  }
  if (asset.lastSalePrice != null) {
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-cedar-muted font-mono text-sm">{formatUSDC(asset.lastSalePrice)}</span>
        <span className="text-cedar-muted text-xs font-sans">last sale</span>
      </div>
    );
  }
  return <span className="text-cedar-muted text-sm font-mono">—</span>;
}

const CATEGORY_BG: Record<string, string> = {
  "real-estate":  "bg-cedar-green/10",
  "luxury-goods": "bg-cedar-amber/10",
  "art":          "bg-cedar-surface-alt",
  "collectibles": "bg-cedar-surface-alt",
};

function AssetImageFallback({ asset }: { asset: Asset }) {
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-1.5 ${CATEGORY_BG[asset.category] ?? "bg-cedar-surface-alt"}`}>
      <span className="text-cedar-muted/50 font-mono text-xs tracking-widest uppercase">{asset.protocol}</span>
      <span className="text-cedar-muted/30 font-sans text-[10px]">Image unavailable</span>
    </div>
  );
}

export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Link
      to={`/assets/${encodeURIComponent(asset.id)}`}
      className="group card flex flex-col overflow-hidden hover:border-cedar-muted transition-colors duration-200"
    >
      <div className="relative aspect-video overflow-hidden bg-cedar-surface-alt">
        {asset.imageUrl ? (
          <>
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
            <div className="hidden w-full h-full absolute inset-0">
              <AssetImageFallback asset={asset} />
            </div>
          </>
        ) : (
          <AssetImageFallback asset={asset} />
        )}
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <ProtocolBadge protocol={asset.protocol} />
          <CategoryTag category={asset.category} />
          {VERIFIED_CONTRACTS[asset.contractAddress.toLowerCase()] && (
            <VerifiedBadge />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-cedar-text text-base font-sans font-medium leading-snug line-clamp-2">{asset.name}</h3>
          <div className="mt-0.5"><AssetSubtitle asset={asset} /></div>
        </div>
        <div className="border-t border-cedar-border pt-3">
          <PriceLine asset={asset} />
        </div>
      </div>
    </Link>
  );
}
