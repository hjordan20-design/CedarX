/**
 * CategoryLanes — land marketplace editorial section.
 *
 * Shows two lanes: "For Sale" and "Make an Offer".
 * Each lane fetches 3 listed/unlisted Fabrica assets for thumbnails.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchAssets } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { mapboxSatUrl, mapboxCardUrl, ELOY_FALLBACK_SAT, ELOY_FALLBACK_CARD } from "@/lib/mapbox";

// ─── Thumbnail strip ──────────────────────────────────────────────────────────

function Thumb({ asset }: { asset: Asset }) {
  // Use card-specific 400×400 satellite URL for thumbnails (no parcel overlay)
  const assetSat = mapboxCardUrl(asset.details.lat, asset.details.lng);
  const sat = assetSat ?? ELOY_FALLBACK_CARD;
  const initial = asset.imageUrl ?? sat;
  const [src, setSrc] = useState<string | null>(initial ?? null);

  return (
    <div
      style={{
        width: "58px",
        height: "58px",
        flexShrink: 0,
        border: "1px solid rgba(196,133,42,0.28)",
        background: "linear-gradient(135deg, #2C1F0A 0%, #1A1408 50%, #0D0B07 100%)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {src && (
        <>
          {/* display:none prevents any browser broken-image indicator */}
          <img
            src={src}
            alt=""
            aria-hidden="true"
            style={{ display: "none" }}
            onError={() => {
              if (assetSat && src !== assetSat) { setSrc(assetSat); return; }
              if (ELOY_FALLBACK_CARD && src !== ELOY_FALLBACK_CARD) { setSrc(ELOY_FALLBACK_CARD); return; }
              setSrc(null);
            }}
          />
          {/* CSS background never shows broken-image icon */}
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundImage: `url(${src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </>
      )}
    </div>
  );
}

function ThumbSkeleton() {
  return (
    <div
      style={{
        width: "58px",
        height: "58px",
        flexShrink: 0,
        background: "rgba(196,133,42,0.06)",
        border: "1px solid rgba(196,133,42,0.10)",
      }}
    />
  );
}

// ─── Single lane card ─────────────────────────────────────────────────────────

interface LaneProps {
  href: string;
  heading: string;
  subtext: string;
  ctaLabel: string;
  badge: string;
  assets: Asset[];
  isLoading: boolean;
}

function LaneBgImage({ asset }: { asset: Asset }) {
  const assetSat = mapboxSatUrl(asset.details.lat, asset.details.lng);
  // Fallback chain: direct CDN → asset-specific sat → Eloy AZ hardcoded sat
  const sat = assetSat ?? ELOY_FALLBACK_SAT;
  const initial = asset.imageUrl?.startsWith("http") ? asset.imageUrl : (sat ?? asset.imageUrl ?? null);
  const [src, setSrc] = useState<string | null>(initial ?? null);

  // If no src at all (no image, no sat, no Mapbox token), let LaneBgFallback render instead
  if (!src) return null;
  return (
    <div
      className="group-hover:opacity-50"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity: 0.32,
        filter: "saturate(0.65)",
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
      }}
    >
      {/* display:none prevents any browser broken-image indicator */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{ display: "none" }}
        onError={() => {
          if (assetSat && src !== assetSat) { setSrc(assetSat); return; }
          if (ELOY_FALLBACK_SAT && src !== ELOY_FALLBACK_SAT) { setSrc(ELOY_FALLBACK_SAT); return; }
          setSrc(null);
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundImage: `url(${src})`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
    </div>
  );
}

/** Shown when bgAsset is null (empty query result) but we still have a satellite fallback. */
function LaneBgFallback() {
  if (!ELOY_FALLBACK_SAT) return null;
  return (
    <div
      className="group-hover:opacity-50"
      style={{
        position: "absolute",
        inset: 0,
        opacity: 0.32,
        filter: "saturate(0.65)",
        transition: "opacity 0.5s ease",
        pointerEvents: "none",
        backgroundImage: `url(${ELOY_FALLBACK_SAT})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    />
  );
}

