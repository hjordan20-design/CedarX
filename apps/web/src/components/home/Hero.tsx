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

      {/* 1. Dot grid — fine architectural texture across entire hero */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
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

      {/* 5. Cartographic composition — bleeds off right edge, ~40% visible */}
      <svg
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: "50%",
          right: "-300px",
          transform: "translateY(-50%)",
          width: "760px",
          height: "760px",
        }}
        viewBox="0 0 760 760"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Soft amber glow centred on the composition */}
          <radialGradient id="comp-glow" cx="50%" cy="50%" r="50%" gradientUnits="userSpaceOnUse"
            x1="0" y1="0" x2="760" y2="0">
            <stop offset="0%"   stopColor="#C4852A" stopOpacity="0.06" />
            <stop offset="60%"  stopColor="#C4852A" stopOpacity="0.025" />
            <stop offset="100%" stopColor="#C4852A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient glow blob — 400px effective radius */}
        <circle cx="370" cy="380" r="400" fill="url(#comp-glow)" />

        {/* ── Diagonal survey lines ── */}
        <line x1="0"   y1="190" x2="760" y2="540" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="80"  y1="740" x2="620" y2="20"  stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        <line x1="0"   y1="470" x2="760" y2="310" stroke="rgba(255,255,255,0.025)" strokeWidth="1" />

        {/* ── Concentric offset circles (largest → smallest) ── */}
        {/* 600px Ø — outermost ring, loose and airy */}
        <circle cx="400" cy="370" r="300"
          stroke="rgba(196,133,42,0.08)" strokeWidth="1" />

        {/* 420px Ø — second ring, shifted down-left */}
        <circle cx="368" cy="400" r="210"
          stroke="rgba(196,133,42,0.10)" strokeWidth="1" />

        {/* 280px Ø — third ring, shifted up-right */}
        <circle cx="420" cy="335" r="140"
          stroke="rgba(196,133,42,0.12)" strokeWidth="1" />

        {/* 190px Ø — innermost ring */}
        <circle cx="385" cy="365" r="95"
          stroke="rgba(196,133,42,0.09)" strokeWidth="1" />

        {/* ── Pin dot — at the visual intersection of line 1 and the third circle arc ── */}
        {/*   Line 1 at x=295: y ≈ 190 + (350/760)*295 ≈ 336. Circle 3 at cx=420,cy=335,r=140:
              dist from (295,336) ≈ 125 — sits just inside the arc, near the crossing. */}
        <circle cx="297" cy="336" r="2.5" fill="rgba(196,133,42,0.45)" />
        {/* Tiny outer ring on the pin for a crosshair feel */}
        <circle cx="297" cy="336" r="6"
          stroke="rgba(196,133,42,0.18)" strokeWidth="0.75" />
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
