import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useStats } from "@/hooks/useStats";
import { formatCount, formatVolume } from "@/lib/formatters";

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5 border border-cedar-border px-4 py-2.5">
      <span className="font-mono text-lg text-cedar-text tracking-tight">{value}</span>
      <span className="text-cedar-muted text-xs tracking-widest uppercase">{label}</span>
    </div>
  );
}

export function Hero() {
  const { data: stats } = useStats();

  return (
    <section className="relative min-h-screen flex items-center bg-hero-glow">
      {/* Grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 120% 80% at 50% 50%, transparent 40%, rgba(12,14,9,0.6) 100%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 w-full">
        <div className="max-w-3xl">
          {/* Headline */}
          <h1
            className="display text-display-lg text-cedar-text mb-8 animate-fade-up"
            style={{ animationDelay: "40ms" }}
          >
            Real assets.
            <br />
            <em className="not-italic text-cedar-amber">Onchain.</em>
          </h1>

          {/* Subheading */}
          <p
            className="text-cedar-muted text-lg leading-relaxed max-w-xl mb-12 animate-fade-up"
            style={{ animationDelay: "130ms" }}
          >
            Browse and trade tokenized land, treasuries, and income-producing
            real estate. Connect your wallet. Buy with USDC.
          </p>

          {/* Stats */}
          <div
            className="flex flex-wrap gap-3 mb-12 animate-fade-up"
            style={{ animationDelay: "220ms" }}
          >
            <StatPill
              label="assets indexed"
              value={stats ? formatCount(stats.totalAssets) : "1,100+"}
            />
            <StatPill
              label="total volume"
              value={stats ? formatVolume(Number(stats.totalVolume)) : "$2B+"}
            />
          </div>

          {/* CTA */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: "310ms" }}
          >
            <Link to="/explore" className="btn-primary text-base px-8 py-4">
              Explore assets
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cedar-bg to-transparent pointer-events-none" />
    </section>
  );
}