function Lane({ href, heading, subtext, ctaLabel, badge, assets, isLoading }: LaneProps) {
  // Prefer assets with a direct CDN image URL (RETS feed photos start with https://)
  // over assets that only have a sat-derivable lat/lng — CDN photos load reliably.
  const bgAsset =
    assets.find(a => a.imageUrl?.startsWith("http")) ??
    assets.find(a => a.details.lat != null && a.details.lng != null) ??
    (assets.length > 0 ? assets[0] : null);
  const thumbs  = assets.slice(0, 3);

  return (
    <Link
      to={href}
      className="group"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: "clamp(340px, 42vw, 500px)",
        textDecoration: "none",
        border: "1px solid rgba(196,133,42,0.12)",
        background: "#0D0B07",
        transition: "border-color 0.4s ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.38)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.12)";
      }}
    >
      {/* Background: CDN image → satellite → Eloy hardcoded sat */}
      {bgAsset ? <LaneBgImage asset={bgAsset} /> : null}
      {!bgAsset && <LaneBgFallback />}

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(10,8,5,0.97) 0%, rgba(10,8,5,0.78) 40%, rgba(10,8,5,0.32) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "clamp(24px, 4vw, 40px)",
        }}
      >
        {/* Badge — top-left */}
        <p
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "9px",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: "rgba(196,133,42,0.50)",
            marginBottom: "auto",
          }}
        >
          {badge}
        </p>

        <div style={{ flex: 1 }} />

        {/* Thumbnail strip */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }}>
          {isLoading
            ? [0, 1, 2].map(i => <ThumbSkeleton key={i} />)
            : thumbs.length > 0
              ? thumbs.map(a => <Thumb key={a.id} asset={a} />)
              : [0, 1, 2].map(i => <ThumbSkeleton key={i} />)
          }
        </div>

        {/* Heading */}
        <h2
          style={{
            fontFamily: "Cormorant Garamond, Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(24px, 3.5vw, 40px)",
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            color: "rgba(255,251,242,0.95)",
            marginBottom: "14px",
          }}
        >
          {heading}
        </h2>

        {/* Subtext */}
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 300,
            fontSize: "14px",
            lineHeight: 1.65,
            color: "rgba(255,251,242,0.50)",
            marginBottom: "28px",
            maxWidth: "380px",
          }}
        >
          {subtext}
        </p>

        {/* CTA */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#C4852A",
            fontFamily: "DM Sans, system-ui, sans-serif",
            transition: "gap 0.3s ease",
          }}
          className="group-hover:[gap:12px]"
        >
          {ctaLabel} <ArrowRight size={11} />
        </div>
      </div>
    </Link>
  );
}

// ─── CategoryLanes ────────────────────────────────────────────────────────────

export function CategoryLanes() {
  const { data: listedData, isLoading: listedLoading } = useQuery({
    queryKey: ["assets", { sort: "newest", listingFilter: "listed", protocol: "fabrica", limit: 3 }],
    queryFn: () => fetchAssets({ sort: "newest", listingFilter: "listed", protocol: "fabrica", limit: 3 }),
    staleTime: 120_000,
  });

  const { data: unlistedData, isLoading: unlistedLoading } = useQuery({
    queryKey: ["assets", { sort: "newest", listingFilter: "unlisted", protocol: "fabrica", limit: 3 }],
    queryFn: () => fetchAssets({ sort: "newest", listingFilter: "unlisted", protocol: "fabrica", limit: 3 }),
    staleTime: 120_000,
  });

  return (
    <section
      className="max-w-7xl mx-auto px-6"
      style={{ paddingTop: "8px", paddingBottom: "48px" }}
    >
      {/* Section label */}
      <p
        style={{
          fontFamily: "JetBrains Mono, monospace",
          fontSize: "9px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(28,23,16,0.28)",
          marginBottom: "16px",
          textAlign: "center",
        }}
      >
        Browse by intent
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
        }}
        className="lg:[grid-template-columns:1fr_1fr]"
      >
        <Lane
          href="/explore?listingFilter=listed"
          heading="Land For Sale"
          subtext="Tokenized parcels with a fixed price. Connect your wallet and buy instantly with USDC."
          ctaLabel="Browse for-sale land"
          badge="Fabrica · Fixed price"
          assets={listedData?.data ?? []}
          isLoading={listedLoading}
        />
        <Lane
          href="/explore?listingFilter=unlisted"
          heading="Make an Offer"
          subtext="Every indexed parcel accepts offers — even unlisted ones. Submit your price to the owner onchain."
          ctaLabel="Browse off-market land"
          badge="Fabrica · Make offer"
          assets={unlistedData?.data ?? []}
          isLoading={unlistedLoading}
        />
      </div>
    </section>
  );
}
