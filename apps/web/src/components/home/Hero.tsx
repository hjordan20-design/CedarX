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

      {/* ── Atmosphere layers (back → front) ─────────────────────────── */}

      {/* 1. Dot grid — architectural depth across entire hero */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* 2. Primary amber halo — gallery spotlight on the headline */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 75% 95% at 36% 44%, rgba(196,133,42,0.10) 0%, rgba(196,133,42,0.045) 50%, transparent 72%)",
        }}
      />

      {/* 3. Cool blue-white accent — top-right depth + asymmetry */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 55% 65% at 90% 8%, rgba(150,170,200,0.05) 0%, transparent 65%)",
        }}
      />

      {/* 4. Horizontal light streak — light catching a dark wall */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: "52%",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(to right, transparent 5%, rgba(255,255,255,0.018) 28%, rgba(255,255,255,0.018) 72%, transparent 95%)",
        }}
      />

      {/* 5. Architectural circles — blueprint / gallery accent */}
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{ top: "-260px", left: "26%", width: "900px", height: "900px", opacity: 0.045 }}
        viewBox="0 0 900 900"
        fill="none"
      >
        <circle cx="450" cy="450" r="449" stroke="#C4852A" strokeWidth="1" />
        <circle cx="450" cy="450" r="334" stroke="#C4852A" strokeWidth="0.5" />
      </svg>

      {/* ── Content ─────────────────────────────────────────────────── */}

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-12">

        {/* Headline — letter-spacing opens up, pushes toward editorial */}
        <h1
          className="display text-display-lg text-cedar-text mb-6 animate-fade-up"
          style={{ animationDelay: "40ms", letterSpacing: "0.02em" }}
        >
          Real assets. <em className="not-italic text-cedar-amber">Onchain.</em>
        </h1>

        {/* Subtitle — deliberately soft, 60% presence */}
        <p
          className="text-cedar-muted/60 text-sm mb-10 animate-fade-up max-w-lg leading-relaxed"
          style={{ animationDelay: "100ms" }}
        >
          Browse and trade tokenized real estate, luxury goods, art, and collectibles.
          Connect your wallet. Buy with USDC.
        </p>

        {/* Search bar — translucent, editorial */}
        <div className="relative max-w-2xl mb-5 animate-fade-up" style={{ animationDelay: "160ms" }}>
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cedar-muted/50 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, location, brand…"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
            className="search-input w-full pl-11 pr-5 py-3 text-sm font-sans text-cedar-text placeholder:text-cedar-muted/40
                       focus:outline-none transition-all duration-300"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
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
                className={`px-3 py-1.5 text-xs font-sans tracking-wide border transition-all duration-300 ${
                  active
                    ? "bg-cedar-amber text-cedar-bg border-cedar-amber"
                    : "border-[rgba(255,255,255,0.08)] text-cedar-muted/70 hover:border-cedar-amber/40 hover:text-cedar-text"
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
