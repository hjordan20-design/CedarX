/**
 * OfferModal — native Seaport offer flow on CedarX.
 *
 * Allows any visitor to make a USDC offer on an unlisted (or listed) asset
 * without leaving CedarX.  The signed Seaport offer is posted to OpenSea so
 * the NFT owner sees it on every Seaport-compatible marketplace.
 *
 * Payment token:
 *   Polygon  → USDC.e (0x2791bca1…)
 *   Ethereum → USDC   (0xA0b869…)
 */

import { useState } from "react";
import { X, DollarSign, CheckCircle, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { useCreateSeaportOffer } from "@/hooks/useCreateSeaportOffer";
import type { Asset } from "@/lib/types";

const DURATION_OPTIONS = [
  { label: "1 day",   seconds: 1  * 24 * 3600 },
  { label: "3 days",  seconds: 3  * 24 * 3600 },
  { label: "7 days",  seconds: 7  * 24 * 3600 },
  { label: "30 days", seconds: 30 * 24 * 3600 },
] as const;

interface OfferModalProps {
  asset:   Asset;
  onClose: () => void;
}

export function OfferModal({ asset, onClose }: OfferModalProps) {
  const [amountInput, setAmountInput] = useState("");
  const [durationIdx, setDurationIdx] = useState(2); // 7 days default
  const [imgError,    setImgError]    = useState(false);

  const { step, execute, reset, error } = useCreateSeaportOffer();

  const amountValid = !!amountInput && parseFloat(amountInput) > 0;
  const chain       = (asset.chain === "polygon" ? "polygon" : "ethereum") as "ethereum" | "polygon";
  const usdcSymbol  = chain === "polygon" ? "USDC.e" : "USDC";
  const canDismiss  = step === "idle" || step === "success" || step === "error";

  const feeEstimate = amountValid
    ? (parseFloat(amountInput) * 0.015).toFixed(2)
    : null;
  const sellerReceives = amountValid
    ? (parseFloat(amountInput) * 0.985).toFixed(2)
    : null;

  async function handleSubmit() {
    if (!amountValid || !asset.tokenId) return;
    await execute({
      assetId:         asset.id,
      contractAddress: asset.contractAddress as `0x${string}`,
      tokenId:         asset.tokenId,
      tokenStandard:   asset.tokenStandard,
      chain,
      amountHuman:     amountInput,
      durationSeconds: DURATION_OPTIONS[durationIdx].seconds,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cedar-bg/80 backdrop-blur-sm"
        onClick={canDismiss ? onClose : undefined}
      />
      <div
        className="relative z-10 w-full max-w-md bg-cedar-surface"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cedar-border">
          <h2 className="font-sans font-medium text-cedar-text text-sm tracking-wide">
            Make an offer
          </h2>
          <button
            onClick={onClose}
            disabled={!canDismiss}
            className="text-cedar-muted hover:text-cedar-text transition-colors disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Asset preview ── */}
          <div className="flex items-center gap-3 py-3 border-b border-cedar-border">
            {asset.imageUrl && !imgError ? (
              <img
                src={asset.imageUrl}
                alt={asset.name}
                className="w-12 h-12 object-cover border border-cedar-border shrink-0"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-12 h-12 bg-cedar-surface-alt border border-cedar-border shrink-0 flex items-center justify-center">
                <span className="text-cedar-muted/30 text-[9px] font-mono uppercase tracking-widest">NFT</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-cedar-text text-sm font-medium truncate">{asset.name}</p>
              <p className="text-cedar-muted text-xs">{asset.chain} · {asset.tokenStandard}</p>
            </div>
          </div>

          {/* ── Success state ── */}
          {step === "success" ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={32} className="text-cedar-green mx-auto" />
              <p className="text-cedar-text font-medium">Offer submitted!</p>
              <p className="text-cedar-muted text-sm">
                Your offer is now live on CedarX and OpenSea.
                The seller can accept it at any time.
              </p>
            </div>
          ) : (
            <>
              {/* ── Amount input ── */}
              <div className="space-y-2">
                <label className="block text-cedar-muted text-[10px] tracking-widest uppercase">
                  Offer amount ({usdcSymbol})
                </label>
                <div className="relative">
                  <DollarSign
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-cedar-muted/60"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="0.00"
                    disabled={step === "signing" || step === "posting"}
                    className="w-full bg-cedar-bg border border-cedar-border pl-8 pr-4 py-2.5
                      text-cedar-text font-mono text-sm
                      focus:outline-none focus:border-cedar-amber transition-colors
                      placeholder:text-cedar-muted/40
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                {feeEstimate && (
                  <p className="text-cedar-muted/60 text-[11px]">
                    CedarX fee (1.5%): ${feeEstimate} ·{" "}
                    Seller receives: ${sellerReceives}
                  </p>
                )}
              </div>

              {/* ── Duration ── */}
              <div className="space-y-2">
                <label className="block text-cedar-muted text-[10px] tracking-widest uppercase">
                  Offer duration
                </label>
                <div className="flex gap-2">
                  {DURATION_OPTIONS.map((opt, i) => (
                    <button
                      key={opt.label}
                      onClick={() => setDurationIdx(i)}
                      disabled={step === "signing" || step === "posting"}
                      className={`px-3 py-1.5 text-xs font-sans border transition-colors
                        disabled:opacity-40 disabled:cursor-not-allowed ${
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

              {/* ── Error ── */}
              {step === "error" && error && (
                <div className="flex items-start gap-3 p-3 bg-cedar-red/10 border border-cedar-red/30 text-cedar-red text-sm">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 flex gap-3">
          {step === "success" ? (
            <button
              onClick={onClose}
              className="btn-primary w-full justify-center text-sm py-2.5"
            >
              Done
            </button>
          ) : step === "signing" || step === "posting" ? (
            <button
              disabled
              className="btn-primary w-full justify-center text-sm py-2.5 opacity-70 cursor-not-allowed"
            >
              <Loader2 size={14} className="animate-spin" />
              {step === "signing" ? "Sign in wallet…" : "Submitting offer…"}
            </button>
          ) : step === "error" ? (
            <>
              <button
                onClick={onClose}
                className="btn-ghost flex-1 justify-center text-sm py-2.5"
              >
                Close
              </button>
              <button
                onClick={reset}
                className="btn-primary flex-1 justify-center text-sm py-2.5"
              >
                Try again <ArrowRight size={13} />
              </button>
            </>
          ) : (
            // idle
            <>
              <button
                onClick={onClose}
                className="btn-ghost flex-1 justify-center text-sm py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!amountValid || !asset.tokenId}
                className="btn-primary flex-1 justify-center text-sm py-2.5
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit offer <ArrowRight size={13} />
              </button>
            </>
          )}
        </div>

        {step === "idle" && (
          <p className="px-6 pb-5 text-cedar-muted/50 text-[11px]">
            Gasless — your wallet signs the offer off-chain. No gas needed until the seller
            accepts. Requires {usdcSymbol} in your wallet at the time of acceptance.
          </p>
        )}
      </div>
    </div>
  );
}
