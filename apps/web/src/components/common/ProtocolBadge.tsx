import type { Protocol } from "@/lib/types";

const PROTOCOL_LABELS: Record<Protocol, string> = {
  fabrica:   "Fabrica",
  propy:     "Propy",
  roofstock: "Roofstock",
  courtyard: "Courtyard",
  "4k":      "4K Protocol",
  arianee:   "Arianee",
};

export function ProtocolBadge({ protocol }: { protocol?: Protocol }) {
  // Fabrica is backend infrastructure — don't surface it as a brand badge.
  // The CategoryTag ("REAL ESTATE") already identifies the asset type.
  if (!protocol || protocol === "fabrica") return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase font-sans border border-cedar-border text-cedar-muted bg-cedar-surface">
      {PROTOCOL_LABELS[protocol] ?? protocol}
    </span>
  );
}
