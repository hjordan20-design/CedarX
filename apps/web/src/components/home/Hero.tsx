import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

// ─── Hero ─────────────────────────────────────────────────────────────────────
export function Hero() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/explore?search=${encodeURIComponent(q)}` : "/explore");
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
            fontSize: "clamp(42px, 7vw, 96px)",
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            color: "var(--cedar-text)",
            marginBottom: "28px",
            animationDelay: "0.1s",
          }}
        >
          Buy land. <em style={{ fontStyle: "italic", color: "#C4852A" }}>Onchain.</em>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up"
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "14px",
            lineHeight: 1.5,
            color: "var(--cedar-muted)",
            maxWidth: "480px",
            margin: "0 auto 10px",
            animationDelay: "0.22s",
          }}
        >
          Browse tokenized land parcels across the United States.
          Connect your wallet. Settle in USDC.
        </p>

        {/* Search bar — submits to /explore */}
        <form
          onSubmit={handleSubmit}
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
            placeholder="Search by address, county, or parcel ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{
              width: "100%",
              paddingLeft: "44px", paddingRight: "16px",
              paddingTop: "9px", paddingBottom: "9px",
              fontSize: "16px",
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 300,
              color: "var(--cedar-text)",
              background: "var(--bg-card)",
              border: "1px solid rgba(196,133,42,0.18)",
              borderBottom: "2px solid rgba(196,133,42,0.35)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              outline: "none",
              transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
            }}
          />
        </form>

        {/* Quick filter links */}
        <div
          className="animate-fade-up"
          style={{
            display: "flex", flexWrap: "wrap", gap: "6px",
            justifyContent: "center",
            animationDelay: "0.46s",
          }}
        >
          {[
            { label: "All properties",   href: "/explore" },
            { label: "For sale",         href: "/explore?listingFilter=listed" },
            { label: "Make offer",       href: "/explore?listingFilter=unlisted" },
            { label: "Tokenize my land", href: "/tokenize" },
          ].map((pill) => (
            <Link
              key={pill.href}
              to={pill.href}
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                fontFamily: "DM Sans, system-ui, sans-serif",
                letterSpacing: "0.03em",
                border: "1px solid rgba(196,133,42,0.22)",
                background: "var(--bg-card)",
                color: "var(--cedar-muted)",
                textDecoration: "none",
                transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
              }}
            >
              {pill.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
