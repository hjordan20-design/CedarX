import { ShieldCheck } from "lucide-react";

/**
 * Small "Verified" badge shown on assets from whitelisted protocol contracts
 * (Fabrica, 4K Protocol, Courtyard).
 */
export function VerifiedBadge({ label = "Verified" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] tracking-widest uppercase font-sans"
      style={{ color: "#C4852A", border: "1px solid rgba(196,133,42,0.30)", background: "rgba(196,133,42,0.06)" }}
      title="Asset from a verified protocol contract"
    >
      <ShieldCheck size={9} />
      {label}
    </span>
  );
}
