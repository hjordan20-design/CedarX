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

// ─── Right-column placeholder cards ──────────────────────────────────────────
const HERO_CARDS = [
  {
    protocol: "FABRICA",
    category: "REAL ESTATE",
    name: "Apache County Parcel",
    location: "10 acres · Apache County, AZ",
    price: "$12,500",
    detail: "10 ac",
  },
  {
    protocol: "4K PROTOCOL",
    category: "LUXURY GOODS",
    name: "Submariner ref. 124060",
    location: "Luxury watch · Certified pre-owned",
    price: "$14,200",
    detail: "Mint",
  },
  {
    protocol: "COURTYARD",
    category: "COLLECTIBLES",
    name: "PSA 10 Rookie Card",
    location: "Sports collectible · Graded",
    price: "$2,800",
    detail: "PSA 10",
  },
];

// ─── Hero asset card (right column) ──────────────────────────────────────────
function HeroCard({ card, delay }: { card: typeof HERO_CARDS[number]; delay: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="animate-fade-up"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        padding: "20px 24px",
        background: hovered ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.62)",
        border: "1px solid rgba(196,133,42,0.12)",
        borderLeft: "3px solid #C4852A",
        borderRadius: 0,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transform: hovered ? "translateX(6px)" : "translateX(0)",
        boxShadow: hovered ? "0 8px 40px rgba(196,133,42,0.08)" : "none",
        transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
        cursor: "default",
        animationDelay: delay,
      }}
    >
      {/* Left: name + location */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "#C4852A", letterSpacing: "0.10em" }}>
            {card.protocol}
          </span>
          <span style={{ color: "rgba(28,23,16,0.22)", fontSize: "8px" }}>·</span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "8px", color: "rgba(28,23,16,0.22)", letterSpacing: "0.08em" }}>
            {card.category}
          </span>
        </div>
        <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "19px", color: "#1C1710", lineHeight: 1.2, marginBottom: "4px" }}>
          {card.name}
        </p>
        <p style={{ fontSize: "11px", color: "rgba(28,23,16,0.36)", lineHeight: 1.4 }}>
          {card.location}
        </p>
      </div>
      {/* Right: price */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "16px", color: "#1C1710", fontWeight: 400, letterSpacing: "-0.02em" }}>
          {card.price}
        </p>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "rgba(196,133,42,0.70)", letterSpacing: "0.06em" }}>
          {card.detail}
        </p>
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
    <section
      style={{ marginTop: "66px", minHeight: "calc(100vh - 66px)", overflow: "hidden" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "calc(100vh - 66px)",
        }}
        className="grid-cols-1 lg:grid-cols-2"
      >
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "80px 60px 80px 80px",
          }}
          className="px-6 pt-16 pb-12 lg:!px-[80px] lg:!pt-[80px] lg:!pb-[80px] lg:pr-[60px]"
        >
          {/* Eyebrow */}
          <div
            className="animate-fade-up"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "28px",
              animationDelay: "0.1s",
            }}
          >
            <span style={{ width: "20px", height: "1px", background: "#C4852A", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "9px", letterSpacing: "0.22em", color: "rgba(196,133,42,0.75)", textTransform: "uppercase" }}>
              Real-world assets · Onchain
            </span>
          </div>

          {/* H1 */}
          <h1
            className="animate-fade-up"
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(58px, 6.5vw, 90px)",
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              color: "#1C1710",
              marginBottom: "24px",
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
              fontSize: "15px",
              lineHeight: 1.78,
              color: "rgba(28,23,16,0.46)",
              maxWidth: "400px",
              marginBottom: "32px",
              animationDelay: "0.36s",
            }}
          >
            Browse and trade tokenized real estate, luxury goods, and collectibles.
            Connect your wallet. Settle in USDC.
          </p>

          {/* Search bar */}
          <div
            className="animate-fade-up"
            style={{ position: "relative", maxWidth: "480px", marginBottom: "16px", animationDelay: "0.48s" }}
          >
            <Search
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "15px",
                height: "15px",
                pointerEvents: "none",
                color: "rgba(196,133,42,0.45)",
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
                paddingLeft: "42px",
                paddingRight: "16px",
                paddingTop: "12px",
                paddingBottom: "12px",
                fontSize: "14px",
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontWeight: 300,
                color: "#1C1710",
                background: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(196,133,42,0.18)",
                borderBottom: "2px solid rgba(196,133,42,0.35)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                outline: "none",
                transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
              }}
            />
          </div>

          {/* Category pills */}
          <div
            className="animate-fade-up"
            style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px", animationDelay: "0.60s" }}
          >
            {CATEGORY_PILLS.map((pill) => {
              const active = (filters.category ?? "") === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => set({ category: pill.value || undefined })}
                  style={{
                    padding: "6px 14px",
                    fontSize: "11px",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    letterSpacing: "0.04em",
                    border: active ? "1px solid #C4852A" : "1px solid rgba(196,133,42,0.20)",
                    background: active ? "#C4852A" : "rgba(255,255,255,0.60)",
                    color: active ? "#FFFFFF" : "rgba(28,23,16,0.50)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Trust bar divider */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.72s" }}
          >
            <div style={{ height: "1px", background: "rgba(196,133,42,0.12)", marginBottom: "20px" }} />
            <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)", marginBottom: "14px" }}>
              Indexed protocols
            </p>
            <div style={{ display: "flex", gap: "32px" }}>
              {[
                { name: "Fabrica", sub: "Land titles" },
                { name: "4K Protocol", sub: "Luxury goods" },
                { name: "Courtyard", sub: "Collectibles" },
              ].map(({ name, sub }) => (
                <div key={name}>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "rgba(28,23,16,0.70)", marginBottom: "2px" }}>{name}</p>
                  <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", color: "rgba(196,133,42,0.60)", letterSpacing: "0.04em" }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col justify-center"
          style={{ padding: "60px 52px 80px 20px" }}
        >
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <span style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>
              Featured listings
            </span>
            <Link
              to="/explore"
              style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(196,133,42,0.70)", textDecoration: "none", transition: "color 0.3s ease" }}
            >
              Browse all →
            </Link>
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
            {HERO_CARDS.map((card, i) => (
              <HeroCard key={card.name} card={card} delay={`${0.38 + i * 0.13}s`} />
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ height: "1px", background: "rgba(196,133,42,0.08)", marginBottom: "12px" }} />
          <p style={{ fontSize: "10px", color: "rgba(28,23,16,0.28)", lineHeight: 1.6 }}>
            All assets are tokenized on Ethereum or Polygon by their respective protocols.
            CedarX does not hold custody of tokens or funds.
          </p>
        </div>
      </div>
    </section>
  );
}
