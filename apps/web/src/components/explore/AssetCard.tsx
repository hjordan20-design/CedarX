import { useRef, useState } from "react";
import { useEthPrice } from "@/lib/useEthPrice";
import { Link } from "react-router-dom";
import type { Asset } from "@/lib/types";
import { VERIFIED_CONTRACTS } from "@/lib/types";
import { ProtocolBadge } from "@/components/common/ProtocolBadge";
import { CategoryTag } from "@/components/common/CategoryTag";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { formatTokenPrice, formatUSDC, formatAcreage } from "@/lib/formatters";
import { mapboxCardUrl, ELOY_FALLBACK_CARD } from "@/lib/mapbox";

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

function stripLowConfidence(name: string): string {
  return name.replace(/^\[Low Confidence\]\s*/i, "").trim();
}

/**
 * Best display title for a property card.
 * Falls through: stored name → details.location → county+state → "Land Parcel".
 * Matches the resolvePropertyTitle logic on the detail page.
 */
function resolveCardTitle(asset: Asset): string {
  const name = stripLowConfidence(asset.name ?? "");
  if (name && name !== "Land Parcel") return name;
  const d = asset.details;
  if (d.location) return stripLowConfidence(d.location);
  if (d.county && d.state) return `Land in ${d.county}, ${d.state}`;
  if (d.state) return `Land in ${d.state}`;
  return "Land Parcel";
}

function AssetSubtitle({ asset }: { asset: Asset }) {
  const { details, category } = asset;
  if (category === "real-estate") {
    const location: string[] = [];
    if (details.county) location.push(details.county);
    if (details.state)  location.push(details.state);
    const locationStr = location.join(", ");
    // Coerce to Number in case JSONB returns it as a string
    const acreageNum  = details.acreage != null ? Number(details.acreage) : null;
    const acreageStr  = acreageNum != null && !isNaN(acreageNum) ? formatAcreage(acreageNum) : null;
    if (locationStr || acreageStr) {
      return (
        <div className="space-y-0.5">
          {locationStr && <p className="text-cedar-muted text-[13px] font-sans truncate">{locationStr}</p>}
          {acreageStr  && <p className="text-cedar-amber/70 text-[12px] font-mono">{acreageStr}</p>}
        </div>
      );
    }
    return null;
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
    // Mapbox satellite card thumbnail (400×400, plain satellite, no overlay)
    if (satUrl && !tried.current.has(satUrl)) {
      tried.current.add(satUrl);
      setSrc(satUrl);
      return;
    }
    // Eloy AZ hardcoded card sat — absolute last resort before showing gradient fallback
    if (ELOY_FALLBACK_CARD && !tried.current.has(ELOY_FALLBACK_CARD)) {
      tried.current.add(ELOY_FALLBACK_CARD);
      setSrc(ELOY_FALLBACK_CARD);
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

/**
 * Returns true for the Fabrica CDN dark-overlay parcel map image.
 * These look bad at card size (dark blue polygon) — skip them and use
 * the plain Mapbox satellite tile instead.
 */
function isFabricaDarkOverlay(url: string | null | undefined): boolean {
  return !!url && url.includes("media3.fabrica.land") && url.includes("theme=dark");
}

export function AssetCard({ asset }: { asset: Asset }) {
  const displayName = resolveCardTitle(asset);
  // Debug: trace name chain and acreage for real-estate cards (first 3 only, by checking a ref)
  if (asset.category === "real-estate" && typeof window !== "undefined") {
    const key = `__cedarx_debug_card_${asset.id}`;
    const w = window as unknown as Record<string, unknown>;
    if (!w[key]) {
      w[key] = true;
      console.log(`[AssetCard] id=${asset.id} raw name=${JSON.stringify(asset.name)} resolved="${displayName}" acreage=${asset.details?.acreage} county=${asset.details?.county} state=${asset.details?.state} imageUrl=${asset.imageUrl ?? "null"}`);
    }
  }
  // For land assets: asset-specific card sat (400×400, plain satellite) → Eloy AZ card fallback
  const satUrl = mapboxCardUrl(asset.details.lat, asset.details.lng)
    ?? (asset.category === "real-estate" ? ELOY_FALLBACK_CARD : null);
  // Skip Fabrica CDN dark overlay images — use satellite fallback instead
  const cleanImageUrl = isFabricaDarkOverlay(asset.imageUrl) ? null : (asset.imageUrl ?? null);
  const effectiveImageUrl = cleanImageUrl ?? satUrl ?? undefined;
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
