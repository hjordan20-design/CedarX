import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Key,
  Home,
  TrendingUp,
  ArrowRight,
  Check,
  Shield,
  FileText,
  Lock,
  BadgeCheck,
  ArrowLeftRight,
  MapPin,
  Bed,
  Calendar,
} from "lucide-react";

// ─── Mock listings for market preview ───────────────────────────────────────

const PREVIEW_LISTINGS = [
  { property: "Tiffany House", unit: "1BR", city: "Fort Lauderdale", period: "Jul – Dec 2026", months: 6, mintPrice: 18000, askPrices: [19200, 19400, 19100] },
  { property: "The Atlantic", unit: "2BR", city: "Fort Lauderdale", period: "Jan – Jun 2027", months: 6, mintPrice: 24000, askPrices: [22800, 23100, 22600] },
  { property: "Icon Brickell", unit: "1BR", city: "Miami", period: "Oct 2026 – Mar 2027", months: 6, mintPrice: 21000, askPrices: [23100, 22900, 23400] },
  { property: "Harbour House", unit: "Studio", city: "Fort Lauderdale", period: "Jul – Sep 2026", months: 3, mintPrice: 9600, askPrices: [10400, 10600, 10300] },
];

const CITIES = ["All Cities", "Fort Lauderdale", "Miami"];
const UNIT_TYPES = ["All Types", "Studio", "1BR", "2BR"];
const MOVE_IN_QUARTERS = ["Any Move-in", "Q3 2026", "Q4 2026", "Q1 2027", "Q2 2027"];

function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function perMonth(price: number, months: number): string {
  return `~$${Math.round(price / months).toLocaleString("en-US")}/mo`;
}

function changePct(mint: number, ask: number): number {
  return ((ask - mint) / mint) * 100;
}

// ─── Reusable components ────────────────────────────────────────────────────

