/**
 * FeaturedPropertiesGrid — live data, 6 highest-priced listed properties.
 * Images use Mapbox satellite-v9 (plain, no parcel overlay) via mapboxCardUrl.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchAssets } from "@/lib/api";
import { mapboxCardUrl, ELOY_FALLBACK_CARD } from "@/lib/mapbox";
import { formatAcreage } from "@/lib/formatters";
import type { Asset } from "@/lib/types";

// ─── Detect + skip Fabrica CDN dark overlay (same guard as AssetCard) ─────────
function isFabricaDark(url: string | null | undefined): boolean {
  return !!url && url.includes("media3.fabrica.land") && url.includes("theme=dark");
}

// ─── Single featured property card ───────────────────────────────────────────

function FeaturedPropertyCard({ asset, index }: { asset: Asset; index: number }) {
  const [hovered, setHovered] = useState(false);

  // Image: skip Fabrica dark overlay; fall back to Mapbox sat → Eloy hardcoded
  const cleanImage  = isFabricaDark(asset.imageUrl) ? null : (asset.imageUrl ?? null);
  const satUrl      = mapboxCardUrl(asset.details.lat, asset.details.lng) ?? ELOY_FALLBACK_CARD;
  const imageSource = cleanImage ?? satUrl ?? null;

  const [imgSrc, setImgSrc]       = useState<string | null>(imageSource);
  const [imgFailed, setImgFailed] = useState(false);

  // Resolve display values
  const name = (() => {
    const n = (asset.name ?? "").replace(/^\[Low Confidence\]\s*/i, "");
    if (n && n !== "Land Parcel") return n;
    const d = asset.details;
    if (d.county && d.state) return `Land in ${d.county}, ${d.state}`;
    if (d.state) return `Land in ${d.state}`;
    return "Land Parcel";
  })();

  const location = (() => {
    const d = asset.details;
    const parts: string[] = [];
    if (d.county) parts.push(d.county);
    if (d.state)  parts.push(d.state);
    return parts.join(", ");
  })();

  const acres      = asset.details.acreage != null ? Number(asset.details.acreage) : null;
  const price      = asset.currentListingPrice;
  const perAcre    = price != null && acres != null && acres > 0
    ? Math.round(price / acres)
    : null;

  const priceFormatted = price != null
    ? price.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : null;

  return (
    <Link
      to={`/assets/${encodeURIComponent(asset.id)}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: "12px",
        overflow: "hidden",
        textDecoration: "none",
        border: "1px solid rgba(196,133,42,0.10)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 20px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08)"
          : "0 2px 8px rgba(0,0,0,0.06)",
        animationDelay: `${index * 60}ms`,
        animationFillMode: "both",
      }}
      className="featured-card-fadein"
    >
      {/* Image area — 65% padding-top ratio */}
      <div style={{ position: "relative", width: "100%", paddingTop: "65%", background: "#e8e4dc", flexShrink: 0 }}>
        {imgSrc && !imgFailed ? (
          <>
            <img
              src={imgSrc}
              alt=""
              aria-hidden="true"
              style={{ display: "none" }}
              onError={() => {
                if (satUrl && imgSrc !== satUrl) { setImgSrc(satUrl); return; }
                setImgFailed(true);
              }}
            />
            <div
              style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${imgSrc})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transition: "transform 0.4s ease",
                transform: hovered ? "scale(1.04)" : "scale(1)",
              }}
            />
          </>
        ) : (
          <div
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(135deg, #8B7355 0%, #6B8F71 100%)",
            }}
          />
        )}

        {/* "For Sale" badge — top-left */}
        <span
          style={{
            position: "absolute", top: "10px", left: "10px",
            background: "rgba(92,122,74,0.90)",
            color: "#fff",
            fontSize: "9px",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontFamily: "DM Sans, system-ui, sans-serif",
            padding: "3px 8px",
            borderRadius: "3px",
          }}
        >
          For Sale
        </span>

        {/* Acreage overlay — bottom-left */}
        {acres != null && (
          <span
            style={{
              position: "absolute", bottom: "10px", left: "10px",
              background: "rgba(10,8,5,0.65)",
              color: "rgba(255,251,242,0.90)",
              fontSize: "11px",
              fontFamily: "JetBrains Mono, monospace",
              padding: "3px 8px",
              borderRadius: "3px",
            }}
          >
            {formatAcreage(acres)}
          </span>
        )}
      </div>

      {/* Card body */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        <h3
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 400,
            fontSize: "20px",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: "#1C1710",
            marginBottom: "2px",
          }}
          className="line-clamp-2"
        >
          {name}
        </h3>

        {location && (
          <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "13px", color: "rgba(28,23,16,0.50)", lineHeight: 1.4 }}>
            {location}
          </p>
        )}

        <div style={{ marginTop: "auto", paddingTop: "12px" }}>
          {priceFormatted && (
            <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontWeight: 600, fontSize: "18px", color: "#1C1710", lineHeight: 1.2 }}>
              {priceFormatted}
              <span style={{ fontSize: "12px", fontWeight: 400, color: "rgba(28,23,16,0.45)", marginLeft: "4px" }}>USDC</span>
            </p>
          )}
          {perAcre != null && (
            <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "12px", color: "#C4852A", marginTop: "2px" }}>
              ~{perAcre.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} per acre
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FeaturedCardSkeleton() {
  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(196,133,42,0.08)" }}>
      <div style={{ width: "100%", paddingTop: "65%", background: "rgba(196,133,42,0.06)", position: "relative" }}>
        <div className="animate-pulse" style={{ position: "absolute", inset: 0, background: "rgba(196,133,42,0.06)" }} />
      </div>
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div className="animate-pulse" style={{ height: "20px", background: "rgba(196,133,42,0.06)", borderRadius: "4px", width: "75%" }} />
        <div className="animate-pulse" style={{ height: "14px", background: "rgba(196,133,42,0.04)", borderRadius: "4px", width: "50%" }} />
        <div className="animate-pulse" style={{ height: "20px", background: "rgba(196,133,42,0.06)", borderRadius: "4px", width: "40%", marginTop: "8px" }} />
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function FeaturedPropertiesGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ["assets", { sort: "price_desc", listingFilter: "listed", protocol: "fabrica", limit: 6 }],
    queryFn: () => fetchAssets({ sort: "price_desc", listingFilter: "listed", protocol: "fabrica", limit: 6 }),
    staleTime: 120_000,
  });

  const assets: Asset[] = data?.data ?? [];
  const showSkeletons = isLoading;
  const showEmpty = !isLoading && assets.length === 0;

  return (
    <section className="max-w-7xl mx-auto px-6" style={{ paddingTop: "56px", paddingBottom: "16px" }}>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "28px",
            letterSpacing: "-0.01em",
            color: "var(--cedar-text)",
          }}
        >
          Featured Properties
        </h2>
        <Link
          to="/explore"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(196,133,42,0.80)",
            textDecoration: "none",
            fontFamily: "DM Sans, system-ui, sans-serif",
          }}
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Grid */}
      {showSkeletons && (
        <div
          style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr" }}
          className="sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr]"
        >
          {Array.from({ length: 6 }).map((_, i) => <FeaturedCardSkeleton key={i} />)}
        </div>
      )}

      {showEmpty && (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "14px", color: "var(--cedar-muted)" }}>
            Properties loading — check back shortly.
          </p>
        </div>
      )}

      {!showSkeletons && !showEmpty && (
        <div
          style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr" }}
          className="sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr]"
        >
          {assets.map((asset, i) => (
            <FeaturedPropertyCard key={asset.id} asset={asset} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
