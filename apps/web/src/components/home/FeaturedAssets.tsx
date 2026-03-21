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
    id: "fabrica-tx",
    name: "Maple Ave Residence",
    sublabel: "Single family · Austin, TX",
    price: "$340,000",
    metric: { label: "Sq ft", value: "1,840" },
    protocolLabel: "Fabrica",
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
    protocolLabel: "4K Protocol",
    category: "luxury-goods",
    imageUrl: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&h=400&fit=crop",
    imageAlt: "Luxury watch close-up",
  },
  {
    id: "courtyard-card-01",
    name: "PSA 10 Rookie Card",
    sublabel: "Sports collectible · Graded",
    price: "$2,800",
    metric: { label: "Grade", value: "PSA 10" },
    protocolLabel: "Courtyard",
    category: "collectibles",
    imageUrl: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=400&fit=crop",
    imageAlt: "Graded sports trading card",
  },
];

export function PlaceholderCard({ asset, index }: { asset: PlaceholderAsset; index: number }) {
  const isYield = asset.metric?.label.toLowerCase().includes("yield") || asset.metric?.label.toLowerCase().includes("apy");

  return (
    <div
      className="group relative flex flex-col overflow-hidden snap-start"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        transition: "border-color 0.4s ease, box-shadow 0.4s ease, transform 0.4s ease",
        transitionDelay: `${index * 70}ms`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(196,133,42,0.20)";
        e.currentTarget.style.boxShadow = "0 -2px 20px rgba(196,133,42,0.12), 0 8px 32px rgba(0,0,0,0.35)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.boxShadow = "";
        e.currentTarget.style.transform = "";
      }}
    >
      {/* Top-edge amber reveal on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10"
      />

      {/* Thumbnail */}
      <div
        className="relative h-[120px] sm:h-44 overflow-hidden shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", borderRadius: "12px 12px 0 0" }}
      >
        <img
          src={asset.imageUrl}
          alt={asset.imageAlt}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(13,13,12,0.9)] via-[rgba(13,13,12,0.15)] to-transparent" />
        <span
          className="absolute bottom-3 left-4 inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase font-sans text-cedar-muted/70 bg-[rgba(13,13,12,0.8)] backdrop-blur-sm"
          style={{ border: "1px solid rgba(255,255,255,0.10)", borderRadius: "2px" }}
        >
          {asset.protocolLabel}
        </span>
        <span className="absolute bottom-3 right-4 text-cedar-muted/40 text-[10px] tracking-widest uppercase">
          {asset.category.replace(/-/g, " ")}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-5 flex flex-col gap-2 sm:gap-3 flex-1">
        <div>
          <h3 className="display text-[1.25rem] leading-tight text-cedar-text mb-1 group-hover:text-cedar-amber transition-colors duration-300">
            {asset.name}
          </h3>
          <p className="text-cedar-muted/60 text-xs flex items-center gap-1.5">
            {isYield
              ? <Percent size={11} className="text-cedar-amber opacity-60 shrink-0" />
              : <MapPin size={11} className="text-cedar-amber opacity-60 shrink-0" />
            }
            {asset.sublabel}
          </p>
        </div>

        {asset.metric && (
          <div
            className="mt-auto pt-3 flex items-end justify-between gap-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <p className="text-cedar-muted/40 text-[10px] tracking-widest uppercase mb-1">{asset.metric.label}</p>
              <p className="font-mono text-base font-medium tracking-tight text-cedar-text">
                {asset.metric.value}
              </p>
            </div>
            <div className="text-right">
              <p className="text-cedar-muted/40 text-[10px] tracking-widest uppercase mb-1">Price</p>
              <p className="font-mono text-base text-cedar-text tracking-tight">{asset.price}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hover CTA */}
      <div
        className="px-3 sm:px-5 py-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
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
      <div className="grid grid-flow-col auto-cols-[72vw] gap-3 overflow-x-auto -mx-6 px-6 snap-x snap-mandatory card-scroll-row sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:mx-0 sm:px-0 xl:grid-cols-4">
        {PLACEHOLDER_ASSETS.map((asset, i) => (
          <PlaceholderCard key={asset.id} asset={asset} index={i} />
        ))}
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-cedar-muted/30 text-[11px] tracking-wide">
          Sample listings — updates automatically once CedarX finishes indexing.
        </p>
        <Link to="/explore" className="btn-ghost text-sm">
          Browse all <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
