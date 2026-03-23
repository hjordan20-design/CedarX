import { X, ArrowRight, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { useBuyAsset, type BuyStep } from "@/hooks/useBuyAsset";
import { useFulfillSeaportOrder, type FulfillStep } from "@/hooks/useFulfillSeaportOrder";
import { formatUSDC, formatTokenPrice } from "@/lib/formatters";
import type { SeaportOrder } from "@/lib/types";
import { formatUnits } from "viem";

// ─── Shared helpers ───────────────────────────────────────────────────────────

const CEDARX_STEPS  = ["Approve USDC", "Confirm purchase", "Complete"];
const SEAPORT_STEPS = ["Approve token", "Confirm purchase", "Complete"];

function isProcessingCedarX(step: BuyStep) {
  return ["approving-usdc", "pending-usdc", "buying", "pending-buy"].includes(step);
}

function isProcessingSeaport(step: FulfillStep) {
  return ["approving-token", "pending-approval", "fulfilling", "pending-fulfill"].includes(step);
}

function seaportStepIndex(step: FulfillStep): number {
  if (step === "success") return 2;
  if (step === "fulfilling" || step === "pending-fulfill") return 1;
  return 0;
}

function cedarxStepIndex(step: BuyStep): number {
  if (step === "success") return 2;
  if (step === "buying" || step === "pending-buy") return 1;
  return 0;
}

// ─── StepList ─────────────────────────────────────────────────────────────────

function StepList({ labels, current, pendingSteps }: {
  labels: string[];
  current: number;
  pendingSteps: string[];
}) {
  return (
    <div className="space-y-2.5">
      {labels.map((label, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 text-sm transition-colors ${
            i < current  ? "text-cedar-green"
            : i === current ? "text-cedar-text"
            : "text-cedar-muted/40"
          }`}
        >
          <div className={`w-5 h-5 shrink-0 flex items-center justify-center border ${
            i < current   ? "border-cedar-green bg-cedar-green/10"
            : i === current ? "border-cedar-amber"
            : "border-cedar-border/40"
          }`}>
            {i < current ? (
              <CheckCircle size={11} className="text-cedar-green" />
            ) : i === current && pendingSteps.includes(label) ? (
              <Loader2 size={11} className="animate-spin text-cedar-amber" />
            ) : (
              <span className="text-[10px] font-mono">{i + 1}</span>
            )}
          </div>
          {label}
        </div>
      ))}
    </div>
  );
}

// ─── Price display helper ─────────────────────────────────────────────────────

function formatSeaportPrice(order: SeaportOrder): string {
  const decimals = order.paymentTokenDecimals || 6;
  const amount = Number(order.price) / Math.pow(10, decimals);
  return formatTokenPrice(amount, order.paymentTokenSymbol);
}

// ─── CedarX BuyModal (original flow) ─────────────────────────────────────────

interface CedarXBuyModalProps {
  assetName: string;
  listingId: bigint;
  priceUsdc: number;
  onClose: () => void;
}

function CedarXBuyContent({ assetName, listingId, priceUsdc, onClose }: CedarXBuyModalProps) {
  const { step, execute, reset, error, buyTxHash } = useBuyAsset(listingId, priceUsdc);
  const current    = cedarxStepIndex(step);
  const canDismiss = step === "idle" || step === "success" || step === "error";

  return (
    <>
      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center justify-between py-3 border-b border-cedar-border">
          <span className="text-cedar-muted text-sm truncate pr-4">{assetName}</span>
          <span className="font-mono text-cedar-text font-medium shrink-0">
            {formatUSDC(priceUsdc)} USDC
          </span>
        </div>

        {step !== "idle" && step !== "error" && (
          <StepList
            labels={CEDARX_STEPS}
            current={current}
            pendingSteps={["Waiting for approval…", "Processing…"]}
          />
        )}

        {step === "error" && error && (
          <div className="flex items-start gap-3 p-3 bg-cedar-red/10 border border-cedar-red/30 text-cedar-red text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4 space-y-3">
            <CheckCircle size={32} className="text-cedar-green mx-auto" />
            <p className="text-cedar-text font-medium">Purchase complete!</p>
            <p className="text-cedar-muted text-xs">The asset NFT has been transferred to your wallet.</p>
            {buyTxHash && (
              <a href={`https://etherscan.io/tx/${buyTxHash}`} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 text-cedar-amber text-xs hover:underline">
                View on Etherscan <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-5 flex gap-3">
        {step === "idle" && (
          <>
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm py-2.5">Cancel</button>
            <button onClick={() => void execute()} className="btn-primary flex-1 justify-center text-sm py-2.5">
              Buy for {formatUSDC(priceUsdc)} <ArrowRight size={13} />
            </button>
          </>
        )}
        {isProcessingCedarX(step) && (
          <button disabled className="btn-primary w-full justify-center text-sm py-2.5 opacity-70 cursor-not-allowed">
            <Loader2 size={14} className="animate-spin" /> Processing…
          </button>
        )}
        {step === "success" && (
          <button onClick={onClose} className="btn-primary w-full justify-center text-sm py-2.5">Done</button>
        )}
        {step === "error" && (
          <>
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm py-2.5">Close</button>
            <button onClick={() => { reset(); void execute(); }} className="btn-primary flex-1 justify-center text-sm py-2.5">
              Retry <ArrowRight size={13} />
            </button>
          </>
        )}
      </div>

      {step === "idle" && (
        <p className="px-6 pb-5 text-cedar-muted/50 text-[11px]">
          Payment in USDC on Ethereum mainnet. A 1.5% marketplace fee applies.
        </p>
      )}
    </>
  );
}

// ─── Seaport BuyModal content ─────────────────────────────────────────────────

interface SeaportBuyContentProps {
  assetName: string;
  order: SeaportOrder;
  onClose: () => void;
}

function SeaportBuyContent({ assetName, order, onClose }: SeaportBuyContentProps) {
  const { step, execute, reset, error, fulfillTxHash } = useFulfillSeaportOrder(order);
  const current    = seaportStepIndex(step);
  const canDismiss = step === "idle" || step === "success" || step === "error";
  const isNative   = order.paymentToken === "0x0000000000000000000000000000000000000000";

  const explorerBase =
    order.chain === "polygon" ? "https://polygonscan.com/tx/" : "https://etherscan.io/tx/";

  return (
    <>
      <div className="px-6 py-5 space-y-5">
        <div className="flex items-center justify-between py-3 border-b border-cedar-border">
          <span className="text-cedar-muted text-sm truncate pr-4">{assetName}</span>
          <span className="font-mono text-cedar-text font-medium shrink-0">
            {formatSeaportPrice(order)}
          </span>
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-2 text-xs text-cedar-muted">
          <span className="inline-flex items-center px-2 py-0.5 border border-cedar-border tracking-widest uppercase">
            via Seaport
          </span>
          {order.source === "opensea" && (
            <span className="text-cedar-muted/50">Listed on OpenSea</span>
          )}
        </div>

        {step !== "idle" && step !== "error" && (
          <StepList
            labels={isNative ? ["Confirm purchase", "Complete"] : SEAPORT_STEPS}
            current={isNative ? Math.max(0, current - 1) : current}
            pendingSteps={["Processing…"]}
          />
        )}

        {step === "error" && error && (
          <div className="flex items-start gap-3 p-3 bg-cedar-red/10 border border-cedar-red/30 text-cedar-red text-sm">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-4 space-y-3">
            <CheckCircle size={32} className="text-cedar-green mx-auto" />
            <p className="text-cedar-text font-medium">Purchase complete!</p>
            <p className="text-cedar-muted text-xs">The asset NFT has been transferred to your wallet.</p>
            {fulfillTxHash && (
              <a href={`${explorerBase}${fulfillTxHash}`} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1.5 text-cedar-amber text-xs hover:underline">
                View on explorer <ExternalLink size={11} />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="px-6 pb-5 flex gap-3">
        {step === "idle" && (
          <>
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm py-2.5">Cancel</button>
            <button onClick={() => void execute()} className="btn-primary flex-1 justify-center text-sm py-2.5">
              Buy for {formatSeaportPrice(order)} <ArrowRight size={13} />
            </button>
          </>
        )}
        {isProcessingSeaport(step) && (
          <button disabled className="btn-primary w-full justify-center text-sm py-2.5 opacity-70 cursor-not-allowed">
            <Loader2 size={14} className="animate-spin" /> Processing…
          </button>
        )}
        {step === "success" && (
          <button onClick={onClose} className="btn-primary w-full justify-center text-sm py-2.5">Done</button>
        )}
        {step === "error" && (
          <>
            <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm py-2.5">Close</button>
            <button onClick={() => { reset(); void execute(); }} className="btn-primary flex-1 justify-center text-sm py-2.5">
              Retry <ArrowRight size={13} />
            </button>
          </>
        )}
      </div>

      {step === "idle" && (
        <p className="px-6 pb-5 text-cedar-muted/50 text-[11px]">
          Seaport protocol transaction. Gas fees apply.
          {!isNative && ` Requires ${order.paymentTokenSymbol} in your wallet.`}
        </p>
      )}
    </>
  );
}

// ─── Unified BuyModal ─────────────────────────────────────────────────────────

interface BuyModalProps {
  assetName: string;
  // CedarX swap listing
  listingId?: bigint;
  priceUsdc?: number;
  // Seaport order (takes priority when present)
  seaportOrder?: SeaportOrder | null;
  onClose: () => void;
}

export function BuyModal({
  assetName,
  listingId,
  priceUsdc,
  seaportOrder,
  onClose,
}: BuyModalProps) {
  const useSeaport = !!seaportOrder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cedar-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-cedar-surface"
           style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-cedar-border">
          <h2 className="font-sans font-medium text-cedar-text text-sm tracking-wide">
            Purchase asset
          </h2>
          <button onClick={onClose} className="text-cedar-muted hover:text-cedar-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {useSeaport ? (
          <SeaportBuyContent
            assetName={assetName}
            order={seaportOrder!}
            onClose={onClose}
          />
        ) : listingId !== undefined && priceUsdc !== undefined ? (
          <CedarXBuyContent
            assetName={assetName}
            listingId={listingId}
            priceUsdc={priceUsdc}
            onClose={onClose}
          />
        ) : (
          <div className="px-6 py-8 text-center text-cedar-muted text-sm">
            No active listing found.
          </div>
        )}
      </div>
    </div>
  );
}
