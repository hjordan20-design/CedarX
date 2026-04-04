import { Link } from "react-router-dom";
import {
  Key,
  Home,
  TrendingUp,
  DollarSign,
  Shield,
  Zap,
  ArrowRight,
  Check,
} from "lucide-react";

// ─── Mock listings for market preview ───────────────────────────────────────

const PREVIEW_LISTINGS = [
  { property: "Tiffany House", unit: "1BR", period: "Jul – Dec 2026", months: 6, mintPrice: 18000, askPrice: 19200 },
  { property: "The Atlantic", unit: "2BR", period: "Jan – Jun 2027", months: 6, mintPrice: 24000, askPrice: 22800 },
  { property: "Icon Brickell", unit: "1BR", period: "Oct 2026 – Mar 2027", months: 6, mintPrice: 21000, askPrice: 23100 },
  { property: "Harbour House", unit: "Studio", period: "Jul – Sep 2026", months: 3, mintPrice: 9600, askPrice: 10400 },
];

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

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-relay-gold">
      {children}
    </span>
  );
}

function GoldDivider() {
  return <div className="w-full h-px" style={{ background: "rgba(201,169,110,0.08)" }} />;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <div>
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1920&q=85')" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(15,12,8,0.75)" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

        <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6 pt-28 sm:pt-36 md:pt-44 pb-16 sm:pb-20 md:pb-24">
          <h1 className="font-semibold text-white tracking-tight max-w-3xl">
            <span className="block text-[32px] sm:text-[44px] md:text-[56px] leading-[1.1]">Own the time.</span>
            <span className="block text-[32px] sm:text-[44px] md:text-[56px] leading-[1.1] text-relay-gold">Trade the rest.</span>
          </h1>
          <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-white/70 max-w-xl leading-relaxed">
            RelayX is a marketplace where landlords pre-sell furnished rental periods as tradeable digital Keys. Buyers pay in USDC. Move in or flip it.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a
              href="#waitlist"
              className="btn-primary w-full sm:w-auto text-center px-8 py-3.5"
              style={{ boxShadow: "0 0 24px rgba(201,169,110,0.12)" }}
            >
              Get Early Access
            </a>
            <a href="#how-it-works" className="btn-secondary w-full sm:w-auto text-center px-8 py-3.5">
              See how it works
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>THE PROBLEM</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Renting is broken for everyone.
          </h2>

          <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
            {/* Renters */}
            <div className="bg-relay-elevated rounded-2xl p-6 sm:p-8" style={{ border: "1px solid rgba(239,68,68,0.08)" }}>
              <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-4">For renters</h3>
              <ul className="space-y-3">
                {[
                  "Monthly payments forever — zero equity",
                  "Zero upside if the area appreciates",
                  "Can't sublease or transfer your lease",
                  "Eviction risk if the landlord sells",
                  "Nothing to show at the end",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] text-relay-muted">
                    <span className="text-relay-border mt-0.5 shrink-0 select-none">—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Landlords */}
            <div className="bg-relay-elevated rounded-2xl p-6 sm:p-8" style={{ border: "1px solid rgba(239,68,68,0.08)" }}>
              <h3 className="text-base sm:text-lg font-semibold text-relay-text mb-4">For landlords</h3>
              <ul className="space-y-3">
                {[
                  "Chase payments every 30 days",
                  "Vacancy risk between tenants",
                  "Late payments, collections, legal costs",
                  "Revenue trickles in monthly",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[15px] text-relay-muted">
                    <span className="text-relay-border mt-0.5 shrink-0 select-none">—</span>
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
          SECTION 3 — THE SOLUTION
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>THE SOLUTION</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight max-w-2xl">
            What if rent was a one-time purchase you could flip?
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-xl leading-relaxed">
            RelayX turns future occupancy into tradeable Keys. Landlords get paid upfront. Buyers get a real asset they can live in or sell.
          </p>

          <div className="mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
            {[
              {
                icon: <Key className="w-6 h-6 sm:w-7 sm:h-7" />,
                title: "Buy a Key",
                desc: "Pick a property, pick your dates, pay in USDC. Your Key is your right to live there.",
              },
              {
                icon: <Home className="w-6 h-6 sm:w-7 sm:h-7" />,
                title: "Live in it",
                desc: "Redeem your Key, pass a background check, move in. No lease, no monthly payments.",
              },
              {
                icon: <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" />,
                title: "Or flip it",
                desc: "Don't want to move in? List your Key on the secondary market. If demand rises, so does your Key's value.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-relay-elevated rounded-2xl p-6 sm:p-8"
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
          SECTION 4 — HOW IT WORKS
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
          SECTION 5 — FOR LANDLORDS
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>FOR LANDLORDS</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Get years of rent. Today.
          </h2>
          <p className="mt-4 text-base sm:text-lg md:text-xl text-relay-secondary max-w-lg leading-relaxed">
            Your property manager handles everything. You receive USDC the moment Keys sell.
          </p>

          <div className="mt-8 sm:mt-10 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
            {/* Traditional — calm gray, no icons */}
            <div className="bg-relay-elevated rounded-2xl p-6 sm:p-8" style={{ border: "1px solid rgba(201,169,110,0.06)" }}>
              <h3 className="text-xs font-semibold text-relay-muted uppercase tracking-wider mb-5">Traditional Rental</h3>
              <ul className="space-y-3">
                <li className="text-[15px] text-relay-muted">Monthly collection</li>
                <li className="text-[15px] text-relay-muted">Vacancy between tenants</li>
                <li className="text-[15px] text-relay-muted">Late payments and collections</li>
                <li className="text-[15px] text-relay-muted">Revenue trickles in monthly</li>
              </ul>
            </div>

            {/* RelayX — gold accents, checkmarks */}
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

          <div className="mt-8">
            <Link to="/landlords" className="btn-primary inline-flex px-8 py-3.5">
              List Your Property <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 6 — SECONDARY MARKET PREVIEW
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-10 sm:py-14 md:py-16">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <SectionLabel>LIVE MARKET</SectionLabel>
          <h2 className="mt-3 text-[26px] sm:text-[36px] md:text-[44px] font-semibold text-relay-text leading-tight tracking-tight">
            Keys are trading now.
          </h2>

          <div className="mt-8 sm:mt-10 space-y-1.5">
            {/* Table header — desktop only */}
            <div className="hidden sm:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-2 text-[11px] text-relay-muted uppercase tracking-wider">
              <span>Property</span>
              <span>Period</span>
              <span className="text-right">Mint</span>
              <span className="text-right">Ask</span>
              <span className="text-right">Change</span>
            </div>

            {PREVIEW_LISTINGS.map((listing) => {
              const pct = changePct(listing.mintPrice, listing.askPrice);
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
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-relay-text">{formatPrice(listing.askPrice)}</div>
                      <div className="font-mono text-[11px] text-relay-muted">{perMonth(listing.askPrice, listing.months)}</div>
                    </div>
                    <div className={`text-right font-mono text-sm font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
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
                    <div className="text-right shrink-0 ml-4">
                      <div className="font-mono text-sm font-semibold text-relay-text">{formatPrice(listing.askPrice)}</div>
                      <div className="font-mono text-[10px] text-relay-muted">{perMonth(listing.askPrice, listing.months)}</div>
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
          SECTION 7 — WAITLIST CTA
      ══════════════════════════════════════════════════════════════════ */}
      <section id="waitlist" className="relative py-14 sm:py-20 md:py-24 scroll-mt-20 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=1920&q=85')" }}
        />
        <div className="absolute inset-0" style={{ background: "rgba(10,10,10,0.92)" }} />

        <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-semibold text-relay-text leading-tight tracking-tight">
            <span className="block text-[26px] sm:text-[36px] md:text-[48px]">Own the time.</span>
            <span className="block text-[26px] sm:text-[36px] md:text-[48px] text-relay-gold">Trade the rest.</span>
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
