import { Link } from "react-router-dom";
import { ArrowRight, Plus } from "lucide-react";
import type { Category } from "@/lib/types";
import { useInView } from "@/hooks/useInView";

interface CategoryConfig {
  category: Category;
  label: string;
  description: string;
  protocols: string;
  watermark: React.ReactNode;
}

/** Architectural cityscape — Real Estate */
const RealEstateWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" aria-hidden="true"
    className="absolute bottom-0 right-0 w-52 h-40 text-cedar-amber opacity-[0.055] pointer-events-none">
    {/* Buildings at varying heights */}
    <rect x="5"   y="80"  width="28" height="80" stroke="currentColor" strokeWidth="1" />
    <rect x="38"  y="55"  width="36" height="105" stroke="currentColor" strokeWidth="1" />
    <rect x="82"  y="30"  width="48" height="130" stroke="currentColor" strokeWidth="1" />
    <rect x="138" y="60"  width="32" height="100" stroke="currentColor" strokeWidth="1" />
    <rect x="178" y="90"  width="38" height="70" stroke="currentColor" strokeWidth="1" />
    {/* Windows — main building */}
    <rect x="90"  y="44"  width="10" height="10" stroke="currentColor" strokeWidth="0.6" />
    <rect x="108" y="44"  width="10" height="10" stroke="currentColor" strokeWidth="0.6" />
    <rect x="90"  y="62"  width="10" height="10" stroke="currentColor" strokeWidth="0.6" />
    <rect x="108" y="62"  width="10" height="10" stroke="currentColor" strokeWidth="0.6" />
    <rect x="90"  y="80"  width="10" height="10" stroke="currentColor" strokeWidth="0.6" />
    <rect x="108" y="80"  width="10" height="10" stroke="currentColor" strokeWidth="0.6" />
    {/* Ground */}
    <line x1="0" y1="159" x2="220" y2="159" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

/** Watch dial — Luxury Goods */
const LuxuryWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" aria-hidden="true"
    className="absolute bottom-0 right-0 w-52 h-40 text-cedar-amber opacity-[0.055] pointer-events-none">
    {/* Watch case */}
    <circle cx="140" cy="90" r="65" stroke="currentColor" strokeWidth="1" />
    <circle cx="140" cy="90" r="56" stroke="currentColor" strokeWidth="0.5" />
    {/* Hour markers — 12 positions */}
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 - 90) * (Math.PI / 180);
      const x1 = 140 + 48 * Math.cos(angle);
      const y1 = 90 + 48 * Math.sin(angle);
      const x2 = 140 + 56 * Math.cos(angle);
      const y2 = 90 + 56 * Math.sin(angle);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={i % 3 === 0 ? "1.5" : "0.8"} />;
    })}
    {/* Hands */}
    <line x1="140" y1="90" x2="140" y2="52" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="140" y1="90" x2="162" y2="90" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    {/* Crown */}
    <rect x="203" y="85" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

/** Picture frame with abstract strokes — Art */
const ArtWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" aria-hidden="true"
    className="absolute bottom-0 right-0 w-52 h-40 text-cedar-amber opacity-[0.055] pointer-events-none">
    {/* Outer frame */}
    <rect x="30" y="10" width="180" height="140" stroke="currentColor" strokeWidth="1" />
    {/* Inner mat */}
    <rect x="42" y="22" width="156" height="116" stroke="currentColor" strokeWidth="0.5" />
    {/* Abstract painting strokes inside */}
    <path d="M60,80 Q90,40 120,70 T180,55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M55,105 Q80,75 110,95 T175,80" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
    <path d="M65,120 Q100,100 130,115 T178,105" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
    {/* Color blocks */}
    <rect x="58" y="45" width="24" height="24" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    <rect x="165" y="95" width="20" height="20" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
  </svg>
);

