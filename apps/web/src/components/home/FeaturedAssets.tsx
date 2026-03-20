import { Link } from "react-router-dom";
import { ArrowRight, MapPin, TrendingUp, Percent } from "lucide-react";
import { useInView } from "@/hooks/useInView";

interface FeaturedAsset {
  id: string;
  name: string;
  sublabel: string;
  price: string;
  metric: { label: string; value: string };
  protocol: string;
  protocolLabel: string;
  category: string;
}

const FEATURED: FeaturedAsset[] = [
  {
    id: "apache-10ac",
    name: "Apache County Parcel",
    sublabel: "10 acres · Apache County, AZ",
    price: "$12,500",
    metric: { label: "Acreage", value: "10 ac" },
    protocol: "fabrica",
    protocolLabel: "Fabrica",
    category: "land",
  },
  {
    id: "presidio-40ac",
    name: "Presidio County Parcel",
    sublabel: "40 acres · Presidio County, TX",
    price: "$28,000",
    metric: { label: "Acreage", value: "40 ac" },
    protocol: "fabrica",
    protocolLabel: "Fabrica",
    category: "land",
  },
  {
    id: "ondo-usdy",
    name: "Ondo USDY",
    sublabel: "Tokenized US Dollar Yield",
    price: "$1.00 / token",
    metric: { label: "APY", value: "4.25%" },
    protocol: "ondo",
    protocolLabel: "Ondo Finance",
    category: "fixed-income",
  },
  {
    id: "realt-detroit",
    name: "15777 Ardmore St",
    sublabel: "Rental property · Detroit, MI",
    price: "$52.40 / token",
    metric: { label: "Rental yield", value: "9.2%" },
    protocol: "realt",
    protocolLabel: "RealT",
    category: "rental-property",
  },
];

function MetricIcon({ category }: { category: string }) {
  if (category === "fixed-income" || category === "rental-property") {
    return <Percent size={11} className="text-cedar-green" />;
  }
  return <MapPin size={11} className="text-cedar-amber opacity-60" />;
}

function FeaturedCard({ asset, index }: { asset: FeaturedAsset; index: number }) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`group relative bg-cedar-surface border border-cedar-border flex flex-col overflow-hidden
        transition-all duration-300 hover:-translate-y-1 hover:border-cedar-amber/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        scroll-fade${inView ? " in-view" : ""}`}
      style={{ transitionDelay: inView ? `${index * 70}ms` : "0ms" }}
    >
      {/* Top amber rule — animates in on hover */}
      <div className="absolute top-0 left-0 right-0 h-px bg-cedar-amber scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      <div className="p-6 flex flex-col gap-4 flex-1">
        {/* Protocol badge + category */}
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase font-sans border border-cedar-border text-cedar-muted bg-cedar-bg">
            {asset.protocolLabel}
          </span>
          <span className="text-cedar-muted/50 text-[10px] tracking-widest uppercase">
            {asset.category.replace("-", " ")}
          </span>
        </div>

        {/* Asset name */}
        <div>
          <h3 className="display text-[1.35rem] leading-tight text-cedar-text mb-1 group-hover:text-cedar-amber transition-colors duration-200">
            {asset.name}
          </h3>
          <p className="text-cedar-muted text-xs flex items-center gap-1.5">
            <MetricIcon category={asset.category} />
            {asset.sublabel}
          </p>
        </div>

        {/* Key metric */}
        <div className="mt-auto pt-4 border-t border-cedar-border flex items-end justify-between gap-4">
          <div>
            <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">
              {asset.metric.label}
            </p>
            <p className={`font-mono text-base font-medium tracking-tight ${
              asset.category === "fixed-income" || asset.category === "rental-property"
                ? "text-cedar-green"
                : "text-cedar-text"
            }`}>
              {asset.metric.value}
            </p>
          </div>
          <div className="text-right">
            <p className="text-cedar-muted text-[10px] tracking-widest uppercase mb-1">Price</p>
            <p className="font-mono text-base text-cedar-text tracking-tight">{asset.price}</p>
          </div>
        </div>
      </div>

      {/* Hover CTA bar */}
      <div className="px-6 py-3 border-t border-cedar-border bg-cedar-surface-alt flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-cedar-amber text-xs tracking-widest uppercase">View asset</span>
        <ArrowRight size={12} className="text-cedar-amber" />
      </div>
    </div>
  );
}

export function FeaturedAssets() {
  const { ref: headingRef, inView: headingInView } = useInView();

  return (
    <section className="max-w-7xl mx-auto px-6 py-24 border-t border-cedar-border">
      <div
        ref={headingRef as React.Ref<HTMLDivElement>}
        className={`mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6 scroll-fade${headingInView ? " in-view" : ""}`}
      >
        <div>
          <h2 className="display text-display-md text-cedar-text mb-3">
            Featured assets
          </h2>
          <p className="text-cedar-muted text-sm tracking-widest uppercase">
            Sample listings — live data coming once indexer syncs
          </p>
        </div>
        <Link to="/explore" className="btn-ghost shrink-0 self-start sm:self-auto">
          Browse all
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-px bg-cedar-border">
        {FEATURED.map((asset, i) => (
          <FeaturedCard key={asset.id} asset={asset} index={i} />
        ))}
      </div>

      {/* Indexer note */}
      <p className="mt-6 text-cedar-muted/50 text-[11px] text-center tracking-wide">
        Placeholder data. Asset listings will update automatically once CedarX finishes indexing Fabrica, Ondo Finance, and RealT.
      </p>
    </section>
  );
}
