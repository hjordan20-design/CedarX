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

/** Faint topographic contour lines — right-side background element */
function TopoBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent 30%, rgba(0,0,0,0.6) 60%, black 80%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 30%, rgba(0,0,0,0.6) 60%, black 80%)",
      }}
    >
      <svg
        viewBox="0 0 900 700" fill="none" xmlns="http://www.w3.org/2000/svg"
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[55%] opacity-[0.055] text-cedar-amber"
        aria-hidden="true" preserveAspectRatio="xMidYMid meet"
      >
        <path d="M450,350 C470,330 510,318 540,328 C570,338 585,360 575,385 C565,410 535,422 505,416 C475,410 450,390 450,350 Z" stroke="currentColor" strokeWidth="1" />
        <path d="M430,360 C455,320 515,295 565,310 C615,325 640,368 628,410 C616,452 572,472 528,462 C484,452 445,415 430,360 Z" stroke="currentColor" strokeWidth="1" />
        <path d="M405,375 C435,315 510,278 580,295 C650,312 688,372 674,435 C660,498 605,525 545,512 C485,499 430,448 405,375 Z" stroke="currentColor" strokeWidth="1" />
        <path d="M375,392 C410,312 500,262 590,280 C680,298 728,375 712,458 C696,541 630,578 555,562 C480,546 410,484 375,392 Z" stroke="currentColor" strokeWidth="1" />
        <path d="M340,408 C385,305 490,245 600,265 C710,285 768,378 750,480 C732,582 652,628 562,610 C472,592 388,518 340,408 Z" stroke="currentColor" strokeWidth="1" />
        <path d="M300,425 C355,295 478,225 610,248 C742,271 810,382 790,505 C770,628 676,682 572,660 C468,638 364,552 300,425 Z" stroke="currentColor" strokeWidth="1" />
        <line x1="480" y1="200" x2="480" y2="580" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <line x1="560" y1="200" x2="560" y2="580" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <line x1="300" y1="390" x2="780" y2="390" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
      </svg>
    </div>
  );
}

export function Hero({ filters, onFilterChange }: HeroProps) {
  function set(partial: Partial<AssetFilters>) {
    onFilterChange({ ...filters, ...partial, page: 1 });
  }

  return (
    <section className="relative bg-hero-glow overflow-hidden">
      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.045] pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
        }}
      />
      {/* Center-left warm glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 65% 55% at 22% 50%, rgba(196,133,42,0.18) 0%, rgba(196,133,42,0.06) 50%, transparent 75%)",
            "radial-gradient(ellipse 50% 40% at 15% 60%, rgba(58,102,72,0.11) 0%, transparent 65%)",
          ].join(", "),
        }}
      />
      <TopoBackground />
      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-cedar-bg to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-10">
        {/* Headline — compact, single visual line */}
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
