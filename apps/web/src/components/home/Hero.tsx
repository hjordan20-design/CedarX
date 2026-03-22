import { useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { AssetFilters, Category } from "@/lib/types";

// ─── Category pills ───────────────────────────────────────────────────────────
const CATEGORY_PILLS: { value: Category | ""; label: string }[] = [
  { value: "",              label: "All" },
  { value: "real-estate",  label: "Real Estate" },
  { value: "luxury-goods", label: "Luxury Goods" },
  { value: "collectibles", label: "Collectibles" },
];

// ─── Placeholder images — warm gradient + icon SVGs ──────────────────────────
function PlaceholderImage({ type }: { type: "land" | "watch" | "card" }) {
  const gradients: Record<typeof type, string> = {
    land:  "linear-gradient(135deg, #DDD4C0 0%, #C8B896 50%, #B8A880 100%)",
    watch: "linear-gradient(135deg, #D8D0C4 0%, #C4B89C 50%, #B0A484 100%)",
    card:  "linear-gradient(135deg, #D4CCC0 0%, #BCAC92 50%, #A89878 100%)",
  };

  const icons: Record<typeof type, React.ReactNode> = {
    land: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(100,80,48,0.40)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
        <circle cx="18" cy="6" r="2" stroke="rgba(100,80,48,0.35)" strokeWidth="1"/>
        <line x1="18" y1="8" x2="18" y2="11" stroke="rgba(100,80,48,0.35)" strokeWidth="1"/>
      </svg>
    ),
    watch: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(100,80,48,0.40)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="7"/>
        <polyline points="12,9 12,12 13.5,13.5"/>
        <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"/>
      </svg>
    ),
    card: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(100,80,48,0.40)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="12" height="17" rx="1"/>
        <path d="M7 7h4M7 11h4M7 15h2"/>
        <path d="M17 8l2 2-4 4-2-2 4-4z" strokeOpacity="0.6"/>
        <circle cx="18" cy="18" r="3" strokeOpacity="0.5"/>
        <path d="M20 20l2 2" strokeOpacity="0.5"/>
      </svg>
    ),
  };

  return (
    <div
      style={{
        width: "100%",
        height: "110px",
        background: gradients[type],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle texture lines */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.25,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(100,80,48,0.12) 11px, rgba(100,80,48,0.12) 12px)",
      }} />
      <div style={{ position: "relative", zIndex: 1, opacity: 0.7 }}>
        {icons[type]}
      </div>
    </div>
  );
}

// ─── Right-column asset cards ─────────────────────────────────────────────────
const HERO_CARDS = [
  {
    type: "land" as const,
    protocol: "FABRICA",
    category: "Real Estate",
    name: "Apache County Parcel",
    location: "10 acres · Apache County, AZ",
    price: "$12,500",
    detail: "10 ac",
  },
  {
    type: "watch" as const,
    protocol: "4K PROTOCOL",
    category: "Luxury Goods",
    name: "Submariner ref. 124060",
    location: "Certified pre-owned",
    price: "$14,200",
    detail: "Mint",
  },
  {
    type: "card" as const,
    protocol: "COURTYARD",
    category: "Collectibles",
    name: "PSA 10 Rookie Card",
    location: "Sports collectible · Graded",
    price: "$2,800",
    detail: "PSA 10",
  },
];

