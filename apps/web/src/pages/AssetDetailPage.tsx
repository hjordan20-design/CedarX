import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Tag,
  Hash,
  Globe,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { useAsset } from "@/hooks/useAsset";
import { useAssetHistory, type HistoryItem } from "@/hooks/useAssetHistory";
import { useSeaportOrder } from "@/hooks/useSeaportOrder";
import { ProtocolBadge } from "@/components/common/ProtocolBadge";
import { CategoryTag } from "@/components/common/CategoryTag";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { BuyModal } from "@/components/asset/BuyModal";
import { ListModal } from "@/components/asset/ListModal";
import { formatUSDC, formatDate, truncateAddress, formatAcreage } from "@/lib/formatters";
import type { Asset } from "@/lib/types";
import { VERIFIED_CONTRACTS } from "@/lib/types";

// ─── Category-tinted fallback backgrounds ────────────────────────────────────

const CATEGORY_BG: Record<string, string> = {
  "real-estate":  "bg-cedar-green/10",
  "luxury-goods": "bg-cedar-amber/10",
  "art":          "bg-cedar-surface-alt",
  "collectibles": "bg-cedar-surface-alt",
};

// ─── Metadata grid ────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-cedar-surface px-4 py-3">
      <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">{label}</p>
      <p className="text-cedar-text text-sm font-mono break-all">{value}</p>
    </div>
  );
}

function MetadataGrid({ asset }: { asset: Asset }) {
  const d = asset.details;
  const rows: Array<{ label: string; value: string | number }> = [];

  if (asset.category === "real-estate") {
    if (d.location)   rows.push({ label: "Location",   value: d.location });
    if (d.acreage)    rows.push({ label: "Acreage",    value: formatAcreage(d.acreage) });
    if (d.bedrooms)   rows.push({ label: "Bedrooms",   value: d.bedrooms });
    if (d.bathrooms)  rows.push({ label: "Bathrooms",  value: d.bathrooms });
    if (d.sqft)       rows.push({ label: "Sq ft",      value: d.sqft.toLocaleString() });
    if (d.county)     rows.push({ label: "County",     value: d.county });
    if (d.state)      rows.push({ label: "State",      value: d.state });
    if (d.parcel_id)  rows.push({ label: "Parcel ID",  value: d.parcel_id });
  } else if (asset.category === "luxury-goods") {
    if (d.brand)      rows.push({ label: "Brand",      value: d.brand });
    if (d.model)      rows.push({ label: "Model",      value: d.model });
    if (d.year)       rows.push({ label: "Year",       value: d.year });
    if (d.condition)  rows.push({ label: "Condition",  value: d.condition });
    if (d.serial)     rows.push({ label: "Serial",     value: d.serial });
  } else {
    if (d.artist)     rows.push({ label: "Artist",     value: d.artist });
    if (d.medium)     rows.push({ label: "Medium",     value: d.medium });
    if (d.dimensions) rows.push({ label: "Dimensions", value: d.dimensions });
    if (d.edition)    rows.push({ label: "Edition",    value: d.edition });
    if (d.provenance) rows.push({ label: "Provenance", value: d.provenance });
  }

  // Always show on-chain fields
  rows.push({ label: "Token standard", value: asset.tokenStandard });
  rows.push({ label: "Chain",          value: asset.chain });
  if (asset.tokenId) rows.push({ label: "Token ID", value: `#${asset.tokenId}` });

  if (!rows.length) return null;

  return (
    <div>
      <h3 className="text-cedar-muted text-[10px] tracking-widest uppercase mb-3">Details</h3>
      <div className="grid grid-cols-2 gap-px bg-cedar-border">
        {rows.map((r) => (
          <MetaRow key={r.label} label={r.label} value={r.value} />
        ))}
      </div>
    </div>
  );
}

// ─── Map embed (OpenStreetMap) ────────────────────────────────────────────────

