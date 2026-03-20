import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/types";
import { useInView } from "@/hooks/useInView";

interface CategoryConfig {
  category: Category;
  label: string;
  description: string;
  subtext: string;
  icon: React.ReactNode;
  watermark: React.ReactNode;
}

/** Topographic contour lines — Land / Fabrica */
const LandWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    className="absolute bottom-0 right-0 w-48 h-36 text-cedar-amber opacity-[0.055] pointer-events-none">
    <path d="M20,145 Q55,128 90,138 T165,126 T220,132" stroke="currentColor" strokeWidth="1" />
    <path d="M10,118 Q50,98 90,110 T168,97 T220,104" stroke="currentColor" strokeWidth="1" />
    <path d="M0,90 Q45,68 90,82 T170,68 T220,76" stroke="currentColor" strokeWidth="1" />
    <path d="M0,63 Q42,40 90,56 T172,40 T220,50" stroke="currentColor" strokeWidth="1" />
    <path d="M0,38 Q40,14 90,30 T173,15 T220,24" stroke="currentColor" strokeWidth="1" />
    <path d="M0,14 Q38,-8 90,8 T174,-6 T220,2" stroke="currentColor" strokeWidth="1" />
    {/* Survey cross-hatch */}
    <line x1="110" y1="0" x2="110" y2="160" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 7" opacity="0.5" />
    <line x1="160" y1="0" x2="160" y2="160" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 7" opacity="0.5" />
    <line x1="0" y1="80" x2="220" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 7" opacity="0.5" />
  </svg>
);

/** Yield curve + grid — Fixed Income / Ondo */
const FixedIncomeWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    className="absolute bottom-0 right-0 w-48 h-36 text-cedar-amber opacity-[0.055] pointer-events-none">
    {/* Grid lines */}
    <line x1="0" y1="120" x2="220" y2="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" />
    <line x1="0" y1="85" x2="220" y2="85" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" />
    <line x1="0" y1="50" x2="220" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" />
    <line x1="55" y1="0" x2="55" y2="160" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" />
    <line x1="110" y1="0" x2="110" y2="160" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" />
    <line x1="165" y1="0" x2="165" y2="160" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" />
    {/* Yield curve — exponential growth */}
    <path d="M10,148 Q40,145 70,138 T120,110 T170,60 T215,12"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    {/* Area fill under curve — very faint */}
    <path d="M10,148 Q40,145 70,138 T120,110 T170,60 T215,12 L215,160 L10,160 Z"
      fill="currentColor" opacity="0.08" />
    {/* Data point dots */}
    <circle cx="70" cy="138" r="2.5" fill="currentColor" />
    <circle cx="120" cy="110" r="2.5" fill="currentColor" />
    <circle cx="170" cy="60" r="2.5" fill="currentColor" />
    <circle cx="215" cy="12" r="2.5" fill="currentColor" />
  </svg>
);

/** Building silhouette — Rental Property / RealT */
const RentalWatermark = () => (
  <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
    className="absolute bottom-0 right-0 w-48 h-36 text-cedar-amber opacity-[0.055] pointer-events-none">
    {/* Main building */}
    <rect x="65" y="40" width="90" height="118" stroke="currentColor" strokeWidth="1" />
    {/* Roofline detail */}
    <line x1="55" y1="40" x2="165" y2="40" stroke="currentColor" strokeWidth="1" />
    {/* Side building */}
    <rect x="155" y="70" width="50" height="88" stroke="currentColor" strokeWidth="0.8" />
    {/* Windows — main building */}
    <rect x="78" y="58" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="106" y="58" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="134" y="58" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="78" y="90" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="106" y="90" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="134" y="90" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="78" y="122" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    <rect x="134" y="122" width="18" height="18" stroke="currentColor" strokeWidth="0.7" />
    {/* Door */}
    <rect x="101" y="130" width="18" height="28" stroke="currentColor" strokeWidth="0.7" />
    {/* Side building windows */}
    <rect x="165" y="85" width="14" height="14" stroke="currentColor" strokeWidth="0.6" />
    <rect x="165" y="110" width="14" height="14" stroke="currentColor" strokeWidth="0.6" />
    {/* Ground line */}
    <line x1="20" y1="158" x2="220" y2="158" stroke="currentColor" strokeWidth="0.8" />
  </svg>
);

const CATEGORIES: CategoryConfig[] = [
  {
    category: "land",
    label: "Land",
    description: "Tokenized real property deeds. Each token represents 100% ownership of a parcel.",
    subtext: "via Fabrica",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[22px] h-[22px]" aria-hidden="true">
        <path d="M3 20h18M5 20V10l7-7 7 7v10" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
    watermark: <LandWatermark />,
  },
  {
    category: "fixed-income",
    label: "Fixed income",
    description: "Tokenized US treasuries and dollar-yield instruments. Onchain T-bills.",
    subtext: "via Ondo Finance",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[22px] h-[22px]" aria-hidden="true">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    watermark: <FixedIncomeWatermark />,
  },
  {
    category: "rental-property",
    label: "Rental property",
    description: "Fractional ownership of income-producing residential real estate.",
    subtext: "via RealT",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-[22px] h-[22px]" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    watermark: <RentalWatermark />,
  },
];

function CategoryCard({ category, label, description, subtext, icon, watermark, index }: CategoryConfig & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <Link
      to={`/explore?category=${category}`}
      ref={ref as React.Ref<HTMLAnchorElement>}
      className={`group relative bg-cedar-surface flex flex-col gap-6 p-8 overflow-hidden
        transition-all duration-300
        hover:-translate-y-1 hover:bg-cedar-surface-alt hover:shadow-[0_0_0_1px_#C4852A]
        scroll-fade${inView ? " in-view" : ""}`}
      style={{ transitionDelay: inView ? `${index * 80}ms` : "0ms" }}
    >
      {/* Amber top accent line — same on all cards */}
      <div className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      {/* Category watermark illustration */}
      {watermark}

      {/* Icon */}
      <div className="text-cedar-amber opacity-70 group-hover:opacity-100 transition-opacity duration-200 relative z-10">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10">
        <h3 className="font-sans text-lg font-medium text-cedar-text mb-2 group-hover:text-cedar-amber transition-colors duration-200">
          {label}
        </h3>
        <p className="text-cedar-muted text-sm leading-relaxed mb-4">
          {description}
        </p>
        <p className="text-cedar-muted/50 text-[11px] tracking-widest uppercase">
          {subtext}
        </p>
      </div>

      {/* Arrow CTA */}
      <div className="flex items-center gap-1.5 text-cedar-amber text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0 transition-all duration-200 relative z-10">
        Browse {label.toLowerCase()}
        <ArrowRight size={12} />
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
        <h2 className="display text-display-md text-cedar-text mb-3">
          What trades on CedarX
        </h2>
        <p className="text-cedar-muted text-sm tracking-widest uppercase">
          Real assets. One marketplace.
        </p>
      </div>

      {/* Grid supports 5–6 categories: wraps to 2-col on sm, 3-col on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-cedar-border">
        {CATEGORIES.map((cat, i) => (
          <CategoryCard key={cat.category} {...cat} index={i} />
        ))}
      </div>
    </section>
  );
}
