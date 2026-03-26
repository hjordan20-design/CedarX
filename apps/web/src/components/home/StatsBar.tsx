import { useQuery } from "@tanstack/react-query";
import { fetchStats } from "@/lib/api";

export function StatsBar() {
  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: 120_000,
  });

  const volume = stats ? Number(stats.totalVolume) : 0;

  const items = [
    {
      value: stats ? stats.totalAssets.toLocaleString("en-US") : "—",
      label: "Assets indexed",
    },
    {
      value: stats ? stats.activeListings.toLocaleString("en-US") : "—",
      label: "Listed now",
    },
    {
      value:
        volume > 0
          ? `$${volume.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
          : "Coming soon",
      label: "Total volume",
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