function AssetMap({ lat, lng }: { lat: number; lng: number }) {
  const d = 0.015;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    <div className="mt-4">
      <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-2 flex items-center gap-1.5">
        <MapPin size={10} /> Location
      </p>
      <div className="relative overflow-hidden border border-cedar-border" style={{ paddingTop: "62%" }}>
        <iframe
          src={src}
          title="Asset location map"
          className="absolute inset-0 w-full h-full grayscale"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=14`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-cedar-muted/50 hover:text-cedar-amber text-[11px] transition-colors"
      >
        View larger map <ExternalLink size={9} />
      </a>
    </div>
  );
}

// ─── Transaction history ──────────────────────────────────────────────────────

function TransactionHistory({ assetId }: { assetId: string }) {
  const { data: items, isLoading } = useAssetHistory(assetId);

  return (
    <div>
      <h3 className="text-cedar-muted text-[10px] tracking-widest uppercase mb-3">
        Transaction History
      </h3>

      {isLoading && (
        <div className="animate-pulse space-y-px">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-cedar-surface" />
          ))}
        </div>
      )}

      {!isLoading && (!items || items.length === 0) && (
        <div className="border border-cedar-border border-dashed px-4 py-6 text-center">
          <p className="text-cedar-muted/50 text-sm">No transactions recorded yet.</p>
        </div>
      )}

      {!isLoading && items && items.length > 0 && (
        <div className="border border-cedar-border overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-cedar-border">
                {["Event", "Price", "From", "Date", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-cedar-muted text-[10px] tracking-widest uppercase font-normal"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(items as HistoryItem[]).map((item, i) => (
                <tr
                  key={i}
                  className="border-b border-cedar-border last:border-0 hover:bg-cedar-surface-alt transition-colors"
                >
                  <td className="px-4 py-3 text-cedar-text capitalize">{item.type}</td>
                  <td className="px-4 py-3 font-mono text-cedar-text">
                    {item.price ? formatUSDC(item.price) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-cedar-muted text-xs">
                    {item.from ? truncateAddress(item.from) : "—"}
                  </td>
                  <td className="px-4 py-3 text-cedar-muted text-xs">
                    {formatDate(item.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    {item.txHash && (
                      <a
                        href={`https://etherscan.io/tx/${item.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cedar-amber/70 hover:text-cedar-amber transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Action buttons ───────────────────────────────────────────────────────────

const ERC721_OWNER_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

const ERC1155_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

function AssetActions({ asset }: { asset: Asset }) {
  const [showBuy, setShowBuy]   = useState(false);
  const [showList, setShowList] = useState(false);
  const { address, isConnected } = useAccount();
  const { openConnectModal }     = useConnectModal();

  // Seaport order (takes priority over CedarX swap listing for the buy flow)
  const { data: seaportOrder } = useSeaportOrder(asset.id);

  const tokenIdBig = asset.tokenId ? BigInt(asset.tokenId) : undefined;

  const { data: ownerAddress } = useReadContract({
    address: asset.contractAddress as `0x${string}`,
    abi: ERC721_OWNER_ABI,
    functionName: "ownerOf",
    args: tokenIdBig !== undefined ? [tokenIdBig] : undefined!,
    query: {
      enabled:
        !!tokenIdBig &&
        asset.tokenStandard === "ERC-721" &&
        !!address,
    },
  });

  const { data: balance1155 } = useReadContract({
    address: asset.contractAddress as `0x${string}`,
    abi: ERC1155_BALANCE_ABI,
    functionName: "balanceOf",
    args:
      address && tokenIdBig !== undefined
        ? [address, tokenIdBig]
        : undefined!,
    query: {
      enabled:
        !!tokenIdBig &&
        asset.tokenStandard === "ERC-1155" &&
        !!address,
    },
  });

  const ownsAsset =
    asset.tokenStandard === "ERC-721"
      ? typeof ownerAddress === "string" &&
        ownerAddress.toLowerCase() === address?.toLowerCase()
      : typeof balance1155 === "bigint" && balance1155 > 0n;

  // Seaport order takes priority; fall back to CedarX swap listing
  const hasSeaport  = !!seaportOrder;
  const hasCedarX   = asset.currentListingPrice != null;
  const hasListing  = hasSeaport || hasCedarX;
  const listingId   = 0n; // CedarX listing ID placeholder

  // Format price for display
  const displayPrice = hasSeaport
    ? (() => {
        const amt = Number(seaportOrder!.price) /
                    Math.pow(10, seaportOrder!.paymentTokenDecimals);
        return `${amt.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${seaportOrder!.paymentTokenSymbol}`;
      })()
    : hasCedarX
    ? `${formatUSDC(asset.currentListingPrice)} USDC`
    : null;

  return (
    <>
      {/* Price block */}
      <div className="py-4 border-t border-b border-cedar-border space-y-1">
        {displayPrice && (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-2xl text-cedar-text font-medium">
              {displayPrice}
            </span>
            {hasSeaport && (
              <span className="text-cedar-muted/60 text-[10px] tracking-widest uppercase border border-cedar-border px-1.5 py-0.5">
                via Seaport
              </span>
            )}
          </div>
        )}
        {asset.lastSalePrice != null && (
          <p className="text-cedar-muted text-xs">
            Last sale: {formatUSDC(asset.lastSalePrice)} USDC
          </p>
        )}
        {!hasListing && asset.lastSalePrice == null && (
          <p className="text-cedar-muted text-sm">Not currently listed</p>
        )}
      </div>

      {/* Primary CTA */}
      <div className="pt-4">
        {!isConnected && hasListing && (
          <button
            onClick={openConnectModal}
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold"
          >
            Buy · Connect wallet
          </button>
        )}

        {isConnected && hasListing && !ownsAsset && (
          <button
            onClick={() => setShowBuy(true)}
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold"
          >
            Buy for {displayPrice}
          </button>
        )}

        {isConnected && ownsAsset && (
          <button
            onClick={() => setShowList(true)}
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold"
          >
            List for sale
          </button>
        )}

        {!hasListing && !ownsAsset && (
          <button
            disabled
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold opacity-40 cursor-not-allowed"
          >
            Not currently listed
          </button>
        )}
      </div>

      {/* Contract info */}
      <div className="pt-4 space-y-1.5">
        <a
          href={`https://etherscan.io/token/${asset.contractAddress}${asset.tokenId ? `?a=${asset.tokenId}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-cedar-muted/60 hover:text-cedar-amber text-[11px] font-mono transition-colors"
        >
          <Hash size={10} />
          {truncateAddress(asset.contractAddress)}
          <ExternalLink size={9} />
        </a>
        {asset.tokenId && (
          <p className="flex items-center gap-2 text-cedar-muted/60 text-[11px] font-mono">
            <Tag size={10} /> Token #{asset.tokenId}
          </p>
        )}
        <p className="flex items-center gap-2 text-cedar-muted/60 text-[11px]">
          <Globe size={10} /> {asset.chain} · {asset.tokenStandard}
        </p>
      </div>

      {/* Verify link — subtle, for trust only */}
      {asset.externalUrl && (
        <a
          href={asset.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cedar-muted/50 hover:text-cedar-muted text-[11px] transition-colors pt-1"
        >
          Verify on protocol <ExternalLink size={10} />
        </a>
      )}

      {/* Modals */}
      {showBuy && hasListing && (
        <BuyModal
          assetName={asset.name}
          seaportOrder={seaportOrder}
          listingId={hasCedarX && !hasSeaport ? listingId : undefined}
          priceUsdc={hasCedarX && !hasSeaport ? asset.currentListingPrice! : undefined}
          onClose={() => setShowBuy(false)}
        />
      )}
      {showList && asset.tokenId && (
        <ListModal
          assetName={asset.name}
          contractAddress={asset.contractAddress as `0x${string}`}
          tokenId={asset.tokenId}
          tokenStandard={asset.tokenStandard}
          onClose={() => setShowList(false)}
        />
      )}
    </>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="animate-pulse mb-6 h-4 w-48 bg-cedar-surface" />
      <div className="grid lg:grid-cols-[420px_1fr] gap-8">
        <div className="space-y-4">
          <div className="w-full aspect-[4/3] bg-cedar-surface" />
          <div className="h-3 bg-cedar-surface w-24" />
        </div>
        <div className="space-y-5">
          <div className="h-8 bg-cedar-surface w-3/4" />
          <div className="h-4 bg-cedar-surface w-1/3" />
          <div className="h-16 bg-cedar-surface w-full" />
          <div className="h-10 bg-cedar-surface w-full" />
          <div className="grid grid-cols-2 gap-px bg-cedar-border mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-cedar-surface h-14" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: asset, isLoading, isError, error } = useAsset(id ?? "");
  const [imgError, setImgError] = useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !asset) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-24 text-center">
        <AlertCircle size={32} className="text-cedar-red/60 mx-auto mb-4" />
        <p className="text-cedar-text font-medium mb-2">Asset not found</p>
        <p className="text-cedar-muted text-sm mb-6">
          {error instanceof Error ? error.message : "This asset could not be loaded."}
        </p>
        <Link to="/explore" className="btn-ghost inline-flex">
          <ArrowLeft size={14} /> Back to Explore
        </Link>
      </div>
    );
  }

  const hasMap =
    asset.category === "real-estate" &&
    asset.details.lat != null &&
    asset.details.lng != null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-cedar-muted text-xs mb-8 min-w-0">
        <Link to="/" className="hover:text-cedar-text transition-colors shrink-0">
          Home
        </Link>
        <span className="shrink-0">/</span>
        <Link to="/explore" className="hover:text-cedar-text transition-colors shrink-0">
          Explore
        </Link>
        <span className="shrink-0">/</span>
        <span className="text-cedar-text truncate">{asset.name}</span>
      </nav>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[420px_1fr] gap-8 items-start">
        {/* ── Left column: image + map ── */}
        <div className="lg:sticky lg:top-24 space-y-0 min-w-0">
          {/* Hero image */}
          <div
            className={`relative overflow-hidden w-full max-w-full aspect-[4/3] border border-cedar-border ${
              CATEGORY_BG[asset.category] ?? "bg-cedar-surface-alt"
            }`}
          >
            {asset.imageUrl && !imgError ? (
              <img
                src={asset.imageUrl}
                alt={asset.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-cedar-muted/40 font-mono text-xs tracking-widest uppercase">
                  {asset.category.replace(/-/g, " ")}
                </span>
              </div>
            )}
            {/* Subtle vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-cedar-bg/30 to-transparent pointer-events-none" />
          </div>

          {/* Map */}
          {hasMap && (
            <AssetMap lat={asset.details.lat!} lng={asset.details.lng!} />
          )}
        </div>

        {/* ── Right column: all info ── */}
        <div className="space-y-6 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <ProtocolBadge protocol={asset.protocol} />
            <CategoryTag category={asset.category} />
            {VERIFIED_CONTRACTS[asset.contractAddress.toLowerCase()] && (
              <VerifiedBadge />
            )}
          </div>

          {/* Name */}
          <h1 className="display text-2xl sm:text-3xl lg:text-4xl text-cedar-text leading-tight break-words">
            {asset.name}
          </h1>

          {/* Actions (price + buy/sell buttons + contract info) */}
          <AssetActions asset={asset} />

          {/* Description */}
          {asset.description && (
            <div>
              <h3 className="text-cedar-muted text-[10px] tracking-widest uppercase mb-3">
                Description
              </h3>
              <p className="text-cedar-muted text-sm leading-relaxed">{asset.description}</p>
            </div>
          )}

          {/* Metadata */}
          <MetadataGrid asset={asset} />

          {/* Volume */}
          {asset.totalVolume > 0 && (
            <div className="flex items-center gap-8 py-4 border-t border-cedar-border">
              <div>
                <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">
                  Total volume
                </p>
                <p className="font-mono text-cedar-text">{formatUSDC(asset.totalVolume)}</p>
              </div>
              <div>
                <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">
                  Last updated
                </p>
                <p className="text-cedar-muted text-sm">{formatDate(asset.lastUpdated)}</p>
              </div>
            </div>
          )}

          {/* Transaction history */}
          <TransactionHistory assetId={asset.id} />
        </div>
      </div>
    </div>
  );
}
