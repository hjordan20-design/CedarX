import { memo, useState } from "react";
import { Search } from "lucide-react";
import type { AssetFilters, Category } from "@/lib/types";

// ─── SVG geometry constants ───────────────────────────────────────────────────
// Circumferences: 2πr (used for stroke-dasharray draw-in animation)
const C1 = Math.round(2 * Math.PI * 340); // r=340 → 2136
const C2 = Math.round(2 * Math.PI * 260); // r=260 → 1634
const C3 = Math.round(2 * Math.PI * 170); // r=170 → 1068
const C4 = Math.round(2 * Math.PI * 200); // r=200 → 1257 (offset circle)
// Line lengths: √(Δx²+Δy²)
const L1 = Math.round(Math.sqrt(750 ** 2 + 350 ** 2)); // (0,185)→(750,535) → 828
const L2 = Math.round(Math.sqrt(560 ** 2 + 750 ** 2)); // (95,750)→(655,0)  → 942
const L3 = Math.round(Math.sqrt(750 ** 2 + 170 ** 2)); // (0,455)→(750,285) → 769

/** Return inline styles that animate the element drawing itself on from opacity 0 */
function draw(len: number, dur: string, delay: string): React.CSSProperties {
  return {
    strokeDasharray: len,
    strokeDashoffset: len,
    animation: `hero-draw ${dur} ease forwards ${delay}`,
  };
}

// ─── Memoized SVG ─────────────────────────────────────────────────────────────
// Wrapped in memo so mouse-move re-renders of the parent never restart the
// stroke-dasharray draw-in animations.
const CartographicComposition = memo(function CartographicComposition() {
  return (
    <svg
      aria-hidden="true"
      className="absolute pointer-events-none hidden sm:block"
      style={{
        top: "50%",
        right: "-180px",
        transform: "translateY(-50%)",
        width: "750px",
        height: "750px",
        overflow: "visible",
      }}
      viewBox="0 0 750 750"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="carto-glow" cx="50%" cy="50%" r="55%">
          <stop offset="0%"   stopColor="#C4852A" stopOpacity="0.07" />
          <stop offset="55%"  stopColor="#C4852A" stopOpacity="0.025" />
          <stop offset="100%" stopColor="#C4852A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Localised amber glow centred on the composition */}
      <circle cx="375" cy="375" r="430" fill="url(#carto-glow)" />

      {/* ── Diagonal survey lines ── */}
      <line x1="0"  y1="185" x2="750" y2="535"
        stroke="rgba(196,133,42,0.07)" strokeWidth="1"
        style={draw(L1, "1.6s", "1.0s")} />
      <line x1="95" y1="750" x2="655" y2="0"
        stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        style={draw(L2, "1.6s", "1.2s")} />
      <line x1="0"  y1="455" x2="750" y2="285"
        stroke="rgba(255,255,255,0.025)" strokeWidth="1"
        style={draw(L3, "1.6s", "1.4s")} />

      {/* ── Concentric circles — each with its own draw timing and offset centre ── */}
      {/* r=340 — outermost, centred */}
      <circle cx="375" cy="375" r="340"
        stroke="rgba(196,133,42,0.08)" strokeWidth="0.5"
        style={draw(C1, "2.2s", "0.3s")} />
      {/* r=260 */}
      <circle cx="375" cy="375" r="260"
        stroke="rgba(196,133,42,0.10)" strokeWidth="0.5"
        style={draw(C2, "2.0s", "0.6s")} />
      {/* r=170 — innermost amber ring */}
      <circle cx="375" cy="375" r="170"
        stroke="rgba(196,133,42,0.12)" strokeWidth="0.5"
        style={draw(C3, "1.8s", "0.9s")} />
      {/* r=200 offset circle — white, adds asymmetry */}
      <circle cx="435" cy="325" r="200"
        stroke="rgba(255,255,255,0.03)" strokeWidth="0.5"
        style={draw(C4, "2.5s", "0.4s")} />

      {/* ── Tick marks at cardinal points of outermost circle ── */}
      <line x1="368" y1="32"  x2="382" y2="32"  stroke="rgba(196,133,42,0.18)" strokeWidth="1" />
      <line x1="368" y1="718" x2="382" y2="718" stroke="rgba(196,133,42,0.18)" strokeWidth="1" />
      <line x1="32"  y1="368" x2="32"  y2="382" stroke="rgba(196,133,42,0.18)" strokeWidth="1" />
      <line x1="718" y1="368" x2="718" y2="382" stroke="rgba(196,133,42,0.18)" strokeWidth="1" />

      {/* ── Crosshair at composition centre ── */}
      <line x1="358" y1="375" x2="392" y2="375" stroke="rgba(196,133,42,0.22)" strokeWidth="0.75" />
      <line x1="375" y1="358" x2="375" y2="392" stroke="rgba(196,133,42,0.22)" strokeWidth="0.75" />

      {/* ── Pulsing dots at mathematically-computed line × circle intersections ── */}
      {/* Dot A — line 1 × r=260, upper-left sector  (≈ 146, 253) */}
      <circle cx="146" cy="253" r="2.5" fill="rgba(196,133,42,0.5)"
        className="hero-dot-pulse" />
      <circle cx="146" cy="253" r="6.5"
        stroke="rgba(196,133,42,0.2)" strokeWidth="0.75"
        className="hero-ring-pulse" />

      {/* Dot B — line 2 × r=340, upper-right sector  (≈ 578, 103) */}
      <circle cx="578" cy="103" r="2.5" fill="rgba(196,133,42,0.5)"
        className="hero-dot-pulse" style={{ animationDelay: "0.9s" }} />
      <circle cx="578" cy="103" r="6.5"
        stroke="rgba(196,133,42,0.2)" strokeWidth="0.75"
        className="hero-ring-pulse" style={{ animationDelay: "0.9s" }} />

      {/* ── Centre pin — the compositional anchor ── */}
      <circle cx="375" cy="375" r="3"   fill="rgba(196,133,42,0.6)" />
      <circle cx="375" cy="375" r="9"   stroke="rgba(196,133,42,0.15)" strokeWidth="0.75" />
      <circle cx="375" cy="375" r="16"  stroke="rgba(196,133,42,0.06)" strokeWidth="0.5" />
    </svg>
  );
});

