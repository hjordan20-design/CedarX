import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

// ─── CedarX mark (geometric cedar tree silhouette) ───────────────────────────
function CedarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Upper bough */}
      <path d="M12 1 L19 11 H14.5 L20 19 H13.5 L15 24.5 H9 L10.5 19 H4 L9.5 11 H5 Z"
        fill="currentColor"
      />
      {/* Trunk */}
      <rect x="10.5" y="24" width="3" height="3.5" rx="0.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

// ─── CedarX wordmark ─────────────────────────────────────────────────────────
function CedarXWordmark() {
  return (
    <span className="font-sans text-[15px] font-medium tracking-[0.12em] uppercase">
      <span className="text-cedar-text">Cedar</span>
      <span className="text-cedar-amber">X</span>
    </span>
  );
}

// ─── Nav link ────────────────────────────────────────────────────────────────
function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      className={`text-[13px] tracking-widest uppercase font-sans transition-colors duration-150 ${
        active ? "text-cedar-text" : "text-cedar-muted hover:text-cedar-text"
      }`}
    >
      {children}
    </Link>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-all duration-300
        ${scrolled
          ? "bg-cedar-bg/95 backdrop-blur-md border-b border-cedar-border"
          : "bg-transparent border-b border-transparent"}
      `}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 shrink-0 text-cedar-text hover:text-cedar-amber-lt transition-colors"
        >
          <CedarMark className="w-5 h-[22px]" />
          <CedarXWordmark />
        </Link>

        {/* Nav — hidden on small screens */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/explore">Explore</NavLink>
          <NavLink to="/about">How It Works</NavLink>
        </nav>

        {/* Wallet connect */}
        <div className="shrink-0">
          <ConnectButton
            label="Connect wallet"
            accountStatus="address"
            chainStatus="none"
            showBalance={false}
          />
        </div>
      </div>
    </header>
  );
}
