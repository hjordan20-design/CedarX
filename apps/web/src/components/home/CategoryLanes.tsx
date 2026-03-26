/**
 * CategoryLanes — two equal-weight editorial lanes on the homepage.
 *
 * Left:  Real Estate & Luxury  → /explore?category=real-estate
 * Right: Collectibles           → /explore?category=collectibles
 *
 * Each lane fetches 3 listed assets for the category thumbnail strip.
 * The first asset's image becomes a subtle background texture; the
 * remaining two appear as small floating cards.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { fetchAssets } from "@/lib/api";
import type { Asset } from "@/lib/types";

// ─── Thumbnail strip ──────────────────────────────────────────────────────────

function Thumb({ asset }: { asset: Asset }) {
  return (
    <div
      style={{
        width: "58px",
        height: "58px",
        flexShrink: 0,
        border: "1px solid rgba(196,133,42,0.28)",
        background: "rgba(28,23,16,0.60)",
        overflow: "hidden",
      }}
    >
      {asset.imageUrl ? (
        <img
          src={asset.imageUrl}
          alt={asset.name ?? ""}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "rgba(196,133,42,0.06)" }} />
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
  protocols: string;
  assets: Asset[];
  isLoading: boolean;
}

function Lane({ href, heading, subtext, ctaLabel, protocols, assets, isLoading }: LaneProps) {
  // First image-bearing asset → background texture; rest → thumbnails
  const bgAsset  = assets.find(a => a.imageUrl) ?? null;
  const thumbs   = assets.filter(a => a.imageUrl).slice(0, 3);

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
      {/* ── Background asset image (subtle texture, 35 → 50% on hover) ── */}
      {bgAsset?.imageUrl && (
        <div
          className="group-hover:opacity-50"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${bgAsset.imageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            opacity: 0.32,
            filter: "saturate(0.65)",
            transition: "opacity 0.5s ease",
          }}
        />
      )}

      {/* ── Gradient overlay — heavy at base for legibility ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(10,8,5,0.97) 0%, rgba(10,8,5,0.78) 40%, rgba(10,8,5,0.32) 100%)",
        }}
      />

      {/* ── Content ── */}
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
        {/* Protocol badge — top-left */}
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
          {protocols}
        </p>

        {/* Spacer */}
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
  const { data: reData, isLoading: reLoading } = useQuery({
    queryKey: ["assets", { sort: "newest", listingFilter: "listed", category: "real-estate", limit: 3 }],
    queryFn: () => fetchAssets({ sort: "newest", listingFilter: "listed", category: "real-estate", limit: 3 }),
    staleTime: 120_000,
  });

  const { data: colData, isLoading: colLoading } = useQuery({
    queryKey: ["assets", { sort: "newest", listingFilter: "listed", category: "collectibles", limit: 3 }],
    queryFn: () => fetchAssets({ sort: "newest", listingFilter: "listed", category: "collectibles", limit: 3 }),
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
        Browse by category
      </p>

      {/* Two-lane grid — stacks on mobile (RE&Luxury on top, Collectibles below) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
        }}
        className="lg:[grid-template-columns:1fr_1fr]"
      >
        <Lane
          href="/explore?category=real-estate"
          heading="Real Estate & Luxury"
          subtext="Tokenized property deeds, authenticated watches, and luxury goods. Browse and make offers."
          ctaLabel="Explore Real Estate & Luxury"
          protocols="Fabrica · 4K Protocol · Arianee"
          assets={reData?.data ?? []}
          isLoading={reLoading}
        />
        <Lane
          href="/explore?category=collectibles"
          heading="Collectibles"
          subtext="260,000+ authenticated sports cards, Pokémon, and trading cards. Buy instantly with USDC."
          ctaLabel="Explore Collectibles"
          protocols="Courtyard"
          assets={colData?.data ?? []}
          isLoading={colLoading}
        />
      </div>
    </section>
  );
}
