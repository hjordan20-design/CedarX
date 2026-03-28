import { useRef, useState } from "react";
import { useEthPrice } from "@/lib/useEthPrice";
import { Link } from "react-router-dom";
import type { Asset } from "@/lib/types";
import { VERIFIED_CONTRACTS } from "@/lib/types";
import { ProtocolBadge } from "@/components/common/ProtocolBadge";
import { CategoryTag } from "@/components/common/CategoryTag";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { formatTokenPrice, formatUSDC, formatAcreage } from "@/lib/formatters";
import { mapboxSatUrl, ELOY_FALLBACK_SAT } from "@/lib/mapbox";

// ─── IPFS gateway cycling ─────────────────────────────────────────────────────
// When an IPFS image fails to load, retry with the next public gateway.
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/",
];

function extractIpfsCid(url: string): string | null {
  // Handle ipfs:// URI scheme
  if (url.startsWith("ipfs://")) return url.slice(7);
  // Match any /ipfs/<cid> path pattern (covers any gateway URL)
  const match = url.match(/\/ipfs\/(.+)$/);
  if (match) return match[1];
  // Fallback: known gateway prefixes
  for (const gw of IPFS_GATEWAYS) {
    if (url.startsWith(gw)) return url.slice(gw.length);
  }
  return null;
}

/** Strip the "[Low Confidence]" AI-geocoder prefix Fabrica adds to some names. */
function cleanAssetName(name: string): string {
  return name.replace(/^\[Low Confidence\]\s*/i, "").trim();
}

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

/** ETH and WETH listings are converted to approximate USD for display. */
function PriceLine({ asset }: { asset: Asset }) {
  const ethUsd = useEthPrice();

  if (asset.currentListingPrice != null) {
    const sym = asset.currentListingPaymentTokenSymbol;
    const isEth = sym === "ETH" || sym === "WETH";
    const displayPrice = isEth
      ? `~${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(asset.currentListingPrice * ethUsd)} USDC`
      : formatTokenPrice(asset.currentListingPrice, sym);
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="text-cedar-text font-mono text-sm">{displayPrice}</span>
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

function AssetImageFallback() {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, #2C1F0A 0%, #1A1408 55%, #0D0B07 100%)" }}
    >
      <span
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(196,133,42,0.30)",
        }}
      >
        No image
      </span>
    </div>
  );
}

function AssetCardImage({ imageUrl, alt, satUrl }: { imageUrl: string; alt: string; satUrl?: string | null }) {
  const [src, setSrc] = useState(imageUrl);
  const [failed, setFailed] = useState(false);
  const tried = useRef(new Set<string>([imageUrl]));

  function handleError() {
    const cid = extractIpfsCid(src);
    if (cid) {
      const next = IPFS_GATEWAYS.map((gw) => `${gw}${cid}`).find((u) => !tried.current.has(u));
      if (next) { tried.current.add(next); setSrc(next); return; }
    }
    // Mapbox satellite fallback for land assets
    if (satUrl && !tried.current.has(satUrl)) {
      tried.current.add(satUrl);
      setSrc(satUrl);
      return;
    }
    setFailed(true);
  }

  if (failed) return <AssetImageFallback />;
  return (
    <>
      {/* display:none prevents all browsers from showing a broken-image indicator */}
      <img
        src={src}
        alt=""
        onError={handleError}
        aria-hidden="true"
        style={{ display: "none" }}
      />
      {/* Visible layer — CSS backgroundImage never shows the browser broken-image icon */}
      <div
        className="w-full h-full transition-transform duration-500 group-hover:scale-[1.03]"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        role="img"
        aria-label={alt}
      />
    </>
  );
}

export function AssetCard({ asset }: { asset: Asset }) {
  const displayName = cleanAssetName(asset.name);
  // For land assets: asset-specific sat → Eloy AZ fallback sat (always shows something)
  const satUrl = mapboxSatUrl(asset.details.lat, asset.details.lng)
    ?? (asset.category === "real-estate" ? ELOY_FALLBACK_SAT : null);
  const effectiveImageUrl = asset.imageUrl ?? satUrl ?? undefined;
  return (
    <Link
      to={`/assets/${encodeURIComponent(asset.id)}`}
      className="group card flex flex-col overflow-hidden hover:border-cedar-muted transition-colors duration-200"
    >
      <div className="relative aspect-video overflow-hidden max-h-[180px]"
        style={{ background: "linear-gradient(135deg, #2C1F0A 0%, #1A1408 55%, #0D0B07 100%)" }}>
        {effectiveImageUrl ? (
          <AssetCardImage
            imageUrl={effectiveImageUrl}
            alt={displayName}
            satUrl={satUrl}
          />
        ) : (
          <AssetImageFallback />
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
          <h3 className="text-cedar-text text-base font-sans font-medium leading-snug line-clamp-2">{displayName}</h3>
          <div className="mt-0.5"><AssetSubtitle asset={asset} /></div>
        </div>
        <div className="border-t border-cedar-border pt-3">
          <PriceLine asset={asset} />
        </div>
      </div>
    </Link>
  );
}
