import { Search } from "lucide-react";
import type { AssetFilters, Category } from "@/lib/types";

// ─── Category pills ───────────────────────────────────────────────────────────
const CATEGORY_PILLS: { value: Category | ""; label: string }[] = [
  { value: "",              label: "All" },
  { value: "real-estate",  label: "Real Estate" },
  { value: "luxury-goods", label: "Luxury Goods" },
  { value: "collectibles", label: "Collectibles" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface HeroProps {
  filters: AssetFilters;
  onFilterChange: (next: AssetFilters) => void;
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero({ filters, onFilterChange }: HeroProps) {
  function set(partial: Partial<AssetFilters>) {
    onFilterChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <section
      className="px-6 lg:px-[80px]"
      style={{ paddingTop: "calc(66px + 16px)", paddingBottom: "12px" }}
    >
      <div style={{ maxWidth: "740px", margin: "0 auto", textAlign: "center" }}>
        {/* H1 */}
        <h1
          className="animate-fade-up"
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "#1C1710",
            marginBottom: "8px",
            animationDelay: "0.1s",
          }}
        >
          Real assets.<br />
          <em style={{ fontStyle: "italic", color: "#C4852A" }}>Onchain.</em>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up"
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "14px",
            lineHeight: 1.5,
            color: "rgba(28,23,16,0.50)",
            maxWidth: "480px",
            margin: "0 auto 10px",
            animationDelay: "0.22s",
          }}
        >
          Browse and trade tokenized real estate, luxury goods, and collectibles.
          Connect your wallet. Settle in USDC.
        </p>

        {/* Search bar */}
        <div
          className="animate-fade-up"
          style={{
            position: "relative",
            maxWidth: "700px",
            margin: "0 auto 8px",
            animationDelay: "0.34s",
          }}
        >
          <Search
            style={{
              position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
              width: "15px", height: "15px", pointerEvents: "none", color: "rgba(196,133,42,0.45)",
            }}
          />
          <input
            type="text"
            placeholder="Search by name, location, brand…"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
            className="search-input"
            style={{
              width: "100%",
              paddingLeft: "44px", paddingRight: "16px",
              paddingTop: "9px", paddingBottom: "9px",
              fontSize: "16px",
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 300,
              color: "#1C1710",
              background: "rgba(255,255,255,0.70)",
              border: "1px solid rgba(196,133,42,0.18)",
              borderBottom: "2px solid rgba(196,133,42,0.35)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              outline: "none",
              transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
            }}
          />
        </div>

        {/* Category pills */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex", flexWrap: "wrap", gap: "6px",
            justifyContent: "center",
            animationDelay: "0.46s",
          }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const active = (filters.category ?? "") === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => set({ category: pill.value || undefined })}
                style={{
                  padding: "6px 14px",
                  fontSize: "13px",
                  fontFamily: "DM Sans, system-ui, sans-serif",
                  letterSpacing: "0.03em",
                  border: active ? "1px solid #C4852A" : "1px solid rgba(196,133,42,0.22)",
                  background: active ? "#C4852A" : "rgba(255,255,255,0.60)",
                  color: active ? "#FFFFFF" : "rgba(28,23,16,0.52)",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
                }}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
