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
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { useAsset } from "@/hooks/useAsset";
import { useAssetHistory, type HistoryItem } from "@/hooks/useAssetHistory";
import { useSeaportOrder } from "@/hooks/useSeaportOrder";
import { ProtocolBadge } from "@/components/common/ProtocolBadge";
import { CategoryTag } from "@/components/common/CategoryTag";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { BuyModal } from "@/components/asset/BuyModal";
import { ListModal } from "@/components/asset/ListModal";
import { OfferModal } from "@/components/asset/OfferModal";
import { formatTokenPrice, formatUSDC, formatDate, truncateAddress, formatAcreage, stripMarkdown } from "@/lib/formatters";
import type { Asset } from "@/lib/types";
import { VERIFIED_CONTRACTS } from "@/lib/types";
import { SEAPORT_ADDRESS, SEAPORT_ABI } from "@/config/contracts";

// ─── IPFS image gateway fallback ─────────────────────────────────────────────
// Try each gateway in order when an image fails to load.

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
];

/** Extract the IPFS CID+path from any gateway URL or ipfs:// URI. */
function extractIpfsCid(url: string): string | null {
  const m = url.match(/\/ipfs\/(.+)$/);
  return m ? m[1] : null;
}

/**
 * Return the next IPFS gateway URL to try after the current one fails.
 * Returns null when all gateways have been exhausted or the URL is not IPFS.
 */
function nextIpfsUrl(currentUrl: string, triedCount: number): string | null {
  const cid = extractIpfsCid(currentUrl);
  if (!cid) return null;
  if (triedCount >= IPFS_GATEWAYS.length) return null;
  return `${IPFS_GATEWAYS[triedCount]}${cid}`;
}

