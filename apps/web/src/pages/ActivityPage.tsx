/**
 * ActivityPage — /activity
 *
 * Shows the connected wallet's Seaport activity on CedarX:
 *   My Listings — active + historical listings (seaport_orders by seller)
 *   My Offers   — offers placed by the wallet (seaport_offers by offerer)
 *   My Assets   — NFTs in the wallet from whitelisted protocols
 *
 * Unauthenticated visitors see a centred "Connect wallet" prompt.
 */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Loader2,
  AlertCircle,
  Tag,
  MessageSquare,
  Wallet,
  ExternalLink,
  X,
  CheckCircle,
} from "lucide-react";

import {
  fetchUserListings,
  fetchUserOffers,
  cancelUserListing,
  cancelUserOffer,
  type UserListing,
  type UserOffer,
} from "@/lib/api";
import { useWalletNFTs } from "@/hooks/useWalletNFTs";
import { SEAPORT_ADDRESS, SEAPORT_CANCEL_ABI } from "@/config/contracts";
import { formatTokenPrice, formatDate, truncateAddress } from "@/lib/formatters";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "listings" | "offers" | "assets";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceHuman(price: string, decimals: number): number {
  return Number(price) / Math.pow(10, decimals);
}

/** Convert stored order parameters (BigInts stored as strings) to cancel-compatible form */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCancelComponents(parameters: Record<string, unknown>): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = parameters as any;
  return {
    offerer:      p.offerer as `0x${string}`,
    zone:         p.zone   as `0x${string}`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    offer: (p.offer as any[]).map((item: any) => ({
      itemType:             Number(item.itemType),
      token:                item.token as `0x${string}`,
      identifierOrCriteria: BigInt(item.identifierOrCriteria),
      startAmount:          BigInt(item.startAmount),
      endAmount:            BigInt(item.endAmount),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    consideration: (p.consideration as any[]).map((item: any) => ({
      itemType:             Number(item.itemType),
      token:                item.token as `0x${string}`,
      identifierOrCriteria: BigInt(item.identifierOrCriteria),
      startAmount:          BigInt(item.startAmount),
      endAmount:            BigInt(item.endAmount),
      recipient:            item.recipient as `0x${string}`,
    })),
    orderType:  Number(p.orderType),
    startTime:  BigInt(p.startTime),
    endTime:    BigInt(p.endTime),
    zoneHash:   p.zoneHash    as `0x${string}`,
    salt:       BigInt(p.salt),
    conduitKey: p.conduitKey  as `0x${string}`,
    counter:    BigInt(p.counter),
  };
}

function parseError(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message.toLowerCase().includes("user rejected") ||
      err.message.toLowerCase().includes("user denied")
    ) return "Cancelled.";
    const first = err.message.split("\n")[0];
    return first.length > 120 ? first.slice(0, 120) + "…" : first;
  }
  return "Something went wrong.";
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:    "text-emerald-600 bg-emerald-50 border-emerald-200",
    filled:    "text-blue-600 bg-blue-50 border-blue-200",
    accepted:  "text-blue-600 bg-blue-50 border-blue-200",
    cancelled: "text-cedar-muted bg-cedar-surface border-cedar-border",
    expired:   "text-cedar-muted bg-cedar-surface border-cedar-border",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-sans tracking-widest uppercase border ${styles[status] ?? styles.expired}`}
    >
      {status}
    </span>
  );
}

// ─── Cancel Listing Button ────────────────────────────────────────────────────

function CancelListingButton({
  listing,
  onSuccess,
}: {
  listing: UserListing;
  onSuccess: () => void;
}) {
  const publicClient  = usePublicClient();
  const chainId       = useChainId();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [done,    setDone]    = useState(false);

  const handleCancel = useCallback(async () => {
    if (!listing.orderParameters?.parameters) return;
    setLoading(true);
    setError(null);
    try {
      const listingChainId = listing.chain === "polygon" ? 137 : 1;
      if (chainId !== listingChainId) {
        throw new Error(
          `Switch wallet to ${listing.chain === "polygon" ? "Polygon" : "Ethereum"} to cancel this listing.`
        );
      }
      const components = buildCancelComponents(listing.orderParameters.parameters);
      const txHash = await writeContractAsync({
        address:      SEAPORT_ADDRESS,
        abi:          SEAPORT_CANCEL_ABI,
        functionName: "cancel",
        args:         [[components]],
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      await cancelUserListing(listing.orderHash);
      setDone(true);
      onSuccess();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [listing, chainId, writeContractAsync, publicClient, onSuccess]);

  if (done) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-cedar-muted">
        <CheckCircle size={12} className="text-emerald-500" /> Cancelled
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => void handleCancel()}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[11px] font-sans tracking-wide
          border border-cedar-border text-cedar-muted px-3 py-1.5
          hover:border-cedar-red/50 hover:text-cedar-red transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
        Cancel
      </button>
      {error && <p className="text-[10px] text-cedar-red max-w-[160px] text-right">{error}</p>}
    </div>
  );
}

// ─── Cancel Offer Button ──────────────────────────────────────────────────────

function CancelOfferButton({
  offer,
  onSuccess,
}: {
  offer: UserOffer;
  onSuccess: () => void;
}) {
  const publicClient  = usePublicClient();
  const chainId       = useChainId();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [done,    setDone]    = useState(false);

  const handleCancel = useCallback(async () => {
    if (!offer.orderParameters?.parameters) return;
    setLoading(true);
    setError(null);
    try {
      // Infer chain from the offer's asset, defaulting to current wallet chain
      const offerChain = offer.asset?.chain ?? (chainId === 137 ? "polygon" : "ethereum");
      const offerChainId = offerChain === "polygon" ? 137 : 1;
      if (chainId !== offerChainId) {
        throw new Error(
          `Switch wallet to ${offerChainId === 137 ? "Polygon" : "Ethereum"} to cancel this offer.`
        );
      }
      const components = buildCancelComponents(offer.orderParameters.parameters);
      const txHash = await writeContractAsync({
        address:      SEAPORT_ADDRESS,
        abi:          SEAPORT_CANCEL_ABI,
        functionName: "cancel",
        args:         [[components]],
      });
      await publicClient?.waitForTransactionReceipt({ hash: txHash });
      await cancelUserOffer(offer.id);
      setDone(true);
      onSuccess();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setLoading(false);
    }
  }, [offer, chainId, writeContractAsync, publicClient, onSuccess]);

  if (done) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-cedar-muted">
        <CheckCircle size={12} className="text-emerald-500" /> Cancelled
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={() => void handleCancel()}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[11px] font-sans tracking-wide
          border border-cedar-border text-cedar-muted px-3 py-1.5
          hover:border-cedar-red/50 hover:text-cedar-red transition-colors
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
        Cancel
      </button>
      {error && <p className="text-[10px] text-cedar-red max-w-[160px] text-right">{error}</p>}
    </div>
  );
}

// ─── Asset thumbnail ──────────────────────────────────────────────────────────

function AssetThumb({ imageUrl, name }: { imageUrl?: string | null; name?: string | null }) {
  const [imgError, setImgError] = useState(false);
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name ?? ""}
        className="w-20 h-20 object-cover border border-cedar-border shrink-0"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-20 h-20 bg-cedar-surface-alt border border-cedar-border shrink-0 flex items-center justify-center">
      <span className="text-cedar-muted/30 text-[8px] font-mono uppercase tracking-widest">NFT</span>
    </div>
  );
}

// ─── My Listings Tab ──────────────────────────────────────────────────────────

function ListingsTab({ address }: { address: string }) {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-listings", address],
    queryFn:  () => fetchUserListings(address),
    staleTime: 30_000,
  });

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["user-listings", address] });
  }, [qc, address]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-cedar-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-8 text-cedar-muted text-sm">
        <AlertCircle size={14} /> Failed to load listings.
      </div>
    );
  }

  const allListings = data?.data ?? [];

  // Deduplicate: keep only the most recent listing per asset
  const seen = new Set<string>();
  const listings = [...allListings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((l) => {
      const key = l.assetId ?? l.orderHash;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  if (listings.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <Tag size={24} className="mx-auto text-cedar-muted/40" />
        <p className="text-cedar-muted text-sm">No listings yet.</p>
        <p className="text-cedar-muted/60 text-xs">
          List an asset from{" "}
          <Link to="/sell" className="text-cedar-amber underline-offset-2 hover:underline">
            the Sell page
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-2">
        <div className="w-20" />
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase">Asset</span>
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase text-right">Price</span>
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase text-center">Status</span>
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase text-right">Listed</span>
        <div className="w-20" />
      </div>

      {listings.map((listing) => {
        const humanPrice = priceHuman(listing.price, listing.paymentTokenDecimals);
        return (
          <div
            key={listing.orderHash}
            className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto]
              gap-3 sm:gap-4 items-start sm:items-center px-4 py-3 border border-cedar-border
              overflow-hidden hover:bg-cedar-surface transition-colors"
          >
            <AssetThumb imageUrl={listing.asset?.image_url} name={listing.asset?.name} />

            <div className="min-w-0 w-full">
              <p className="text-cedar-text text-sm font-medium truncate">
                {listing.asset?.name ?? truncateAddress(listing.assetId ?? undefined)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-cedar-text text-sm font-mono">
                {formatTokenPrice(humanPrice, listing.paymentTokenSymbol)}
              </p>
              <p className="text-cedar-muted/60 text-[10px]">{listing.paymentTokenSymbol}</p>
            </div>

            <div className="flex justify-center">
              <StatusBadge status={listing.status} />
            </div>

            <p className="text-cedar-muted text-xs text-right whitespace-nowrap">
              {formatDate(listing.createdAt)}
            </p>

            <div className="flex justify-end">
              {listing.status === "active" && (
                <CancelListingButton listing={listing} onSuccess={refetch} />
              )}
            </div>
          </div>
        );
      })}

      <p className="text-cedar-muted/40 text-[11px] pt-2 text-right">
        Cancelling a listing submits a cancel transaction on-chain. Gas fees apply.
      </p>
    </div>
  );
}

// ─── My Offers Tab ────────────────────────────────────────────────────────────

function OffersTab({ address }: { address: string }) {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-offers", address],
    queryFn:  () => fetchUserOffers(address),
    staleTime: 30_000,
  });

  const refetch = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["user-offers", address] });
  }, [qc, address]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-cedar-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-8 text-cedar-muted text-sm">
        <AlertCircle size={14} /> Failed to load offers.
      </div>
    );
  }

  const offers = data?.data ?? [];

  if (offers.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <MessageSquare size={24} className="mx-auto text-cedar-muted/40" />
        <p className="text-cedar-muted text-sm">No offers made yet.</p>
        <p className="text-cedar-muted/60 text-xs">
          Browse{" "}
          <Link to="/explore?listingFilter=unlisted" className="text-cedar-amber underline-offset-2 hover:underline">
            unlisted assets
          </Link>{" "}
          to submit an offer.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="hidden sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-4 py-2">
        <div className="w-20" />
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase">Asset</span>
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase text-right">Offer</span>
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase text-center">Status</span>
        <span className="text-cedar-muted text-[10px] tracking-widest uppercase text-right">Expires</span>
        <div className="w-20" />
      </div>

      {offers.map((offer) => {
        const humanAmount = priceHuman(offer.amount, offer.paymentTokenDecimals);
        return (
          <div
            key={offer.id}
            className="flex flex-col sm:grid sm:grid-cols-[auto_1fr_auto_auto_auto_auto]
              gap-3 sm:gap-4 items-start sm:items-center px-4 py-3 border border-cedar-border
              overflow-hidden hover:bg-cedar-surface transition-colors"
          >
            <AssetThumb imageUrl={offer.asset?.image_url} name={offer.asset?.name} />

            <div className="min-w-0 w-full">
              <p className="text-cedar-text text-sm font-medium truncate">
                {offer.asset?.name ?? truncateAddress(offer.assetId ?? undefined)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-cedar-text text-sm font-mono">
                {formatTokenPrice(humanAmount, offer.paymentTokenSymbol)}
              </p>
              <p className="text-cedar-muted/60 text-[10px]">{offer.paymentTokenSymbol}</p>
            </div>

            <div className="flex justify-center">
              <StatusBadge status={offer.status} />
            </div>

            <p className="text-cedar-muted text-xs text-right whitespace-nowrap">
              {formatDate(offer.expiresAt)}
            </p>

            <div className="flex justify-end">
              {offer.status === "active" && (
                <CancelOfferButton offer={offer} onSuccess={refetch} />
              )}
            </div>
          </div>
        );
      })}

      <p className="text-cedar-muted/40 text-[11px] pt-2 text-right">
        Cancelling an offer submits a cancel transaction on-chain. Gas fees apply.
      </p>
    </div>
  );
}

// ─── NFT card image (full-width for the assets grid) ─────────────────────────

function NftCardImage({ imageUrl, name }: { imageUrl?: string | null; name?: string | null }) {
  const [imgError, setImgError] = useState(false);
  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={name ?? ""}
        className="w-full aspect-square object-cover border-b border-cedar-border"
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className="w-full aspect-square bg-cedar-surface-alt border-b border-cedar-border flex flex-col items-center justify-center gap-1">
      <span className="text-cedar-muted/20 text-[10px] font-mono uppercase tracking-widest">Image unavailable</span>
    </div>
  );
}

// ─── My Assets Tab ────────────────────────────────────────────────────────────

function AssetsTab() {
  const { data: nfts, isLoading, isError } = useWalletNFTs();

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={20} className="animate-spin text-cedar-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-8 text-cedar-muted text-sm">
        <AlertCircle size={14} /> Failed to scan wallet NFTs.
      </div>
    );
  }

  const assets = nfts ?? [];

  if (assets.length === 0) {
    return (
      <div className="py-16 text-center space-y-3">
        <Wallet size={24} className="mx-auto text-cedar-muted/40" />
        <p className="text-cedar-muted text-sm">No tokenized land found in this wallet.</p>
        <p className="text-cedar-muted/60 text-xs">
          Only tokenized land parcels appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {assets.map((nft) => {
        const key = `${nft.contractAddress}-${nft.tokenId}`;
        return (
          <div
            key={key}
            className="flex flex-col border border-cedar-border bg-cedar-surface hover:bg-cedar-surface/80 transition-colors"
          >
            {/* Image */}
            <NftCardImage imageUrl={nft.imageUrl} name={nft.name} />

            <div className="p-2 sm:p-3 flex-1 flex flex-col gap-2">
              <div className="min-w-0">
                <p className="text-cedar-text text-xs sm:text-sm font-medium truncate">{nft.name}</p>
                <p className="text-cedar-muted text-[10px] sm:text-xs">{nft.protocol} · {nft.chain}</p>
              </div>

              <Link
                to="/sell"
                className="mt-auto inline-flex items-center justify-center gap-1 text-xs sm:text-sm font-sans
                  tracking-wide border border-cedar-amber/40 text-cedar-amber px-2 py-1.5 sm:px-3
                  hover:bg-cedar-amber hover:text-cedar-bg transition-colors"
              >
                <ExternalLink size={10} />
                List for sale
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ActivityPage ─────────────────────────────────────────────────────────────

export function ActivityPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("listings");

  // ── Unauthenticated guard ──────────────────────────────────────────────────
  if (!isConnected || !address) {
    return (
      <div
        className="max-w-[1440px] mx-auto px-6 pb-24 flex items-center justify-center"
        style={{ paddingTop: "calc(66px + 48px)", minHeight: "70vh" }}
      >
        <div className="text-center space-y-5 max-w-xs">
          <Wallet size={36} className="mx-auto text-cedar-muted/40" />
          <div>
            <p
              style={{
                fontFamily: "Cormorant Garamond, Georgia, serif",
                fontWeight: 300,
                fontSize:   "clamp(1.4rem, 3vw, 2rem)",
                letterSpacing: "-0.01em",
                color: "#1C1710",
                marginBottom: "8px",
              }}
            >
              Connect wallet to view your activity
            </p>
            <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(28,23,16,0.50)" }}>
              Track your listings, offers, and assets.
            </p>
          </div>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string }[] = [
    { id: "listings", label: "My Listings" },
    { id: "offers",   label: "My Offers"   },
    { id: "assets",   label: "My Assets"   },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-6 pb-24" style={{ paddingTop: "calc(66px + 48px)" }}>
      {/* Page header */}
      <div style={{ marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily:    "Cormorant Garamond, Georgia, serif",
            fontWeight:    300,
            fontSize:      "clamp(2rem, 4vw, 3.5rem)",
            letterSpacing: "-0.02em",
            color:         "#1C1710",
            marginBottom:  "8px",
          }}
        >
          My activity
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 300,
            fontSize:   "17px",
            color:      "rgba(28,23,16,0.50)",
          }}
        >
          {truncateAddress(address)}
        </p>
      </div>

      <div className="divider mb-8" />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 text-xs font-sans tracking-wide border transition-colors duration-150 ${
              tab === id
                ? "bg-cedar-amber text-cedar-bg border-cedar-amber"
                : "border-cedar-border text-cedar-muted hover:border-cedar-muted hover:text-cedar-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "listings" && <ListingsTab address={address} />}
      {tab === "offers"   && <OffersTab   address={address} />}
      {tab === "assets"   && <AssetsTab />}
    </div>
  );
}
