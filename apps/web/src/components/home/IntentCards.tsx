/**
 * IntentCards — three pure-CSS gradient cards replacing the old CategoryLanes.
 * Zero external image dependencies. Cannot break due to network failures.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface CardConfig {
  href: string;
  icon: string;
  heading: string;
  subtitle: string;
  cta: string;
  gradient: string;
}

const CARDS: CardConfig[] = [
  {
    href:     "/explore?listingFilter=listed",
    icon:     "🏷",
    heading:  "Land For Sale",
    subtitle: "Browse tokenized parcels with fixed USDC prices. Connect your wallet and buy instantly.",
    cta:      "Browse for-sale land",
    gradient: "linear-gradient(135deg, #5C7A4A 0%, #8B9F6B 50%, #6B7F55 100%)",
  },
  {
    href:     "/explore?listingFilter=unlisted",
    icon:     "🤝",
    heading:  "Make an Offer",
    subtitle: "Every indexed parcel accepts offers — even unlisted ones. Submit your price to the owner onchain.",
    cta:      "Browse off-market land",
    gradient: "linear-gradient(135deg, #8B7355 0%, #A0926B 50%, #7A6548 100%)",
  },
  {
    href:     "/tokenize",
    icon:     "🔗",
    heading:  "Tokenize Your Land",
    subtitle: "Bring your property onchain. We handle everything — your listing goes live within days.",
    cta:      "Start tokenizing",
    gradient: "linear-gradient(135deg, #6B5B4A 0%, #8A7560 50%, #5A4A3A 100%)",
  },
];

function IntentCard({ card, index }: { card: CardConfig; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={card.href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "clamp(24px, 3.5vw, 36px)",
        borderRadius: "16px",
        background: card.gradient,
        textDecoration: "none",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 16px 48px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.16)"
          : "0 4px 16px rgba(0,0,0,0.14)",
        animationDelay: `${index * 80}ms`,
        animationFillMode: "both",
      }}
      className="intent-card-fadein"
    >
      {/* Icon */}
      <span style={{ fontSize: "28px", lineHeight: 1, marginBottom: "20px" }} aria-hidden="true">
        {card.icon}
      </span>

      {/* Heading */}
      <h2
        style={{
          fontFamily: "Cormorant Garamond, Georgia, serif",
          fontWeight: 400,
          fontSize: "26px",
          letterSpacing: "-0.01em",
          lineHeight: 1.1,
          color: "rgba(255,251,242,0.98)",
          marginBottom: "12px",
        }}
      >
        {card.heading}
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "DM Sans, system-ui, sans-serif",
          fontWeight: 300,
          fontSize: "14px",
          lineHeight: 1.65,
          color: "rgba(255,251,242,0.72)",
          marginBottom: "auto",
          paddingBottom: "24px",
        }}
      >
        {card.subtitle}
      </p>

      {/* CTA */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: hovered ? "10px" : "6px",
          fontSize: "11px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontFamily: "DM Sans, system-ui, sans-serif",
          fontWeight: 400,
          color: "rgba(255,251,242,0.90)",
          transition: "gap 0.25s ease",
        }}
      >
        {card.cta} <ArrowRight size={12} />
      </div>
    </Link>
  );
}

export function IntentCards() {
  return (
    <section className="max-w-7xl mx-auto px-6" style={{ paddingTop: "40px", paddingBottom: "8px" }}>
      <div
        style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr" }}
        className="sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr]"
      >
        {CARDS.map((card, i) => (
          <IntentCard key={card.href} card={card} index={i} />
        ))}
      </div>
    </section>
  );
}
