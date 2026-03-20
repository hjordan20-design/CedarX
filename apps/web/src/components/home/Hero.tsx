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

/** Faint topographic contour lines — CSS/SVG background element */
function TopoBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent 30%, rgba(0,0,0,0.6) 60%, black 80%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 30%, rgba(0,0,0,0.6) 60%, black 80%)",
      }}
    >
      <svg
        viewBox="0 0 900 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[55%] opacity-[0.055] text-cedar-amber"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Topographic contour lines — irregular concentric paths */}
        <path d="M450,350 C470,330 510,318 540,328 C570,338 585,360 575,385 C565,410 535,422 505,416 C475,410 450,390 450,350 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M430,360 C455,320 515,295 565,310 C615,325 640,368 628,410 C616,452 572,472 528,462 C484,452 445,415 430,360 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M405,375 C435,315 510,278 580,295 C650,312 688,372 674,435 C660,498 605,525 545,512 C485,499 430,448 405,375 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M375,392 C410,312 500,262 590,280 C680,298 728,375 712,458 C696,541 630,578 555,562 C480,546 410,484 375,392 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M340,408 C385,305 490,245 600,265 C710,285 768,378 750,480 C732,582 652,628 562,610 C472,592 388,518 340,408 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M300,425 C355,295 478,225 610,248 C742,271 810,382 790,505 C770,628 676,682 572,660 C468,638 364,552 300,425 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M258,442 C325,285 462,205 618,230 C774,255 852,387 830,530 C808,673 700,736 582,710 C464,684 340,584 258,442 Z"
          stroke="currentColor" strokeWidth="1" />
        <path d="M210,460 C292,272 445,182 625,210 C805,238 895,392 870,555 C845,718 722,790 590,762 C458,734 314,618 210,460 Z"
          stroke="currentColor" strokeWidth="1" />
        {/* Cross-hatch accent lines — subtle grid suggesting a parcel survey */}
        <line x1="480" y1="200" x2="480" y2="580" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <line x1="560" y1="200" x2="560" y2="580" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <line x1="640" y1="220" x2="640" y2="560" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <line x1="300" y1="390" x2="780" y2="390" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
        <line x1="260" y1="460" x2="820" y2="460" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.5" />
      </svg>
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

      {/* Topographic background element */}
      <TopoBackground />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 120% 80% at 50% 50%, transparent 40%, rgba(12,14,9,0.6) 100%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 pt-14 pb-24 w-full">
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
