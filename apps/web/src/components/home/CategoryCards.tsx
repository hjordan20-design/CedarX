import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface LandCard {
  label: string;
  description: string;
  href: string;
  badge: string;
}

const LAND_CARDS: LandCard[] = [
  {
    label: "For Sale",
    description: "Browse listed parcels with a fixed price. Connect your wallet and buy instantly with USDC.",
    href: "/explore?listingFilter=listed",
    badge: "Instant buy",
  },
  {
    label: "Make an Offer",
    description: "Every indexed parcel is open to offers, even when unlisted. Submit your price — the owner can accept onchain.",
    href: "/explore?listingFilter=unlisted",
    badge: "Off-market",
  },
  {
    label: "Tokenize Your Land",
    description: "Own a parcel? Request tokenization through Fabrica. We'll help you put your deed onchain.",
    href: "/tokenize",
    badge: "Fabrica protocol",
  },
  {
    label: "Browse All",
    description: "Explore the full catalogue of tokenized land parcels across the United States.",
    href: "/explore",
    badge: "All states",
  },
];

function LandCardItem({ label, description, href, badge, index }: LandCard & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <Link
      to={href}
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`group relative flex flex-col gap-6 p-8 overflow-hidden scroll-fade${inView ? " in-view" : ""}`}
      style={{
        transitionDelay: inView ? `${index * 70}ms` : "0ms",
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(196,133,42,0.10)",
        borderLeft: "3px solid #C4852A",
        borderRadius: 0,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "border-color 0.3s cubic-bezier(.16,1,.3,1), box-shadow 0.3s cubic-bezier(.16,1,.3,1), transform 0.3s cubic-bezier(.16,1,.3,1)",
        textDecoration: "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.30)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px rgba(196,133,42,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.80)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.10)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.55)";
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "22px",
            letterSpacing: "-0.01em",
            color: "#1C1710",
            marginBottom: "10px",
            transition: "color 0.3s ease",
          }}
          className="group-hover:!text-cedar-amber"
        >
          {label}
        </h3>
        <p style={{ fontSize: "15px", fontWeight: 300, color: "rgba(28,23,16,0.55)", lineHeight: 1.7, marginBottom: "16px" }}>
          {description}
        </p>
        <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(196,133,42,0.60)" }}>
          {badge}
        </p>
      </div>

      <div
        className="opacity-0 group-hover:opacity-100"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "10px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#C4852A",
          transition: "opacity 0.3s ease",
        }}
      >
        {label} <ArrowRight size={11} />
      </div>
    </Link>
  );
}

export function CategoryCards() {
  const { ref: headingRef, inView: headingInView } = useInView();

  return (
    <section
      style={{ background: "rgba(255,255,255,0.25)", borderTop: "1px solid rgba(196,133,42,0.08)", borderBottom: "1px solid rgba(196,133,42,0.08)" }}
    >
      <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "100px", paddingBottom: "80px" }}>
        <div
          ref={headingRef as React.Ref<HTMLDivElement>}
          className={`scroll-fade${headingInView ? " in-view" : ""}`}
          style={{ marginBottom: "48px" }}
        >
          <h2
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.02em",
              color: "#1C1710",
              marginBottom: "12px",
            }}
          >
            Everything you can do on CedarX
          </h2>
          <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>
            One marketplace for tokenized land.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LAND_CARDS.map((card, i) => (
            <LandCardItem key={card.label} {...card} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
