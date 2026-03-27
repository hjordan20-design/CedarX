import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTrendingAssets } from "@/lib/api";
import { AssetCard } from "@/components/explore/AssetCard";
import { CardSkeleton } from "@/components/common/LoadingStates";

export function TrendingSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-assets"],
    queryFn: fetchTrendingAssets,
    staleTime: 60_000,
  });

  const all = data?.data ?? [];

  // Filter to land / real-estate assets only (Fabrica protocol)
  const land = all.filter(
    a => a.protocol === "fabrica" || a.category === "real-estate",
  );

  const displayed = land.length >= 4 ? land : all;

  // Don't render section if no data and not loading
  if (!isLoading && all.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6" style={{ paddingBottom: "48px" }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <TrendingUp size={16} style={{ color: "#C4852A", opacity: 0.8 }} />
          <h2
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "26px",
              letterSpacing: "-0.01em",
              color: "var(--cedar-text, #1C1710)",
            }}
          >
            Recently active
          </h2>
        </div>
        <Link
          to="/explore"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(196,133,42,0.70)",
            textDecoration: "none",
            transition: "color 0.3s ease",
          }}
        >
          View all <ArrowRight size={13} />
        </Link>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(196,133,42,0.10)",
          marginBottom: "20px",
        }}
      />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {displayed.slice(0, 8).map((asset) => (
            <div key={asset.id}>
              <AssetCard asset={asset} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