function SectionLabel({ children, center }: { children: string; center?: boolean }) {
  return (
    <span className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-relay-gold ${center ? "block text-center" : ""}`}>
      {children}
    </span>
  );
}

function GoldDivider() {
  return <div className="w-full h-px" style={{ background: "rgba(201,169,110,0.08)" }} />;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function HomePage() {
  const [tradeCount, setTradeCount] = useState(47);
  const [counterBump, setCounterBump] = useState(false);
  const [priceIndex, setPriceIndex] = useState(0);
  const [priceFading, setPriceFading] = useState(false);
  const [lmCity, setLmCity] = useState("All Cities");
  const [lmUnit, setLmUnit] = useState("All Types");
  const [lmMoveIn, setLmMoveIn] = useState("Any Move-in");

  const filteredPreview = useMemo(() => {
    return PREVIEW_LISTINGS.filter((l) => {
      if (lmCity !== "All Cities" && l.city !== lmCity) return false;
      if (lmUnit !== "All Types" && l.unit !== lmUnit) return false;
      if (lmMoveIn !== "Any Move-in") {
        // Simple match: check if the period string contains the year from the quarter
        const year = lmMoveIn.slice(-4);
        if (!l.period.includes(year)) return false;
      }
      return true;
    });
  }, [lmCity, lmUnit, lmMoveIn]);

  useEffect(() => {
    const id = setInterval(() => {
      setCounterBump(true);
      setTradeCount((c) => c + 1);
      setTimeout(() => setCounterBump(false), 400);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPriceFading(true);
      setTimeout(() => {
        setPriceIndex((i) => (i + 1) % 3);
        setPriceFading(false);
      }, 350);
    }, 9000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=85')" }}
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

        <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6 pt-20 sm:pt-28 md:pt-32 pb-16 sm:pb-20 md:pb-24">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between md:gap-12">
            {/* Left — text */}
            <div className="flex-1">
              <h1 className="font-semibold text-white">
                <span className="block text-[32px] sm:text-[48px] md:text-[64px] leading-[1.1] tracking-wide">Stay or trade.</span>
                <span className="block text-[32px] sm:text-[48px] md:text-[64px] leading-[1.1] text-relay-gold italic">Your Key.</span>
              </h1>
              <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">
                <span className="hidden sm:inline">RelayX turns furnished rentals into tradeable Keys. </span>Buy a furnished stay with USDC. Live in it, or sell it when the price is right.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-2 sm:gap-4">
                <a
                  href="#waitlist"
                  className="btn-primary w-full sm:w-auto text-center px-8 py-3.5"
                  style={{ boxShadow: "0 0 24px rgba(201,169,110,0.12)" }}
                >
                  Get Early Access
                </a>
                <a href="#how-it-works" className="sm:btn-secondary w-full sm:w-auto text-center px-8 py-3 text-sm text-white/50 hover:text-white/80 transition-colors sm:border sm:border-relay-border sm:rounded-lg sm:text-relay-secondary">
                  See how it works <span className="sm:hidden">&darr;</span>
                </a>
              </div>
            </div>

            {/* Right — floating Key card (desktop) */}
            <div className="hidden md:block w-[280px] lg:w-[300px] shrink-0">
              <div
                className="hero-key-card rounded-2xl overflow-hidden"
                style={{ background: "#141414", border: "1px solid rgba(201,169,110,0.25)" }}
              >
                <img
                  src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80"
                  alt="Furnished living room"
                  className="w-full h-32 object-cover"
                />
                <div className="p-4">
                  <div className="text-sm font-semibold text-relay-text">Tiffany House</div>
                  <div className="text-xs text-relay-secondary">Fort Lauderdale, FL</div>
                  <div className="text-xs text-relay-muted font-mono mt-2">Jan 1 – Jun 30, 2027</div>
                  <div className="font-mono text-lg font-semibold text-relay-text mt-1">$18,000 USDC</div>
                  <div className="font-mono text-xs text-relay-muted">~$3,000/mo</div>
                  <div className="mt-2">
                    <span
                      className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(201,169,110,0.15)", color: "#C9A96E" }}
                    >
                      Tradeable
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile floating Key card */}
          <div className="mt-8 flex md:hidden justify-center">
            <div
              className="hero-key-card rounded-2xl overflow-hidden w-full max-w-[280px]"
              style={{ background: "#141414", border: "1px solid rgba(201,169,110,0.25)" }}
            >
              <img
                src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400&q=80"
                alt="Furnished living room"
                className="w-full h-28 object-cover"
              />
              <div className="p-4">
                <div className="text-sm font-semibold text-relay-text">Tiffany House</div>
                <div className="text-xs text-relay-secondary">Fort Lauderdale, FL</div>
                <div className="text-xs text-relay-muted font-mono mt-2">Jan 1 – Jun 30, 2027</div>
                <div className="font-mono text-lg font-semibold text-relay-text mt-1">$18,000 USDC</div>
                <div className="font-mono text-xs text-relay-muted">~$3,000/mo</div>
                <div className="mt-2">
                  <span
                    className="inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(201,169,110,0.15)", color: "#C9A96E" }}
                  >
                    Tradeable
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo property link */}
      <div className="max-w-content mx-auto px-4 sm:px-6 py-4">
        <Link to="/properties/demo" className="text-sm text-relay-secondary hover:text-relay-gold transition-colors inline-flex items-center gap-1.5">
          View demo property <ArrowRight size={14} />
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM (left-aligned)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>THE PROBLEM</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Renting is broken for everyone.
          </h2>

          <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-5">
            {/* Renters — more prominent */}
            <div className="md:col-span-3 bg-relay-elevated rounded-2xl p-5 sm:p-8" style={{ border: "1px solid rgba(201,169,110,0.06)" }}>
              <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-4">For renters</h3>
              <ul className="space-y-3">
                {[
                  "Monthly payments forever — zero equity",
                  "Zero upside if the area appreciates",
                  "Can't sublease or transfer your lease",
                  "Eviction risk if the landlord sells",
                  "Nothing to show at the end",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-relay-muted">
                    <span className="mt-1 shrink-0 select-none text-[8px]" style={{ color: "rgba(201,169,110,0.4)" }}>●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Landlords */}
            <div className="md:col-span-2 bg-relay-elevated rounded-2xl p-5 sm:p-8" style={{ border: "1px solid rgba(201,169,110,0.06)" }}>
              <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-4">For landlords</h3>
              <ul className="space-y-3">
                {[
                  "Chase payments every 30 days",
                  "Vacancy risk between tenants",
                  "Late payments, collections, legal costs",
                  "Revenue trickles in monthly",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[14px] sm:text-[15px] text-relay-muted">
                    <span className="mt-1 shrink-0 select-none text-[8px]" style={{ color: "rgba(201,169,110,0.4)" }}>●</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3 — THE SOLUTION (center-aligned)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6 text-center">
          <SectionLabel center>THE SOLUTION</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight max-w-2xl mx-auto">
            What if rent was a one-time purchase you could flip?
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-xl mx-auto leading-relaxed">
            RelayX turns future occupancy into tradeable Keys. Landlords get paid upfront. Buyers get a real asset they can live in or sell.
          </p>

          {/* Featured card */}
          <div
            className="mt-10 sm:mt-12 bg-relay-elevated rounded-2xl p-6 sm:p-8 md:p-10 text-left"
            style={{ border: "1px solid rgba(201,169,110,0.15)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(201,169,110,0.1)" }}
              >
                <Key className="w-6 h-6 sm:w-7 sm:h-7 text-relay-gold" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-relay-text mb-2">Buy a Key</h3>
                <p className="text-[15px] sm:text-base text-relay-secondary leading-relaxed">
                  Pick a property, pick your dates, pay in USDC. Your Key is your right to live there.
                </p>
              </div>
            </div>
          </div>

          {/* Two smaller cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mt-3 sm:mt-5">
            {[
              {
                icon: <Home className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Live in it",
                desc: "Redeem your Key, pass a background check, move in. No lease, no monthly payments.",
              },
              {
                icon: <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Or trade it",
                desc: "Don't want to move in? List your Key on the secondary market. If demand rises, so does your Key's value.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-relay-elevated rounded-2xl p-6 sm:p-8 text-left"
                style={{ border: "1px solid rgba(201,169,110,0.1)" }}
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-5"
                  style={{ background: "rgba(201,169,110,0.1)" }}
                >
                  <span className="text-relay-gold">{card.icon}</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-2">{card.title}</h3>
                <p className="text-[15px] text-relay-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS (left-aligned)
      ══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-10 sm:py-14 md:py-16 scroll-mt-20">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>HOW IT WORKS</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Four steps. Zero paperwork.
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-lg leading-relaxed">
            No applications. No credit checks. No waiting for a landlord to text back.
          </p>

          <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {[
              { num: "01", title: "Landlord lists", desc: "Property owner sets available periods and prices. We handle the rest." },
              { num: "02", title: "You buy a Key", desc: "Browse properties, pick dates, pay USDC. Your Key is minted instantly." },
              { num: "03", title: "Move in or trade", desc: "Redeem to live there, or list on secondary market. Your choice." },
              { num: "04", title: "Key expires", desc: "When the period ends, Key burns. Property returns fully unencumbered." },
            ].map((step) => (
              <div
                key={step.num}
                className="bg-relay-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden"
                style={{ border: "1px solid rgba(201,169,110,0.08)" }}
              >
                <div
                  className="absolute top-3 right-4 sm:top-4 sm:right-5 text-[48px] sm:text-[64px] md:text-[72px] font-bold leading-none select-none pointer-events-none"
                  style={{ color: "rgba(201,169,110,0.1)" }}
                >
                  {step.num}
                </div>
                <div className="relative z-10 pt-8 sm:pt-10">
                  <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-2">{step.title}</h3>
                  <p className="text-[15px] text-relay-secondary leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 5 — FOR LANDLORDS (center-aligned)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="text-center">
            <SectionLabel center>FOR LANDLORDS</SectionLabel>
            <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
              Get years of rent. Today.
            </h2>
            <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-lg mx-auto leading-relaxed">
              Your property manager handles everything. You receive USDC the moment Keys sell.
            </p>
          </div>

          <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
            {/* Traditional */}
            <div className="bg-relay-elevated rounded-2xl p-6 sm:p-8" style={{ border: "1px solid rgba(201,169,110,0.06)" }}>
              <h3 className="text-xs font-semibold text-relay-muted uppercase tracking-wider mb-5">Traditional Rental</h3>
              <ul className="space-y-3">
                <li className="text-[15px] text-relay-muted">Monthly collection</li>
                <li className="text-[15px] text-relay-muted">Vacancy between tenants</li>
                <li className="text-[15px] text-relay-muted">Late payments and collections</li>
                <li className="text-[15px] text-relay-muted">Revenue trickles in monthly</li>
              </ul>
            </div>

            {/* RelayX */}
            <div className="bg-relay-elevated rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{ border: "1px solid rgba(201,169,110,0.2)" }}>
              <div className="absolute top-0 right-0 bg-relay-gold text-black text-[11px] font-semibold px-3 py-1 rounded-bl-lg">
                RelayX
              </div>
              <h3 className="text-xs font-semibold text-relay-gold uppercase tracking-wider mb-5">RelayX Pre-Sale</h3>
              <ul className="space-y-3">
                {[
                  "Full payment upfront in USDC",
                  "Zero vacancy — sold before it starts",
                  "No collections, no chasing tenants",
                  "Revenue arrives all at once",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-[15px] text-relay-text">
                    <Check size={15} className="text-relay-gold shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link to="/landlords" className="btn-primary inline-flex px-8 py-3.5">
              List Your Property <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — YOUR PROTECTION (Trust & Safety)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>YOUR PROTECTION</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Built on trust. Enforced by code.
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-xl leading-relaxed">
            Every Key is backed by real legal protections and professional property management.
          </p>

          <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            {[
              {
                icon: <Shield className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Professional management",
                desc: "Every property is managed by a licensed, vetted property management company. Real reviews, real track record, real reputation.",
              },
              {
                icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Legal occupancy rights",
                desc: "A memorandum of occupancy is recorded against the property title when Keys are minted. Your right to stay is legally enforceable — not just a token.",
              },
              {
                icon: <Lock className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Damage deposit in escrow",
                desc: "Your 10% deposit is held in smart contract escrow. No damages after your stay? Auto-released to your wallet. No disputes, no delays.",
              },
              {
                icon: <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6" />,
                title: "Verified properties",
                desc: "PM inspects every property before listing. HOA compliance confirmed. Furnished to standard. Photos verified — what you see is what you get.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-relay-elevated rounded-2xl p-6 sm:p-8"
                style={{ border: "1px solid rgba(201,169,110,0.08)" }}
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-4 sm:mb-5"
                  style={{ background: "rgba(201,169,110,0.1)" }}
                >
                  <span className="text-relay-gold">{card.icon}</span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-2">{card.title}</h3>
                <p className="text-[15px] text-relay-secondary leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-relay-muted text-center sm:text-left">
            At launch, every listing displays the managing PM&apos;s company profile with links to their Google and Yelp reviews.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 7 — SECONDARY MARKET PREVIEW (left-aligned)
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>LIVE MARKET</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Keys are trading now.
          </h2>

          {/* Filters + counter */}
          <div className="mt-4 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm text-relay-secondary">
              <span className={`inline-block font-mono text-relay-gold font-semibold transition-all duration-400 ${counterBump ? "opacity-60 -translate-y-0.5" : ""}`}>
                {tradeCount}
              </span>
              {" "}Keys traded in the last 24 hours
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-relay-muted" />
                <select value={lmCity} onChange={(e) => setLmCity(e.target.value)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <Bed size={12} className="text-relay-muted" />
                <select value={lmUnit} onChange={(e) => setLmUnit(e.target.value)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                  {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-relay-muted" />
                <select value={lmMoveIn} onChange={(e) => setLmMoveIn(e.target.value)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                  {MOVE_IN_QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-2 text-[11px] text-relay-muted uppercase tracking-wider">
              <span>Property</span>
              <span>Period</span>
              <span className="text-right">Mint</span>
              <span className="text-right">Ask</span>
              <span className="text-right">Change</span>
            </div>

            {filteredPreview.map((listing) => {
              const currentAsk = listing.askPrices[priceIndex];
              const pct = changePct(listing.mintPrice, currentAsk);
              const isUp = pct >= 0;
              return (
                <div
                  key={listing.property + listing.period}
                  className="bg-relay-elevated rounded-xl px-4 sm:px-5 py-3.5 transition-colors"
                  style={{ border: "1px solid rgba(201,169,110,0.06)", borderLeftWidth: "2px", borderLeftColor: "transparent" }}
                  onMouseEnter={(e) => { (e.currentTarget.style as any).borderLeftColor = "rgba(201,169,110,0.4)"; }}
                  onMouseLeave={(e) => { (e.currentTarget.style as any).borderLeftColor = "transparent"; }}
                >
                  {/* Desktop */}
                  <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 items-center">
                    <div>
                      <span className="text-sm font-semibold text-relay-text">{listing.property}</span>
                      <span className="text-relay-secondary text-xs ml-2">{listing.unit}</span>
                    </div>
                    <div className="text-xs text-relay-secondary font-mono">{listing.period}</div>
                    <div className="text-right font-mono text-sm text-relay-muted">{formatPrice(listing.mintPrice)}</div>
                    <div className={`text-right price-tick ${priceFading ? "price-tick-fade" : ""}`}>
                      <div className="font-mono text-sm font-semibold text-relay-text">{formatPrice(currentAsk)}</div>
                      <div className="font-mono text-[11px] text-relay-muted">{perMonth(currentAsk, listing.months)}</div>
                    </div>
                    <div className={`text-right font-mono text-sm font-semibold price-tick ${priceFading ? "price-tick-fade" : ""} ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? "+" : ""}{pct.toFixed(1)}%
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className="flex sm:hidden items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-relay-text truncate">
                        {listing.property} <span className="text-relay-secondary font-normal text-xs">{listing.unit}</span>
                      </div>
                      <div className="text-[11px] text-relay-muted font-mono mt-0.5">{listing.period}</div>
                    </div>
                    <div className={`text-right shrink-0 ml-4 price-tick ${priceFading ? "price-tick-fade" : ""}`}>
                      <div className="font-mono text-sm font-semibold text-relay-text">{formatPrice(currentAsk)}</div>
                      <div className="font-mono text-[10px] text-relay-muted">{perMonth(currentAsk, listing.months)}</div>
                      <div className={`font-mono text-[11px] font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                        {isUp ? "+" : ""}{pct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8">
            <Link to="/trade" className="btn-secondary inline-flex px-8 py-3.5">
              View all trades <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 8 — WAITLIST CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section id="waitlist" className="relative py-14 sm:py-20 md:py-24 scroll-mt-20 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(201,169,110,0.03) 0%, transparent 40%)" }}
        />

        <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-semibold text-relay-text leading-tight tracking-tight">
            <span className="block text-[26px] sm:text-[36px] md:text-[48px]">Stay or trade.</span>
            <span className="block text-[26px] sm:text-[36px] md:text-[48px] text-relay-gold">Your Key.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-md mx-auto leading-relaxed">
            Early access for landlords and renters. Be first when we go live.
          </p>

          <form
            className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full sm:flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg px-5 py-3.5 text-sm text-relay-text placeholder-relay-muted focus:outline-none focus:border-relay-gold transition-colors"
            />
            <button
              type="submit"
              className="btn-primary w-full sm:w-auto whitespace-nowrap px-8 py-3.5"
              style={{ boxShadow: "0 0 24px rgba(201,169,110,0.15)" }}
            >
              Join Waitlist
            </button>
          </form>

          <p className="mt-6 text-xs text-relay-muted">
            Settlement in USDC &nbsp;|&nbsp; Ethereum
          </p>
        </div>
      </section>
    </div>
  );
}