/** Strip the "[Low Confidence]" prefix that Fabrica's AI metadata sometimes adds. */
function stripLowConfidence(name: string): string {
  return name.replace(/^\[Low Confidence\]\s*/i, "");
}

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
  const [showBuy,      setShowBuy]      = useState(false);
  const [showList,     setShowList]     = useState(false);
  const [showOffer,    setShowOffer]    = useState(false);
  const [cancelling,   setCancelling]   = useState(false);
  const [cancelError,  setCancelError]  = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const { openConnectModal }     = useConnectModal();
  const { writeContractAsync }   = useWriteContract();
  const publicClient             = usePublicClient();

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

  // Format price for display.
  // Seaport orders store raw token amounts; divide by 10^decimals before display.
  if (seaportOrder) {
    console.log("[CedarX price debug]", {
      rawPrice: seaportOrder.price,
      paymentTokenDecimals: seaportOrder.paymentTokenDecimals,
      paymentTokenSymbol: seaportOrder.paymentTokenSymbol,
      computed: Number(seaportOrder.price) / Math.pow(10, seaportOrder.paymentTokenDecimals || 6),
    });
  }
  const displayPrice = hasSeaport
    ? formatTokenPrice(
        Number(seaportOrder!.price) / Math.pow(10, seaportOrder!.paymentTokenDecimals || 6),
        seaportOrder!.paymentTokenSymbol
      )
    : hasCedarX
    ? formatTokenPrice(asset.currentListingPrice, asset.currentListingPaymentTokenSymbol ?? "USDC")
    : null;

  async function cancelListing() {
    if (!address || !publicClient) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const hash = await writeContractAsync({
        address: SEAPORT_ADDRESS,
        abi: SEAPORT_ABI,
        functionName: "incrementCounter",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err) {
      setCancelError(
        err instanceof Error
          ? (err.message.toLowerCase().includes("user rejected") || err.message.toLowerCase().includes("user denied")
              ? "Transaction cancelled."
              : err.message.slice(0, 100))
          : "Cancel failed."
      );
    } finally {
      setCancelling(false);
    }
  }

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
            Last sale: {formatUSDC(asset.lastSalePrice)}
          </p>
        )}
        {!hasListing && asset.lastSalePrice == null && (
          <p className="text-cedar-muted text-sm italic">
            {asset.tokenId
              ? "Not currently listed — make an offer below."
              : "Not currently listed."}
          </p>
        )}
        {hasListing && asset.chain === "polygon" && (
          <p className="text-cedar-muted/60 text-xs mt-1">Payment in USDC on Polygon</p>
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

        {isConnected && ownsAsset && hasListing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 px-4 border border-cedar-border">
              <span className="text-cedar-muted text-sm">Your listing</span>
              <span className="font-mono text-cedar-text font-medium">{displayPrice}</span>
            </div>
            <button
              onClick={() => void cancelListing()}
              disabled={cancelling}
              className="btn-ghost w-full justify-center py-2.5 text-sm text-cedar-red/80 hover:text-cedar-red border-cedar-red/30 hover:border-cedar-red/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {cancelling ? <><Loader2 size={13} className="animate-spin" /> Cancelling…</> : "Cancel listing"}
            </button>
            {cancelError && (
              <p className="flex items-center gap-1.5 text-cedar-red text-xs">
                <AlertCircle size={11} /> {cancelError}
              </p>
            )}
          </div>
        )}

        {isConnected && ownsAsset && !hasListing && (
          <button
            onClick={() => setShowList(true)}
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold"
          >
            List for sale
          </button>
        )}

        {!hasListing && !ownsAsset && asset.tokenId && (
          <button
            onClick={() => setShowOffer(true)}
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold"
          >
            Make Offer
          </button>
        )}
        {!hasListing && !ownsAsset && !asset.tokenId && (
          <button
            disabled
            className="btn-primary w-full justify-center py-3.5 text-sm font-semibold opacity-40 cursor-not-allowed"
          >
            Make Offer
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
          <p className="flex items-center gap-2 text-cedar-muted/60 text-[11px] font-mono min-w-0">
            <Tag size={10} className="shrink-0" />
            <span className="truncate">Token #{asset.tokenId}</span>
          </p>
        )}
        <p className="flex items-center gap-2 text-cedar-muted/60 text-[11px]">
          <Globe size={10} /> {asset.chain} · {asset.tokenStandard}
        </p>
      </div>

      {/* View on OpenSea — works for all protocols */}
      {asset.tokenId && (
        <a
          href={`https://opensea.io/assets/${asset.chain === "polygon" ? "matic" : asset.chain}/${asset.contractAddress}/${asset.tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cedar-muted/50 hover:text-cedar-muted text-[11px] transition-colors py-2"
        >
          View on OpenSea <ExternalLink size={10} />
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
      {showOffer && asset.tokenId && (
        <OfferModal
          asset={asset}
          onClose={() => setShowOffer(false)}
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
  // imgGwIdx tracks how many IPFS gateways we've tried (0 = original URL)
  const [imgGwIdx,  setImgGwIdx]  = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8" style={{ paddingTop: "calc(66px + 2rem)" }}>
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
        <span className="text-cedar-text truncate">{stripLowConfidence(asset.name)}</span>
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
            {(() => {
              // Resolve the current src: original URL on first attempt, then
              // cycle through IPFS gateways on each onError callback.
              const src = imgGwIdx === 0
                ? asset.imageUrl
                : (asset.imageUrl ? nextIpfsUrl(asset.imageUrl, imgGwIdx) : null);
              return src && !imgFailed ? (
                <img
                  src={src}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                  onError={() => {
                    if (!asset.imageUrl) return setImgFailed(true);
                    const next = nextIpfsUrl(asset.imageUrl, imgGwIdx + 1);
                    if (next) setImgGwIdx(imgGwIdx + 1);
                    else setImgFailed(true);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-cedar-muted/40 font-mono text-xs tracking-widest uppercase">
                    {asset.category.replace(/-/g, " ")}
                  </span>
                </div>
              );
            })()}
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
            {stripLowConfidence(asset.name)}
          </h1>

          {/* Actions (price + buy/sell buttons + contract info) */}
          <AssetActions asset={asset} />

          {/* Description */}
          {asset.description && (
            <div>
              <h3 className="text-cedar-muted text-[10px] tracking-widest uppercase mb-3">
                Description
              </h3>
              <p className="text-cedar-muted text-sm leading-relaxed">{stripMarkdown(asset.description)}</p>
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