// ─── Category pills ───────────────────────────────────────────────────────────
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

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero({ filters, onFilterChange }: HeroProps) {
  // Reactive glow position — starts at 55%, 35%, follows cursor with 0.8s ease lag
  const [glowPos, setGlowPos] = useState({ x: 55, y: 35 });

  function set(partial: Partial<AssetFilters>) {
    onFilterChange({ ...filters, ...partial, page: 1 });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    setGlowPos({
      x: ((e.clientX - r.left) / r.width)  * 100,
      y: ((e.clientY - r.top)  / r.height) * 100,
    });
  }

  return (
    <section
      className="relative bg-cedar-bg overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* ── Atmosphere layers (back → front) ─────────────────────────── */}

      {/* 1. Dot grid — 48px spacing, clearly visible fine grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* 2. Cool secondary glow — top-left, static position */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: "800px",
          height: "600px",
          left: "-80px",
          top: "-80px",
          background: "radial-gradient(ellipse at center, rgba(140,160,190,0.03) 0%, transparent 70%)",
        }}
      />

      {/* 3. Reactive amber glow — 900×700, follows cursor with 0.8s ease lag */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: "900px",
          height: "700px",
          left: `${glowPos.x}%`,
          top:  `${glowPos.y}%`,
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(ellipse at center, rgba(196,133,42,0.06) 0%, transparent 70%)",
          transition: "left 0.8s ease, top 0.8s ease",
        }}
      />

      {/* 4. Static amber halo — always-on warm presence behind headline */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 80% at 28% 38%, rgba(196,133,42,0.07) 0%, rgba(196,133,42,0.03) 55%, transparent 72%)",
        }}
      />

      {/* 5. Horizontal light streak — at 62% from top, amber tint */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: "62%",
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(to right, transparent 5%, rgba(196,133,42,0.08) 30%, rgba(196,133,42,0.08) 70%, transparent 95%)",
        }}
      />

      {/* 6. Animated cartographic composition */}
      <CartographicComposition />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-12">

        {/* Headline — 0.3s stagger */}
        <h1
          className="display text-display-lg text-cedar-text mb-6 animate-fade-up"
          style={{ animationDelay: "300ms", letterSpacing: "0.02em" }}
        >
          Real assets. <em className="not-italic text-cedar-amber">Onchain.</em>
        </h1>

        {/* Subtitle — 0.6s stagger, 45% opacity */}
        <p
          className="text-sm mb-10 animate-fade-up max-w-lg leading-relaxed"
          style={{
            animationDelay: "600ms",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Browse and trade tokenized real estate, luxury goods, art, and collectibles.
          Connect your wallet. Buy with USDC.
        </p>

        {/* Search bar — 0.9s stagger */}
        <div
          className="relative max-w-2xl mb-5 animate-fade-up"
          style={{ animationDelay: "900ms" }}
        >
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "rgba(255,255,255,0.3)" }}
          />
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

        {/* Category pills — 1.1s stagger */}
        <div
          className="flex flex-wrap gap-2 animate-fade-up"
          style={{ animationDelay: "1100ms" }}
        >
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
