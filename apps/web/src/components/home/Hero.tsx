import { Search } from "lucide-react";
import type { AssetFilters, Category } from "@/lib/types";

const CATEGORY_PILLS: { value: Category | ""; label: string }[] = [
  { value: "",              label: "All" },
  { value: "real-estate",  label: "Real Estate" },
  { value: "luxury-goods", label: "Luxury Goods" },
  { value: "art",          label: "Art" },
  { value: "collectibles", label: "Collectibles" },
];

interface HeroProps {
  filters: AssetFilters;
  onFilterChange: (next: AssetFilters) => void;
}

export function Hero({ filters, onFilterChange }: HeroProps) {
  function set(partial: Partial<AssetFilters>) {
    onFilterChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <section className="relative bg-cedar-bg overflow-hidden">

      {/* ── Atmosphere ─────────────────────────────────────────────────── */}

      {/* Primary amber halo — gallery light on the headline */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 90% at 38% 42%, rgba(196,133,42,0.10) 0%, rgba(196,133,42,0.05) 50%, transparent 72%)",
        }}
      />

      {/* Top-right cool accent — depth + asymmetry */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 55% 65% at 88% 10%, rgba(255,255,255,0.025) 0%, transparent 65%)",
        }}
      />

      {/* Architectural circle — blueprint / gallery accent */}
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ top: "-260px", left: "28%", width: "860px", height: "860px", opacity: 0.04 }}
        viewBox="0 0 860 860"
        fill="none"
      >
        <circle cx="430" cy="430" r="429" stroke="#C4852A" strokeWidth="1" />
        <circle cx="430" cy="430" r="318" stroke="#C4852A" strokeWidth="0.6" />
      </svg>

      {/* ── Content ─────────────────────────────────────────────────────── */}

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-10">
        {/* Headline */}
        <h1 className="display text-display-lg text-cedar-text mb-2 animate-fade-up" style={{ animationDelay: "40ms" }}>
          Real assets. <em className="not-italic text-cedar-amber">Onchain.</em>
        </h1>
        <p className="text-cedar-muted text-sm mb-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
          Browse and trade tokenized real estate, luxury goods, art, and collectibles. Connect your wallet. Buy with USDC.
        </p>

        {/* Search bar */}
        <div className="relative max-w-2xl mb-4 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cedar-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, location, brand…"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
            className="w-full bg-cedar-surface border border-cedar-border pl-11 pr-5 py-3 text-sm font-sans text-cedar-text placeholder:text-cedar-muted/50
                       focus:outline-none focus:border-cedar-muted transition-colors duration-150"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2 animate-fade-up" style={{ animationDelay: "210ms" }}>
          {CATEGORY_PILLS.map((pill) => {
            const active = (filters.category ?? "") === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => set({ category: pill.value || undefined })}
                className={`px-3 py-1.5 text-xs font-sans tracking-wide border transition-colors duration-150 ${
                  active
                    ? "bg-cedar-amber text-cedar-bg border-cedar-amber"
                    : "border-cedar-border text-cedar-muted hover:border-cedar-muted hover:text-cedar-text"
                }`}
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
