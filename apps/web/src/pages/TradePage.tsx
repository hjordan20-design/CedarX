import { useState, useEffect, useMemo, useRef } from "react";
import { ArrowUpDown, Activity, MapPin, Bed, Flame, Calendar } from "lucide-react";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_LISTINGS = [
  { id: "l-1", property: "Tiffany House", unit: "1BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=120&q=80", periodStart: "Jul 1, 2026", periodEnd: "Dec 31, 2026", mintPrice: 18000, askPrice: 19200, volume: 7, seller: "0xA1b2…c3D4" },
  { id: "l-2", property: "The Atlantic", unit: "2BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=120&q=80", periodStart: "Jan 1, 2027", periodEnd: "Jun 30, 2027", mintPrice: 24000, askPrice: 22800, volume: 3, seller: "0x7eF9…a2B1" },
  { id: "l-3", property: "Icon Brickell", unit: "1BR", city: "Miami", photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120&q=80", periodStart: "Oct 1, 2026", periodEnd: "Mar 31, 2027", mintPrice: 21000, askPrice: 23100, volume: 11, seller: "0x3cD8…f7E2" },
  { id: "l-4", property: "Tiffany House", unit: "2BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=120&q=80", periodStart: "Jan 1, 2027", periodEnd: "Jun 30, 2027", mintPrice: 26000, askPrice: 25350, volume: 2, seller: "0xBb41…9aF3" },
  { id: "l-5", property: "Harbour House", unit: "Studio", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=120&q=80", periodStart: "Jul 1, 2026", periodEnd: "Sep 30, 2026", mintPrice: 9600, askPrice: 10400, volume: 5, seller: "0xE5a0…c1D7" },
  { id: "l-6", property: "The Atlantic", unit: "1BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=120&q=80", periodStart: "Jul 1, 2026", periodEnd: "Dec 31, 2026", mintPrice: 18000, askPrice: 16900, volume: 4, seller: "0x9fC2…e4A8" },
  { id: "l-7", property: "Icon Brickell", unit: "2BR", city: "Miami", photo: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=120&q=80", periodStart: "Apr 1, 2027", periodEnd: "Sep 30, 2027", mintPrice: 28000, askPrice: 29400, volume: 9, seller: "0x2aB6…d0F5" },
  { id: "l-8", property: "Las Olas Grand", unit: "1BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=120&q=80", periodStart: "Oct 1, 2026", periodEnd: "Dec 31, 2026", mintPrice: 10500, askPrice: 10100, volume: 1, seller: "0xF8d4…b3C9" },
  { id: "l-9", property: "Harbour House", unit: "1BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=120&q=80", periodStart: "Jan 1, 2027", periodEnd: "Jun 30, 2027", mintPrice: 17500, askPrice: 18900, volume: 6, seller: "0x6cE1…a7D2" },
  { id: "l-10", property: "Las Olas Grand", unit: "2BR", city: "Fort Lauderdale", photo: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=120&q=80", periodStart: "Jul 1, 2026", periodEnd: "Dec 31, 2026", mintPrice: 22000, askPrice: 21500, volume: 3, seller: "0x4bA3…f2E6" },
];

const MOCK_TRADES = [
  { id: "t-1", property: "Icon Brickell", unit: "1BR", city: "Miami", price: 21400, months: 6, time: "2 min ago", buyer: "0xD2c5…a8F1" },
  { id: "t-2", property: "Tiffany House", unit: "Studio", city: "Fort Lauderdale", price: 9800, months: 3, time: "8 min ago", buyer: "0x7aB1…e3C4" },
  { id: "t-3", property: "The Atlantic", unit: "2BR", city: "Fort Lauderdale", price: 25200, months: 6, time: "23 min ago", buyer: "0xF1d9…b6A2" },
  { id: "t-4", property: "Harbour House", unit: "1BR", city: "Fort Lauderdale", price: 17200, months: 6, time: "1 hr ago", buyer: "0x3eC8…d5F7" },
  { id: "t-5", property: "Las Olas Grand", unit: "1BR", city: "Fort Lauderdale", price: 10800, months: 3, time: "1 hr ago", buyer: "0xA4b2…c9E1" },
  { id: "t-6", property: "Icon Brickell", unit: "2BR", city: "Miami", price: 28600, months: 6, time: "2 hr ago", buyer: "0x8fD3…a1B4" },
  { id: "t-7", property: "Tiffany House", unit: "1BR", city: "Fort Lauderdale", price: 18400, months: 6, time: "3 hr ago", buyer: "0xC7e6…f2D8" },
  { id: "t-8", property: "The Atlantic", unit: "1BR", city: "Fort Lauderdale", price: 17500, months: 6, time: "5 hr ago", buyer: "0x5aF0…b8C3" },
];

const CITIES = ["All Cities", "Fort Lauderdale", "Miami"];
const UNIT_TYPES = ["All Types", "Studio", "1BR", "2BR"];
const MOVE_IN_QUARTERS = ["Any Move-in", "Q3 2026", "Q4 2026", "Q1 2027", "Q2 2027", "Q3 2027"];

const TICKER_ITEMS = MOCK_LISTINGS.map((l) => {
  const pct = ((l.askPrice - l.mintPrice) / l.mintPrice) * 100;
  return { text: `${l.property} ${l.unit} — ${formatPrice(l.askPrice)} (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`, isUp: pct >= 0 };
});

const STATS = {
  activeListings: 12,
  volume24h: 47200,
  totalTraded: 312400,
  floorPrice: 14800,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return `$${n.toLocaleString("en-US")}`;
}

function calcMonths(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max((e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()), 1);
}

function perMonth(price: number, months: number): string {
  return `~$${Math.round(price / months).toLocaleString("en-US")}/mo`;
}

function changePct(mint: number, ask: number): number {
  return ((ask - mint) / mint) * 100;
}

function matchesQuarter(periodStart: string, quarter: string): boolean {
  if (quarter === "Any Move-in") return true;
  const qMatch = quarter.match(/Q(\d)\s+(\d{4})/);
  if (!qMatch) return false;
  const q = parseInt(qMatch[1]);
  const year = parseInt(qMatch[2]);
  const startMonth = (q - 1) * 3; // 0-indexed: Q1=0, Q2=3, Q3=6, Q4=9
  const endMonth = startMonth + 2;
  const d = new Date(periodStart);
  return d.getFullYear() === year && d.getMonth() >= startMonth && d.getMonth() <= endMonth;
}

type SortKey = "property" | "ask_asc" | "ask_desc" | "change_asc" | "change_desc" | "newest";

function sortListings(listings: typeof MOCK_LISTINGS, sort: SortKey) {
  return [...listings].sort((a, b) => {
    switch (sort) {
      case "ask_asc": return a.askPrice - b.askPrice;
      case "ask_desc": return b.askPrice - a.askPrice;
      case "change_desc": return changePct(b.mintPrice, b.askPrice) - changePct(a.mintPrice, a.askPrice);
      case "change_asc": return changePct(a.mintPrice, a.askPrice) - changePct(b.mintPrice, b.askPrice);
      case "property": return a.property.localeCompare(b.property);
      default: return 0;
    }
  });
}

// ─── Animated counter hook ─────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// ─── Ticker component ──────────────────────────────────────────────────────

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden whitespace-nowrap" style={{ borderBottom: "1px solid rgba(201,169,110,0.08)" }}>
      <div className="inline-flex animate-marquee py-2">
        {items.map((item, i) => (
          <span key={i} className="mx-4 sm:mx-6 text-[10px] sm:text-xs font-mono">
            <span className={item.isUp ? "text-relay-gold" : "text-red-400"}>{item.text}</span>
            <span className="text-relay-border mx-4">|</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TradePage() {
  const [sort, setSort] = useState<SortKey>("newest");
  const [city, setCity] = useState("All Cities");
  const [unitType, setUnitType] = useState("All Types");
  const [moveIn, setMoveIn] = useState("Any Move-in");
  const [lastTradeSec, setLastTradeSec] = useState(2);
  const [flashId, setFlashId] = useState<string | null>(null);

  // Count-up stats
  const animListings = useCountUp(STATS.activeListings);
  const animVolume = useCountUp(STATS.volume24h);
  const animTotal = useCountUp(STATS.totalTraded);
  const animFloor = useCountUp(STATS.floorPrice);

  // "Last trade X seconds ago" counter
  useEffect(() => {
    const id = setInterval(() => {
      setLastTradeSec((s) => (s >= 58 ? 1 : s + 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Random row flash effect (Bloomberg-style)
  useEffect(() => {
    const id = setInterval(() => {
      const rand = MOCK_LISTINGS[Math.floor(Math.random() * MOCK_LISTINGS.length)];
      setFlashId(rand.id);
      setTimeout(() => setFlashId(null), 600);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    return MOCK_LISTINGS.filter((l) => {
      if (city !== "All Cities" && l.city !== city) return false;
      if (unitType !== "All Types" && l.unit !== unitType) return false;
      if (!matchesQuarter(l.periodStart, moveIn)) return false;
      return true;
    });
  }, [city, unitType, moveIn]);

  const filteredTrades = useMemo(() => {
    return MOCK_TRADES.filter((t) => {
      if (city !== "All Cities" && t.city !== city) return false;
      if (unitType !== "All Types" && t.unit !== unitType) return false;
      return true;
    });
  }, [city, unitType]);

  const sorted = sortListings(filtered, sort);

  return (
    <div>
      {/* ── Ticker ──────────────────────────────────────────────────────── */}
      <Ticker />

      <div className="max-w-content mx-auto px-4 sm:px-6 py-6">
        {/* ── Summary Stats Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
          {[
            { label: "Active Listings", value: animListings.toString() },
            { label: "24h Volume", value: formatPrice(animVolume) + " USDC" },
            { label: "Total Traded", value: formatPrice(animTotal) + " USDC" },
            { label: "Floor Price", value: formatPrice(animFloor) + " USDC" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-relay-elevated rounded-xl px-3 sm:px-4 py-2.5 sm:py-3"
              style={{ border: "1px solid rgba(201,169,110,0.08)" }}
            >
              <div className="text-[10px] sm:text-[11px] text-relay-muted uppercase tracking-wider">{stat.label}</div>
              <div className="text-sm sm:text-lg font-bold mt-0.5 text-relay-text font-mono truncate">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* ── Main Grid ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 lg:gap-6">
          {/* Left — Listings Table */}
          <div className="lg:col-span-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h1 className="text-xl font-bold text-relay-text">Secondary Market</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-relay-muted" />
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1.5 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Bed size={12} className="text-relay-muted" />
                  <select value={unitType} onChange={(e) => setUnitType(e.target.value)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1.5 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                    {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-relay-muted" />
                  <select value={moveIn} onChange={(e) => setMoveIn(e.target.value)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1.5 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                    {MOVE_IN_QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpDown size={12} className="text-relay-muted" />
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="bg-relay-elevated border border-relay-border rounded-lg px-2.5 py-1.5 text-xs text-relay-text focus:outline-none focus:border-relay-gold cursor-pointer">
                    <option value="newest">Newest</option>
                    <option value="ask_asc">Ask: Low → High</option>
                    <option value="ask_desc">Ask: High → Low</option>
                    <option value="change_desc">Change: High → Low</option>
                    <option value="change_asc">Change: Low → High</option>
                    <option value="property">Property A-Z</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.7fr_0.6fr_auto] gap-3 px-4 py-2 text-[11px] text-relay-muted uppercase tracking-wider border-b border-relay-border mb-1">
              <span>Property</span>
              <span>Period</span>
              <span className="text-right">Mint</span>
              <span className="text-right">Ask</span>
              <span className="text-right">Vol</span>
              <span className="text-right">Change</span>
              <span />
            </div>

            {/* Rows */}
            <div className="space-y-1.5 sm:space-y-1">
              {sorted.map((listing) => {
                const pct = changePct(listing.mintPrice, listing.askPrice);
                const isUp = pct >= 0;
                const isHot = pct >= 8;
                const isFlashing = flashId === listing.id;
                return (
                  <div
                    key={listing.id}
                    className="bg-relay-elevated border border-relay-border/60 rounded-xl px-3 sm:px-4 py-3 hover:border-relay-gold/30 transition-all duration-300"
                    style={isFlashing ? { background: "rgba(201,169,110,0.08)", borderColor: "rgba(201,169,110,0.3)" } : {}}
                  >
                    {/* Desktop row */}
                    <div className="hidden sm:grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.7fr_0.6fr_auto] gap-3 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={listing.photo} alt={listing.property} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-relay-text truncate">{listing.property}</div>
                          <div className="text-xs text-relay-secondary">{listing.unit}</div>
                        </div>
                      </div>
                      <div className="text-xs text-relay-secondary font-mono truncate">{listing.periodStart} – {listing.periodEnd}</div>
                      <div className="text-right font-mono text-sm text-relay-muted">{formatPrice(listing.mintPrice)}</div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold text-relay-text">{formatPrice(listing.askPrice)}</div>
                        <div className="font-mono text-[11px] text-relay-muted">{perMonth(listing.askPrice, calcMonths(listing.periodStart, listing.periodEnd))}</div>
                      </div>
                      <div className="text-right text-xs text-relay-muted">{listing.volume} trades</div>
                      <div className={`text-right font-mono text-sm font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                        {isUp ? "+" : ""}{pct.toFixed(1)}%{isHot ? " \uD83D\uDD25" : ""}
                      </div>
                      <button className="btn-primary px-4 py-1.5 text-xs buy-pulse">Buy</button>
                    </div>

                    {/* Mobile card */}
                    <div className="flex sm:hidden items-center gap-3">
                      <img src={listing.photo} alt={listing.property} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-relay-text truncate">
                          {listing.property} <span className="text-relay-secondary font-normal text-xs">{listing.unit}</span>
                        </div>
                        <div className="text-[11px] text-relay-muted font-mono mt-0.5">{listing.periodStart} – {listing.periodEnd}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm font-bold text-relay-text">{formatPrice(listing.askPrice)}</div>
                        <div className="font-mono text-[10px] text-relay-muted">{perMonth(listing.askPrice, calcMonths(listing.periodStart, listing.periodEnd))}</div>
                        <div className={`font-mono text-[11px] font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                          {isUp ? "+" : ""}{pct.toFixed(1)}%{isHot ? " \uD83D\uDD25" : ""}
                        </div>
                      </div>
                      <button className="btn-primary px-3 py-1.5 text-[11px] shrink-0 buy-pulse">Buy</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right — Activity Feed */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-5">
              {/* Quick Stats */}
              <div className="bg-relay-elevated rounded-xl p-4" style={{ border: "1px solid rgba(201,169,110,0.08)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Activity size={14} className="text-relay-gold" />
                  <h3 className="text-sm font-semibold text-relay-text">Market Overview</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-relay-muted uppercase tracking-wider">Listings</div>
                    <div className="font-mono text-lg font-bold text-relay-text">{animListings}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-relay-muted uppercase tracking-wider">24h Vol</div>
                    <div className="font-mono text-lg font-bold text-relay-text">{formatPrice(animVolume)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-relay-muted uppercase tracking-wider">Floor</div>
                    <div className="font-mono text-lg font-bold text-relay-text">{formatPrice(animFloor)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-relay-muted uppercase tracking-wider">All-Time</div>
                    <div className="font-mono text-lg font-bold text-relay-text">{formatPrice(animTotal)}</div>
                  </div>
                </div>
              </div>

              {/* Recent Trades */}
              <div className="bg-relay-elevated rounded-xl p-4" style={{ border: "1px solid rgba(201,169,110,0.08)" }}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-relay-text">Recent Trades</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-relay-muted mb-3">
                  Last trade {lastTradeSec}s ago
                </div>
                <div className="space-y-0">
                  {filteredTrades.map((trade, i) => (
                    <div
                      key={trade.id}
                      className={`flex items-center justify-between py-2.5 border-b border-relay-border/40 last:border-0 ${i === 0 ? "trade-latest" : ""}`}
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
                        <div>
                          <div className="text-sm text-relay-text font-medium truncate">
                            {trade.property}
                            <span className="text-relay-secondary font-normal ml-1">{trade.unit}</span>
                          </div>
                          <div className="text-[11px] text-relay-muted mt-0.5">
                            {trade.buyer} · {trade.time}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="font-mono text-sm font-bold text-emerald-400">{formatPrice(trade.price)}</div>
                        <div className="font-mono text-[10px] text-relay-muted">{perMonth(trade.price, trade.months)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
