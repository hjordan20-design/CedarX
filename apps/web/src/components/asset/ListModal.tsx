import {
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import { useState } from "react";
import { useListAsset, type ListStep } from "@/hooks/useListAsset";
import type { TokenStandard } from "@/lib/types";

interface ListModalProps {
  assetName: string;
  contractAddress: `0x${string}`;
  tokenId: string;
  tokenStandard: TokenStandard;
  onClose: () => void;
}

const STEP_LABELS = ["Approve NFT transfer", "Submit listing", "Complete"];

function stepIndex(step: ListStep): number {
  if (step === "success") return 2;
  if (step === "listing" || step === "pending-list") return 1;
  return 0;
}

function stepLabel(step: ListStep): string {
  switch (step) {
    case "approving-nft":         return "Approve in wallet…";
    case "pending-nft-approval":  return "Waiting for approval…";
    case "listing":               return "Confirm in wallet…";
    case "pending-list":          return "Processing…";
    default:                      return "";
  }
}

const isProcessing = (step: ListStep) =>
  ["approving-nft", "pending-nft-approval", "listing", "pending-list"].includes(step);

export function ListModal({
  assetName,
  contractAddress,
  tokenId,
  tokenStandard,
  onClose,
}: ListModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const priceUsdc = priceInput ? parseFloat(priceInput) : null;

  const { step, execute, reset, error, listTxHash } = useListAsset({
    contractAddress,
    tokenId,
    tokenStandard,
    priceUsdc,
  });

  const current = stepIndex(step);
  const canDismiss = step === "idle" || step === "success" || step === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-cedar-bg/80 backdrop-blur-sm"
        onClick={canDismiss ? onClose : undefined}
      />

      <div className="relative z-10 w-full max-w-md bg-cedar-surface" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cedar-border">
          <h2 className="font-sans font-medium text-cedar-text text-sm tracking-wide">
            List for sale
          </h2>
          <button
            onClick={onClose}
            className="text-cedar-muted hover:text-cedar-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="border-b border-cedar-border pb-4">
            <p className="text-cedar-text text-sm font-medium truncate">{assetName}</p>
            <p className="text-cedar-muted text-xs mt-0.5">
              Token #{tokenId} · {tokenStandard}
            </p>
          </div>

          {/* Price input */}
          {step === "idle" && (
            <div>
              <label className="block text-cedar-muted text-[10px] tracking-widest uppercase mb-2">
                Asking price (USDC)
              </label>
              <div className="relative">
                <DollarSign
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cedar-muted/60"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-cedar-bg border border-cedar-border pl-8 pr-4 py-2.5
                    text-cedar-text font-mono text-sm
                    focus:outline-none focus:border-cedar-amber transition-colors
                    placeholder:text-cedar-muted/40"
                />
              </div>
            </div>
          )}

          {/* Step progress */}
          {!isProcessing(step) && step !== "idle" && step !== "error" && (
            <div className="space-y-2.5">
              {STEP_LABELS.map((label, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-sm transition-colors ${
                    i < current
                      ? "text-cedar-green"
                      : i === current
                      ? "text-cedar-text"
                      : "text-cedar-muted/40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 shrink-0 flex items-center justify-center border ${
                      i < current
                        ? "border-cedar-green bg-cedar-green/10"
                        : i === current
                        ? "border-cedar-amber"
                        : "border-cedar-border/40"
                    }`}
                  >
                    {i < current ? (
                      <CheckCircle size={11} className="text-cedar-green" />
                    ) : i === current &&
                      (step === "pending-nft-approval" || step === "pending-list") ? (
                      <Loader2 size={11} className="animate-spin text-cedar-amber" />
                    ) : (
                      <span className="text-[10px] font-mono">{i + 1}</span>
                    )}
                  </div>
                  {label}
                </div>
              ))}
            </div>
          )}

          {isProcessing(step) && (
            <div className="space-y-2.5">
              {STEP_LABELS.map((label, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-sm ${
                    i < current
                      ? "text-cedar-green"
                      : i === current
                      ? "text-cedar-text"
                      : "text-cedar-muted/40"
                  }`}
                >
                  <div
                    className={`w-5 h-5 shrink-0 flex items-center justify-center border ${
                      i < current
                        ? "border-cedar-green bg-cedar-green/10"
                        : i === current
                        ? "border-cedar-amber"
                        : "border-cedar-border/40"
                    }`}
                  >
                    {i < current ? (
                      <CheckCircle size={11} className="text-cedar-green" />
                    ) : i === current &&
                      (step === "pending-nft-approval" || step === "pending-list") ? (
                      <Loader2 size={11} className="animate-spin text-cedar-amber" />
                    ) : (
                      <span className="text-[10px] font-mono">{i + 1}</span>
                    )}
                  </div>
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {step === "error" && error && (
            <div className="flex items-start gap-3 p-3 bg-cedar-red/10 border border-cedar-red/30 text-cedar-red text-sm">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={32} className="text-cedar-green mx-auto" />
              <p className="text-cedar-text font-medium">Listed successfully!</p>
              <p className="text-cedar-muted text-xs">
                Your asset is now visible to buyers on CedarX.
              </p>
              {listTxHash && (
                <a
                  href={`https://etherscan.io/tx/${listTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-cedar-amber text-xs hover:underline"
                >
                  View on Etherscan <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex gap-3">
          {step === "idle" && (
            <>
              <button
                onClick={onClose}
                className="btn-ghost flex-1 justify-center text-sm py-2.5"
              >
                Cancel
              </button>
              <button
                onClick={() => void execute()}
                disabled={!priceUsdc || priceUsdc <= 0}
                className="btn-primary flex-1 justify-center text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                List for ${priceInput || "—"} <ArrowRight size={13} />
              </button>
            </>
          )}

          {isProcessing(step) && (
            <button
              disabled
              className="btn-primary w-full justify-center text-sm py-2.5 opacity-70 cursor-not-allowed"
            >
              <Loader2 size={14} className="animate-spin" />
              {stepLabel(step)}
            </button>
          )}

          {step === "success" && (
            <button
              onClick={onClose}
              className="btn-primary w-full justify-center text-sm py-2.5"
            >
              Done
            </button>
          )}

          {step === "error" && (
            <>
              <button
                onClick={onClose}
                className="btn-ghost flex-1 justify-center text-sm py-2.5"
              >
                Close
              </button>
              <button
                onClick={() => reset()}
                className="btn-primary flex-1 justify-center text-sm py-2.5"
              >
                Try again
              </button>
            </>
          )}
        </div>

        {step === "idle" && (
          <p className="px-6 pb-5 text-cedar-muted/50 text-[11px]">
            A 1% marketplace fee is deducted from the sale price on completion.
          </p>
        )}
      </div>
    </div>
  );
}
