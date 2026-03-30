/**
 * /sell — Seller listing flow.
 *
 * 1. Connect wallet
 * 2. Scan wallet for RWA NFTs from whitelisted contracts
 * 3. Select an NFT to list
 * 4. Set price + payment token + duration
 * 5. Sign the Seaport order (gasless, off-chain EIP-712)
 * 6. CedarX stores the order and posts it to OpenSea
 *
 * Result: the listing is live on CedarX and on OpenSea / any Seaport marketplace.
 * CedarX earns a 1.5% fee, encoded into the Seaport order's consideration items.
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  DollarSign,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { useWalletNFTs, type WalletNFT } from "@/hooks/useWalletNFTs";
import { useCreateSeaportListing } from "@/hooks/useCreateSeaportListing";
import { useSeaportOrder } from "@/hooks/useSeaportOrder";
import { NATIVE_TOKEN, USDC_MAINNET, USDC_POLYGON, SEAPORT_ADDRESS, SEAPORT_ABI } from "@/config/contracts";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { formatTokenPrice } from "@/lib/formatters";

// ─── Payment token options ────────────────────────────────────────────────────

const ETH_OPTIONS = [
  { label: "ETH",  address: NATIVE_TOKEN, symbol: "ETH",  decimals: 18 },
  { label: "USDC", address: USDC_MAINNET, symbol: "USDC", decimals: 6  },
] as const;

const POLYGON_OPTIONS = [
  { label: "USDC", address: USDC_POLYGON, symbol: "USDC", decimals: 6 },
] as const;

// OpenSea's orderbook rejects orders with endTime > ~6 months in the future.
// "Until cancelled" maps to 180 days — the maximum accepted duration.
const DURATION_OPTIONS = [
  { label: "Until cancelled", seconds: 180 * 24 * 3600 },
  { label: "7 days",          seconds: 7   * 24 * 3600 },
  { label: "30 days",         seconds: 30  * 24 * 3600 },
  { label: "90 days",         seconds: 90  * 24 * 3600 },
];

const FEE_WALLET = (import.meta.env.VITE_CEDARX_FEE_WALLET || "") as `0x${string}`;

// Map Alchemy protocol labels → CedarX protocol slugs
const PROTOCOL_SLUG: Record<string, string> = {
  "Fabrica":     "fabrica",
  "4K Protocol": "4k",
  "Courtyard":   "courtyard",
};

// Map chain name → chainId
const CHAIN_ID: Record<string, number> = {
  "ethereum": 1,
  "polygon":  137,
};

// ─── NFT grid ─────────────────────────────────────────────────────────────────

function NFTCard({
  nft,
  selected,
  onClick,
}: {
  nft: WalletNFT;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left card overflow-hidden transition-all duration-200 ${
        selected
          ? "border-cedar-amber shadow-[0_0_0_1px_#C4852A]"
          : "hover:border-cedar-muted"
      }`}
    >
      <div className="aspect-square bg-cedar-surface-alt overflow-hidden">
        {nft.imageUrl ? (
          <img
            src={nft.imageUrl}
            alt={nft.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
            <span className="text-cedar-muted/50 font-mono text-xs tracking-widest uppercase">{nft.protocol}</span>
            <span className="text-cedar-muted/30 font-sans text-[10px]">Image unavailable</span>
          </div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-cedar-muted text-[10px] tracking-widest uppercase">{nft.protocol}</span>
          <VerifiedBadge label="Verified" />
        </div>
        <p className="text-cedar-text text-sm font-medium leading-snug line-clamp-2">{nft.name}</p>
        <p className="text-cedar-muted/60 text-[11px] font-mono truncate">#{nft.tokenId}</p>
      </div>
    </button>
  );
}

// ─── Listing form ─────────────────────────────────────────────────────────────

function ListingForm({
  nft,
  onBack,
}: {
  nft: WalletNFT;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [priceInput, setPriceInput]   = useState("");
  const [tokenIdx, setTokenIdx]       = useState(0);
  const [durationIdx, setDurationIdx] = useState(0); // "Until cancelled" default

  const paymentOptions = nft.chain === "polygon" ? POLYGON_OPTIONS : ETH_OPTIONS;
  const selectedToken  = paymentOptions[tokenIdx];
  const duration       = DURATION_OPTIONS[durationIdx];

  // Derive assetId early so hooks that depend on it come after
  const protocolSlug = PROTOCOL_SLUG[nft.protocol] ?? nft.protocol.toLowerCase();
  const nftChainId   = CHAIN_ID[nft.chain] ?? 1;
  const assetId      = `${protocolSlug}:${nftChainId}:${nft.contractAddress}:${nft.tokenId}`;

  const { step, execute, reset, error, orderHash } = useCreateSeaportListing();

  // Check for an existing active Seaport listing on this asset
  const { data: existingListing } = useSeaportOrder(assetId);
  const existingPrice = existingListing
    ? formatTokenPrice(
        Number(existingListing.price) / Math.pow(10, existingListing.paymentTokenDecimals || 6),
        existingListing.paymentTokenSymbol
      )
    : null;
  const [cancellingListing, setCancellingListing] = useState(false);
  const [cancelListingError, setCancelListingError] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function cancelExistingListing() {
    if (!publicClient) return;
    setCancellingListing(true);
    setCancelListingError(null);
    try {
      const hash = await writeContractAsync({
        address: SEAPORT_ADDRESS,
        abi: SEAPORT_ABI,
        functionName: "incrementCounter",
        args: [],
      });
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err) {
      setCancelListingError(
        err instanceof Error
          ? (err.message.toLowerCase().includes("user rejected") || err.message.toLowerCase().includes("user denied")
              ? "Transaction cancelled."
              : err.message.slice(0, 100))
          : "Cancel failed."
      );
    } finally {
      setCancellingListing(false);
    }
  }

  const priceValid = !!priceInput && parseFloat(priceInput) > 0;

  const feeEstimate = priceValid
    ? (parseFloat(priceInput) * 0.015).toLocaleString("en-US", { maximumFractionDigits: 6 })
    : null;

  async function handleSubmit() {
    if (!priceValid || !FEE_WALLET) return;
    await execute({
      assetId,
      contractAddress:      nft.contractAddress as `0x${string}`,
      tokenId:              nft.tokenId,
      tokenStandard:        nft.tokenStandard,
      paymentToken:         selectedToken.address as `0x${string}`,
      paymentTokenSymbol:   selectedToken.symbol,
      paymentTokenDecimals: selectedToken.decimals,
      priceHuman:           priceInput,
      durationSeconds:      duration.seconds,
      feeWallet:            FEE_WALLET,
    });
  }

  useEffect(() => {
    if (step === "success") window.scrollTo(0, 0);
  }, [step]);

  if (step === "success") {
    return (
      <div className="text-center space-y-5 py-12">
        <CheckCircle size={48} className="text-cedar-green mx-auto" />
        <h2 className="display text-2xl text-cedar-text">Listed successfully</h2>
        <p className="text-cedar-muted text-sm max-w-sm mx-auto px-4">
          Your asset is now live on CedarX and on OpenSea. Buyers can purchase it instantly.
        </p>
        <div className="flex items-center gap-3 justify-center pt-2">
          <button onClick={() => { reset(); navigate("/sell"); }} className="btn-ghost text-sm py-2.5 px-5">
            List another
          </button>
          <button onClick={() => navigate(`/assets/${assetId}`)} className="btn-primary text-sm py-2.5 px-5">
            View listing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate("/sell")}
        className="inline-flex items-center gap-1.5 text-cedar-muted hover:text-cedar-text text-sm transition-colors"
      >
        <ChevronLeft size={14} /> Back to my NFTs
      </button>

      {/* NFT preview */}
      <div className="flex items-center gap-4 p-4 border border-cedar-border bg-cedar-surface">
        {nft.imageUrl ? (
          <img src={nft.imageUrl} alt={nft.name} className="w-16 h-16 object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 bg-cedar-surface-alt shrink-0 flex flex-col items-center justify-center gap-1">
            <span className="text-cedar-muted/50 font-mono text-[10px] tracking-widest uppercase">{nft.protocol}</span>
            <span className="text-cedar-muted/30 font-sans text-[9px]">No image</span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-cedar-text font-medium text-sm truncate">{nft.name}</p>
          <p className="text-cedar-muted text-xs">{nft.protocol} · {nft.tokenStandard}</p>
        </div>
      </div>

      {/* Active listing warning */}
      {existingListing && (step === "idle" || step === "error") && (
        <div className="p-4 border border-cedar-amber/40 bg-cedar-amber/5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-cedar-amber" />
            <p className="text-cedar-text text-sm">
              This asset is already listed at{" "}
              <span className="font-mono font-medium">{existingPrice}</span>.
              You can update the price by listing again, or cancel the current listing first.
            </p>
          </div>
          <button
            onClick={() => void cancelExistingListing()}
            disabled={cancellingListing}
            className="btn-ghost text-sm py-2 px-4 text-cedar-red/80 hover:text-cedar-red border-cedar-red/30 hover:border-cedar-red/60 disabled:opacity-40"
          >
            {cancellingListing ? <><Loader2 size={12} className="animate-spin" /> Cancelling…</> : "Cancel current listing"}
          </button>
          {cancelListingError && (
            <p className="text-cedar-red text-xs flex items-center gap-1.5">
              <AlertCircle size={11} /> {cancelListingError}
            </p>
          )}
        </div>
      )}

      {/* Price */}
      <div className="space-y-2">
        <label className="block text-cedar-muted text-[10px] tracking-widest uppercase">
          Asking price
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-cedar-muted/60" />
            <input
              type="number"
              min="0"
              step="any"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="0.00"
              style={{ fontSize: "16px" }}
              className="w-full bg-cedar-bg border border-cedar-border pl-8 pr-4 py-2.5
                text-cedar-text font-mono
                focus:outline-none focus:border-cedar-amber transition-colors
                placeholder:text-cedar-muted/40"
            />
          </div>
          <select
            value={tokenIdx}
            onChange={(e) => setTokenIdx(Number(e.target.value))}
            className="bg-cedar-surface border border-cedar-border px-3 text-xs font-sans text-cedar-muted
              focus:outline-none focus:border-cedar-muted cursor-pointer"
          >
            {paymentOptions.map((opt, i) => (
              <option key={opt.label} value={i}>{opt.label}</option>
            ))}
          </select>
        </div>
        {feeEstimate && (
          <p className="text-cedar-muted/60 text-[11px]">
            CedarX fee (1.5%): {feeEstimate} {selectedToken.symbol} ·
            You receive: {(parseFloat(priceInput) * 0.985).toLocaleString("en-US", { maximumFractionDigits: 6 })} {selectedToken.symbol}
          </p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <label className="block text-cedar-muted text-[10px] tracking-widest uppercase">
          Listing duration
        </label>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map((opt, i) => (
            <button
              key={opt.label}
              onClick={() => setDurationIdx(i)}
              className={`px-3 py-1.5 text-xs font-sans border transition-colors ${
                durationIdx === i
                  ? "bg-cedar-amber text-cedar-bg border-cedar-amber"
                  : "border-cedar-border text-cedar-muted hover:border-cedar-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {step === "error" && error && (
        <div className="flex items-start gap-3 p-3 bg-cedar-red/10 border border-cedar-red/30 text-cedar-red text-sm">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Fee wallet warning */}
      {!FEE_WALLET && (
        <div className="flex items-start gap-3 p-3 bg-cedar-amber/10 border border-cedar-amber/30 text-cedar-amber/80 text-xs">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          <p>VITE_CEDARX_FEE_WALLET is not configured. Listings require a fee wallet address.</p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={() => void handleSubmit()}
        disabled={!priceValid || !FEE_WALLET || step === "signing" || step === "posting"}
        className="btn-primary w-full justify-center py-3.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {step === "signing" ? (
          <><Loader2 size={14} className="animate-spin" /> Sign in wallet…</>
        ) : step === "posting" ? (
          <><Loader2 size={14} className="animate-spin" /> Submitting listing…</>
        ) : (
          <>List on CedarX &amp; OpenSea</>
        )}
      </button>

      <p className="text-cedar-muted/50 text-[11px]">
        No gas fees — your signature creates the listing off-chain.
        It goes live on CedarX and OpenSea immediately.
      </p>
    </div>
  );
}

// ─── SellPage ─────────────────────────────────────────────────────────────────

export function SellPage() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: nfts, isLoading, isError } = useWalletNFTs();
  const [selectedNFT, setSelectedNFT] = useState<WalletNFT | null>(null);

  return (
    <div
      className="max-w-[1440px] mx-auto px-6 pb-24"
      style={{ paddingTop: "calc(66px + 48px)" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "40px" }}>
        <h1
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(2rem, 4vw, 3.5rem)",
            letterSpacing: "-0.02em",
            color: "#1C1710",
            marginBottom: "8px",
          }}
        >
          List an asset
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "17px",
            color: "rgba(28,23,16,0.50)",
          }}
        >
          List your asset for sale. Your listing goes live on CedarX and OpenSea
          instantly — no gas fees required.
        </p>
      </div>

      <div className="divider mb-8" />

      {/* Not connected */}
      {!isConnected && (
        <div className="max-w-md space-y-5 py-12">
          <Wallet size={32} className="text-cedar-amber/60" />
          <h2 className="display text-xl text-cedar-text">Connect your wallet</h2>
          <p className="text-cedar-muted text-sm">
            Connect a wallet containing tokenized land to create a listing.
          </p>
          <button
            onClick={openConnectModal}
            className="btn-primary inline-flex text-sm py-3 px-6"
          >
            Connect wallet
          </button>
        </div>
      )}

      {/* Connected — listing form */}
      {isConnected && selectedNFT && (
        <ListingForm nft={selectedNFT} onBack={() => setSelectedNFT(null)} />
      )}

      {/* Connected — NFT picker */}
      {isConnected && !selectedNFT && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={14} className="text-cedar-amber/60" />
            <p className="text-cedar-muted text-sm">
              Showing verified assets in your wallet.
            </p>
          </div>

          {isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-square bg-cedar-surface" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-cedar-surface w-16" />
                    <div className="h-4 bg-cedar-surface w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <div className="flex items-start gap-3 p-4 border border-cedar-border text-cedar-muted text-sm">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-cedar-red/60" />
              Failed to load your NFTs. Make sure your Alchemy API key is configured.
            </div>
          )}

          {!isLoading && !isError && nfts && nfts.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <p className="text-cedar-muted text-sm">
                No tokenized land found in this wallet.
              </p>
              <p className="text-cedar-muted/50 text-xs">
                Only tokenized land parcels are eligible for listing.
              </p>
            </div>
          )}

          {!isLoading && nfts && nfts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {nfts.map((nft) => (
                <NFTCard
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  nft={nft}
                  selected={false}
                  onClick={() => setSelectedNFT(nft)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
