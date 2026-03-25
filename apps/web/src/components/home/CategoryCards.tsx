import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { useInView } from "@/hooks/useInView";

interface CategoryConfig {
  category: Category;
  label: string;
  description: string;
  protocols: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: "real-estate",
    label: "Real Estate",
    description: "Tokenized property deeds and fractional real estate. From raw land parcels to residential homes.",
    protocols: "Fabrica",
  },
  {
    category: "collectibles",
    label: "Collectibles",
    description: "Authenticated physical collectibles — sports memorabilia, rare coins, trading cards.",
    protocols: "Courtyard",
  },
  {
    category: "luxury-goods",
    label: "Luxury Goods",
    description: "Authenticated watches, jewelry, and handbags. Each token backed by a physically verified item.",
    protocols: "4K Protocol",
  },
  {
    category: "art",
    label: "Art",
    description: "Tokenized physical artwork from galleries and private collections. Provenance onchain.",
    protocols: "Coming soon",
  },
];

function CategoryCard({ category, label, description, protocols, index }: CategoryConfig & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <Link
      to={`/explore?category=${category}`}
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
          {protocols}
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
        Browse {label.toLowerCase()}
        <ArrowRight size={11} />
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
            What trades on CedarX
          </h2>
          <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>
            Any verified real-world asset NFT. One marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.category} {...cat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
