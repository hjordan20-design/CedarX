import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
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
  {
    category: "collectibles",
    label: "Collectibles",
    description: "Authenticated physical collectibles — sports memorabilia, rare coins, trading cards.",
    protocols: "Courtyard",
  },
];

function CategoryCard({ category, label, description, protocols, index }: CategoryConfig & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <Link
      to={`/explore?category=${category}`}
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`group relative flex flex-col gap-6 p-8 overflow-hidden
        scroll-fade${inView ? " in-view" : ""}`}
      style={{
        transitionDelay: inView ? `${index * 70}ms` : "0ms",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        transition: "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.20)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 -2px 20px rgba(196,133,42,0.12), 0 8px 24px rgba(0,0,0,0.3)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      <div className="flex-1 relative z-10">
        <h3 className="font-sans text-lg font-medium text-cedar-text mb-2 group-hover:text-cedar-amber transition-colors duration-300">
          {label}
        </h3>
        <p className="text-cedar-muted/60 text-sm leading-relaxed mb-4">{description}</p>
        <p className="text-cedar-muted/40 text-[11px] tracking-widest uppercase">{protocols}</p>
      </div>

      <div className="flex items-center gap-1.5 text-cedar-amber text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-300 relative z-10">
        Browse {label.toLowerCase()}
        <ArrowRight size={12} />
      </div>
    </Link>
  );
}

function ComingSoonCard({ index }: { index: number }) {
  const { ref, inView } = useInView();
  return (
    <Link
      to="/explore"
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`group relative flex flex-col items-center justify-center gap-4 p-8 overflow-hidden
        scroll-fade${inView ? " in-view" : ""}`}
      style={{
        transitionDelay: inView ? `${index * 70}ms` : "0ms",
        border: "1px dashed rgba(255,255,255,0.08)",
        borderRadius: "12px",
        transition: "border-color 0.4s ease, transform 0.4s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.20)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "";
      }}
    >
      <div
        className="w-10 h-10 flex items-center justify-center transition-colors duration-300"
        style={{ border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Plus size={18} className="text-cedar-muted/40 group-hover:text-cedar-amber transition-colors duration-300" />
      </div>
      <div className="text-center">
        <p className="font-sans text-sm font-medium text-cedar-muted/60 group-hover:text-cedar-text transition-colors duration-300">
          More categories
        </p>
        <p className="text-cedar-muted/30 text-xs tracking-widest uppercase mt-1">Coming soon</p>
      </div>
    </Link>
  );
}

export function CategoryCards() {
  const { ref: headingRef, inView: headingInView } = useInView();

  return (
    <section className="relative" style={{ background: "#0A0A09" }}>
      {/* Amber top-edge glow line */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "1px",
          background: "linear-gradient(to right, transparent 0%, rgba(196,133,42,0.30) 35%, rgba(196,133,42,0.30) 65%, transparent 100%)",
        }}
      />
      {/* Faint amber top bloom behind the heading */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: "320px",
          background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(196,133,42,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div
          ref={headingRef as React.Ref<HTMLDivElement>}
          className={`mb-16 scroll-fade${headingInView ? " in-view" : ""}`}
        >
          <h2 className="display text-display-md text-cedar-text mb-4">What trades on CedarX</h2>
          <p className="text-cedar-muted/50 text-sm tracking-widest uppercase">
            Any verified real-world asset NFT. One marketplace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.category} {...cat} index={i} />
          ))}
          <ComingSoonCard index={CATEGORIES.length} />
        </div>
      </div>
    </section>
  );
}
