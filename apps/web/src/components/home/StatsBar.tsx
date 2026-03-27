import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";
import type { MarketStats } from "@/lib/types";

const CACHE_KEY = "cedar-stats-cache";

function readCachedStats(): MarketStats | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as MarketStats) : undefined;
  } catch {
    return undefined;
  }
}

function writeCachedStats(data: MarketStats) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* blocked */ }
}

export function StatsBar() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const result = await fetchStats();
      writeCachedStats(result);
      return result;
    },
    staleTime: 120_000,
    placeholderData: readCachedStats,
  });

  // getStats() now filters both counts to protocol=fabrica, so totalAssets is
  // the Fabrica-only asset count and activeListings is Fabrica-only listing count.
  const totalCount  = stats?.totalAssets    ?? 0;
  const listedCount = stats?.activeListings ?? 0;

  const items = [
    {
      value: totalCount > 0 ? totalCount.toLocaleString("en-US") : "—",
      label: "Properties indexed",
    },
    {
      value: listedCount > 0 ? listedCount.toLocaleString("en-US") : "—",
      label: "Listed now",
    },
    {
      value: "USDC",
      label: "Settlement token",
    },
  ];

  return (
    <div className="px-6 lg:px-[80px]" style={{ paddingBottom: "24px" }}>
      <div
        style={{
          maxWidth: "740px",
          margin: "0 auto",
          display: "flex",
          borderTop: "1px solid rgba(196,133,42,0.10)",
          borderBottom: "1px solid rgba(196,133,42,0.10)",
        }}
      >
        {items.map((item, i) => (
          <div
            key={item.label}
            style={{
              flex: 1,
              padding: "14px 0",
              textAlign: "center",
              borderLeft: i > 0 ? "1px solid rgba(196,133,42,0.10)" : "none",
            }}
          >
            <p
              style={{
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "clamp(14px, 2vw, 19px)",
                fontWeight: 400,
                color: "var(--cedar-text, #1C1710)",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              {item.value}
            </p>
            <p
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--cedar-muted, rgba(28,23,16,0.40))",
                marginTop: "4px",
              }}
            >
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