/** Trophy + medal — Collectibles */
const CollectiblesWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" aria-hidden="true"
    className="absolute bottom-0 right-0 w-52 h-40 text-cedar-amber opacity-[0.055] pointer-events-none">
    {/* Trophy cup */}
    <path d="M100,15 H160 L150,75 Q130,95 130,95 Q130,95 110,75 Z"
      stroke="currentColor" strokeWidth="1" />
    {/* Trophy handles */}
    <path d="M100,30 Q80,30 80,55 Q80,70 100,70" stroke="currentColor" strokeWidth="1" fill="none" />
    <path d="M160,30 Q180,30 180,55 Q180,70 160,70" stroke="currentColor" strokeWidth="1" fill="none" />
    {/* Stem */}
    <rect x="122" y="93" width="16" height="22" stroke="currentColor" strokeWidth="0.8" />
    {/* Base */}
    <rect x="108" y="113" width="44" height="8" rx="1" stroke="currentColor" strokeWidth="0.8" />
    {/* Medal */}
    <circle cx="165" cy="125" r="22" stroke="currentColor" strokeWidth="1" />
    <circle cx="165" cy="125" r="15" stroke="currentColor" strokeWidth="0.5" />
    <line x1="165" y1="103" x2="165" y2="95" stroke="currentColor" strokeWidth="1" />
    <path d="M158,95 H172 L170,103 H160 Z" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const CATEGORIES: CategoryConfig[] = [
  {
    category: "real-estate",
    label: "Real Estate",
    description: "Tokenized property deeds and fractional real estate. From raw land parcels to residential homes.",
    protocols: "Fabrica · Propy · Roofstock",
    watermark: <RealEstateWatermark />,
  },
  {
    category: "luxury-goods",
    label: "Luxury Goods",
    description: "Authenticated watches, jewelry, and handbags. Each token backed by a physically verified item.",
    protocols: "Protocols indexing soon",
    watermark: <LuxuryWatermark />,
  },
  {
    category: "art",
    label: "Art",
    description: "Tokenized physical artwork from galleries and private collections. Provenance onchain.",
    protocols: "Protocols indexing soon",
    watermark: <ArtWatermark />,
  },
  {
    category: "collectibles",
    label: "Collectibles",
    description: "Authenticated physical collectibles — sports memorabilia, rare coins, trading cards.",
    protocols: "Protocols indexing soon",
    watermark: <CollectiblesWatermark />,
  },
];

function CategoryCard({ category, label, description, protocols, watermark, index }: CategoryConfig & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <Link
      to={`/explore?category=${category}`}
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`group relative bg-cedar-surface flex flex-col gap-6 p-8 overflow-hidden
        transition-all duration-300
        hover:-translate-y-1 hover:bg-cedar-surface-alt hover:shadow-[0_0_0_1px_#C4852A]
        scroll-fade${inView ? " in-view" : ""}`}
      style={{ transitionDelay: inView ? `${index * 70}ms` : "0ms" }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      {watermark}

      <div className="flex-1 relative z-10">
        <h3 className="font-sans text-lg font-medium text-cedar-text mb-2 group-hover:text-cedar-amber transition-colors duration-200">
          {label}
        </h3>
        <p className="text-cedar-muted text-sm leading-relaxed mb-4">{description}</p>
        <p className="text-cedar-muted/50 text-[11px] tracking-widest uppercase">{protocols}</p>
      </div>

      <div className="flex items-center gap-1.5 text-cedar-amber text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200 relative z-10">
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
      className={`group relative bg-cedar-surface flex flex-col items-center justify-center gap-4 p-8 overflow-hidden
        border border-dashed border-cedar-border/40 hover:border-cedar-amber/40
        transition-all duration-300
        scroll-fade${inView ? " in-view" : ""}`}
      style={{ transitionDelay: inView ? `${index * 70}ms` : "0ms" }}
    >
      <div className="w-10 h-10 flex items-center justify-center border border-cedar-border group-hover:border-cedar-amber/50 transition-colors duration-200">
        <Plus size={18} className="text-cedar-muted group-hover:text-cedar-amber transition-colors duration-200" />
      </div>
      <div className="text-center">
        <p className="font-sans text-sm font-medium text-cedar-muted group-hover:text-cedar-text transition-colors duration-200">
          More categories
        </p>
        <p className="text-cedar-muted/50 text-xs tracking-widest uppercase mt-1">Coming soon</p>
      </div>
    </Link>
  );
}

export function CategoryCards() {
  const { ref: headingRef, inView: headingInView } = useInView();

  return (
    <section className="max-w-7xl mx-auto px-6 py-24">
      <div
        ref={headingRef as React.Ref<HTMLDivElement>}
        className={`mb-12 scroll-fade${headingInView ? " in-view" : ""}`}
      >
        <h2 className="display text-display-md text-cedar-text mb-3">What trades on CedarX</h2>
        <p className="text-cedar-muted text-sm tracking-widest uppercase">
          Any verified real-world asset NFT. One marketplace.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-cedar-border">
        {CATEGORIES.map((cat, i) => (
          <CategoryCard key={cat.category} {...cat} index={i} />
        ))}
        <ComingSoonCard index={CATEGORIES.length} />
      </div>
    </section>
  );
}
