import { X, ArrowRight, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useBuyAsset, type BuyStep } from "@/hooks/useBuyAsset";
import { formatUSDC } from "@/lib/formatters";

interface BuyModalProps {
  assetName: string;
  listingId: bigint;
  priceUsdc: number;
  onClose: () => void;
}

const STEP_LABELS = ["Approve USDC", "Confirm purchase", "Complete"];

function stepIndex(step: BuyStep): number {
  if (step === "success") return 2;
  if (step === "buying" || step === "pending-buy") return 1;
  return 0;
}

function stepLabel(step: BuyStep): string {
  switch (step) {
    case "approving-usdc":   return "Approve in wallet…";
    case "pending-usdc":     return "Waiting for approval…";
    case "buying":           return "Confirm in wallet…";
    case "pending-buy":      return "Processing…";
    default:                 return "";
  }
}

const isProcessing = (step: BuyStep) =>
  ["approving-usdc", "pending-usdc", "buying", "pending-buy"].includes(step);

export function BuyModal({ assetName, listingId, priceUsdc, onClose }: BuyModalProps) {
  const { step, execute, reset, error, buyTxHash } = useBuyAsset(listingId, priceUsdc);
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
            Purchase asset
          </h2>
          <button
            onClick={onClose}
            className="text-cedar-muted hover:text-cedar-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Asset + price summary */}
          <div className="flex items-center justify-between py-3 border-b border-cedar-border">
            <span className="text-cedar-muted text-sm truncate pr-4">{assetName}</span>
            <span className="font-mono text-cedar-text font-medium shrink-0">
              {formatUSDC(priceUsdc)}
            </span>
          </div>

          {/* Step progress (shown after idle) */}
          {step !== "idle" && step !== "error" && (
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
                    ) : i === current && (step === "pending-usdc" || step === "pending-buy") ? (
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
              <p className="text-cedar-text font-medium">Purchase complete!</p>
              <p className="text-cedar-muted text-xs">
                The asset NFT has been transferred to your wallet.
              </p>
              {buyTxHash && (
                <a
                  href={`https://etherscan.io/tx/${buyTxHash}`}
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
                className="btn-primary flex-1 justify-center text-sm py-2.5"
              >
                Buy for {formatUSDC(priceUsdc)} <ArrowRight size={13} />
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
                onClick={() => { reset(); void execute(); }}
                className="btn-primary flex-1 justify-center text-sm py-2.5"
              >
                Retry <ArrowRight size={13} />
              </button>
            </>
          )}
        </div>

        {step === "idle" && (
          <p className="px-6 pb-5 text-cedar-muted/50 text-[11px]">
            Payment in USDC on Ethereum mainnet. A 1% marketplace fee applies.
          </p>
        )}
      </div>
    </div>
  );
}