function HeroCard({ card, delay }: { card: typeof HERO_CARDS[number]; delay: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="animate-fade-up"
      style={{
        display: "flex",
        flexDirection: "column",
        background: hovered ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.68)",
        border: "1px solid rgba(196,133,42,0.12)",
        borderLeft: "3px solid #C4852A",
        borderRadius: 0,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        overflow: "hidden",
        transform: hovered ? "translateX(6px)" : "translateX(0)",
        boxShadow: hovered ? "0 8px 40px rgba(196,133,42,0.10)" : "none",
        transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
        animationDelay: delay,
      }}
    >
      {/* Placeholder image */}
      <PlaceholderImage type={card.type} />

      {/* Details */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "5px" }}>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "#C4852A", letterSpacing: "0.10em" }}>
              {card.protocol}
            </span>
            <span style={{ color: "rgba(28,23,16,0.20)", fontSize: "8px" }}>·</span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", color: "rgba(28,23,16,0.30)", letterSpacing: "0.06em" }}>
              {card.category}
            </span>
          </div>
          <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "18px", color: "#1C1710", lineHeight: 1.2, marginBottom: "3px" }}>
            {card.name}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(28,23,16,0.40)", lineHeight: 1.4 }}>
            {card.location}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "15px", color: "#1C1710", fontWeight: 400, letterSpacing: "-0.02em" }}>
            {card.price}
          </p>
          <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "rgba(196,133,42,0.65)", letterSpacing: "0.06em" }}>
            {card.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

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
    <section style={{ marginTop: "66px", minHeight: "calc(100vh - 66px)", overflow: "hidden" }}>
      {/* Responsive 2-column grid: single column on mobile, 2 columns on lg+ */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: "calc(100vh - 66px)" }}>

        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div
          className="flex flex-col justify-center px-6 py-10 lg:py-[40px] lg:pl-[80px] lg:pr-[60px]"
        >
          {/* Eyebrow */}
          <div
            className="animate-fade-up"
            style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px", animationDelay: "0.1s" }}
          >
            <span style={{ width: "20px", height: "1px", background: "#C4852A", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", letterSpacing: "0.20em", color: "rgba(196,133,42,0.75)", textTransform: "uppercase" }}>
              3 protocols · 3 asset classes
            </span>
          </div>

          {/* H1 */}
          <h1
            className="animate-fade-up"
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(52px, 6.5vw, 88px)",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#1C1710",
              marginBottom: "20px",
              animationDelay: "0.22s",
            }}
          >
            Real assets.<br />
            <em style={{ fontStyle: "italic", color: "#C4852A" }}>Onchain.</em>
          </h1>

          {/* Subheadline */}
          <p
            className="animate-fade-up"
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "17px",
              lineHeight: 1.72,
              color: "rgba(28,23,16,0.50)",
              maxWidth: "400px",
              marginBottom: "28px",
              animationDelay: "0.36s",
            }}
          >
            Browse and trade tokenized real estate, luxury goods, and collectibles.
            Connect your wallet. Settle in USDC.
          </p>

          {/* Search bar */}
          <div
            className="animate-fade-up"
            style={{ position: "relative", maxWidth: "480px", marginBottom: "14px", animationDelay: "0.48s" }}
          >
            <Search style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "15px", height: "15px", pointerEvents: "none", color: "rgba(196,133,42,0.45)" }} />
            <input
              type="text"
              placeholder="Search by name, location, brand…"
              value={filters.search ?? ""}
              onChange={(e) => set({ search: e.target.value || undefined })}
              className="search-input"
              style={{
                width: "100%",
                paddingLeft: "42px", paddingRight: "16px",
                paddingTop: "11px", paddingBottom: "11px",
                fontSize: "15px",
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
            style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px", animationDelay: "0.60s" }}
          >
            {CATEGORY_PILLS.map((pill) => {
              const active = (filters.category ?? "") === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => set({ category: pill.value || undefined })}
                  style={{
                    padding: "7px 15px",
                    fontSize: "12px",
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

          {/* Protocol trust bar */}
          <div className="animate-fade-up" style={{ animationDelay: "0.72s" }}>
            <div style={{ height: "1px", background: "rgba(196,133,42,0.12)", marginBottom: "18px" }} />
            <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)", marginBottom: "12px" }}>
              Indexed protocols
            </p>
            <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
              {[
                { name: "Fabrica", sub: "Land titles" },
                { name: "4K Protocol", sub: "Luxury goods" },
                { name: "Courtyard", sub: "Collectibles" },
              ].map(({ name, sub }) => (
                <div key={name}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "rgba(28,23,16,0.70)", marginBottom: "2px" }}>{name}</p>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "rgba(196,133,42,0.60)", letterSpacing: "0.04em" }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column — desktop only ──────────────────────────────────── */}
        <div className="hidden lg:flex flex-col justify-center" style={{ padding: "40px 52px 40px 20px" }}>
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>
              Featured listings
            </span>
            <Link
              to="/explore"
              style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(196,133,42,0.70)", textDecoration: "none" }}
            >
              Browse all →
            </Link>
          </div>

          {/* Image cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" }}>
            {HERO_CARDS.map((card, i) => (
              <HeroCard key={card.name} card={card} delay={`${0.38 + i * 0.13}s`} />
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ height: "1px", background: "rgba(196,133,42,0.08)", marginBottom: "10px" }} />
          <p style={{ fontSize: "11px", color: "rgba(28,23,16,0.30)", lineHeight: 1.6 }}>
            All assets are tokenized on Ethereum or Polygon by their respective protocols.
            CedarX does not hold custody of tokens or funds.
          </p>
        </div>
      </div>
    </section>
  );
}
