import { ArrowRight, MapPin, Percent } from "lucide-react";
import { Link } from "react-router-dom";

export interface PlaceholderAsset {
  id: string;
  name: string;
  sublabel: string;
  price: string;
  metric: { label: string; value: string } | null;
  protocolLabel: string;
  category: string;
  imageUrl: string;
  imageAlt: string;
}

export const PLACEHOLDER_ASSETS: PlaceholderAsset[] = [
  {
    id: "apache-10ac",
    name: "Apache County Parcel",
    sublabel: "10 acres · Apache County, AZ",
    price: "$12,500",
    metric: { label: "Acreage", value: "10 ac" },
    protocolLabel: "Fabrica",
    category: "real-estate",
    imageUrl: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=400&fit=crop",
    imageAlt: "Aerial view of Arizona desert landscape",
  },
  {
    id: "propy-sf",
    name: "Maple Ave Residence",
    sublabel: "Single family · Austin, TX",
    price: "$340,000",
    metric: { label: "Sq ft", value: "1,840" },
    protocolLabel: "Propy",
    category: "real-estate",
    imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop",
    imageAlt: "Residential property exterior",
  },
  {
    id: "watch-sub-01",
    name: "Submariner ref. 124060",
    sublabel: "Luxury watch · Certified pre-owned",
    price: "$14,200",
    metric: { label: "Condition", value: "Mint" },
    protocolLabel: "Luxury RWA",
    category: "luxury-goods",
    imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=400&fit=crop",
    imageAlt: "Luxury watch close-up",
  },
  {
    id: "art-abstract-8",
    name: "Untitled Abstract No. 8",
    sublabel: "Oil on canvas · 36×48 in",
    price: "$8,500",
    metric: { label: "Edition", value: "1 of 1" },
    protocolLabel: "Art RWA",
    category: "art",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&h=400&fit=crop",
    imageAlt: "Colorful abstract painting",
  },
];

export function PlaceholderCard({ asset, index }: { asset: PlaceholderAsset; index: number }) {
  const isYield = asset.metric?.label.toLowerCase().includes("yield") || asset.metric?.label.toLowerCase().includes("apy");

  return (
    <div
      className="group relative bg-cedar-surface border border-cedar-border flex flex-col overflow-hidden snap-start
        transition-all duration-300 hover:-translate-y-1 hover:border-cedar-amber/40 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
      style={{ transitionDelay: `${index * 70}ms` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />

      {/* Thumbnail */}
      <div className="relative h-[120px] sm:h-44 overflow-hidden bg-cedar-surface-alt shrink-0">
        <img
          src={asset.imageUrl}
          alt={asset.imageAlt}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cedar-surface via-cedar-surface/20 to-transparent" />
        <span className="absolute bottom-3 left-4 inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase font-sans border border-cedar-border/60 text-cedar-muted bg-cedar-bg/80 backdrop-blur-sm">
          {asset.protocolLabel}
        </span>
        <span className="absolute bottom-3 right-4 text-cedar-muted/60 text-[10px] tracking-widest uppercase">
          {asset.category.replace(/-/g, " ")}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 flex-1">
        <div>
          <h3 className="display text-[1.25rem] leading-tight text-cedar-text mb-1 group-hover:text-cedar-amber transition-colors duration-200">
            {asset.name}
          </h3>
          <p className="text-cedar-muted text-xs flex items-center gap-1.5">
            {isYield
              ? <Percent size={11} className="text-cedar-green shrink-0" />
              : <MapPin size={11} className="text-cedar-amber opacity-60 shrink-0" />
            }
            {asset.sublabel}
          </p>
        </div>

        {asset.metric && (
          <div className="mt-auto pt-3 border-t border-cedar-border flex items-end justify-between gap-4">
            <div>
              <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">{asset.metric.label}</p>
              <p className={`font-mono text-base font-medium tracking-tight ${isYield ? "text-cedar-green" : "text-cedar-text"}`}>
                {asset.metric.value}
              </p>
            </div>
            <div className="text-right">
              <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">Price</p>
              <p className="font-mono text-base text-cedar-text tracking-tight">{asset.price}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hover CTA */}
      <div className="px-3 sm:px-5 py-3 border-t border-cedar-border bg-cedar-surface-alt flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-cedar-amber text-xs tracking-widest uppercase">View asset</span>
        <ArrowRight size={12} className="text-cedar-amber" />
      </div>
    </div>
  );
}

/** Standalone section — used when live data is unavailable */
export function FeaturedAssets() {
  return (
    <div>
      <div className="grid grid-flow-col auto-cols-[72vw] gap-3 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory card-scroll-row sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-px sm:bg-cedar-border sm:overflow-visible sm:mx-0 sm:px-0 xl:grid-cols-4">
        {PLACEHOLDER_ASSETS.map((asset, i) => (
          <PlaceholderCard key={asset.id} asset={asset} index={i} />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-cedar-muted/40 text-[11px] tracking-wide">
          Sample listings — updates automatically once CedarX finishes indexing.
        </p>
        <Link to="/explore" className="btn-ghost text-sm">
          Browse all <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
