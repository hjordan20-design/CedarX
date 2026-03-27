import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useWalletReady } from "@/providers/WalletReadyContext";

// Wallet controls (ChainSwitcher + WalletButton + "My Activity" link) are lazy-
// loaded from the same module — Vite bundles them into a single wallet chunk.
const WalletDesktopRight = React.lazy(() =>
  import("@/components/layout/WalletControls").then((m) => ({ default: m.WalletDesktopRight }))
);
const WalletMobileBottom = React.lazy(() =>
  import("@/components/layout/WalletControls").then((m) => ({ default: m.WalletMobileBottom }))
);
const ActivityNavLink = React.lazy(() =>
  import("@/components/layout/WalletControls").then((m) => ({ default: m.ActivityNavLink }))
);

// ─── Diamond mark ─────────────────────────────────────────────────────────────
function DiamondMark({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <polygon points="12,2 22,12 12,22 2,12" stroke="#C4852A" strokeWidth="1.4" fill="none" />
      <polygon points="12,6 18,12 12,18 6,12" stroke="#C4852A" strokeWidth="1.0" strokeOpacity="0.65" fill="none" />
      <circle cx="12" cy="12" r="1.8" fill="#C4852A" opacity="0.7" />
    </svg>
  );
}

function CedarXWordmark() {
  return (
    <span style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "20px", fontWeight: 500, letterSpacing: "0.04em" }}>
      <span style={{ color: "var(--cedar-text)" }}>Cedar</span>
      <span style={{ color: "#C4852A" }}>X</span>
    </span>
  );
}

// ─── Nav link ────────────────────────────────────────────────────────────────
function NavLink({
  to,
  onClick,
  children,
  mobile,
}: {
  to: string;
  onClick?: () => void;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        fontSize: mobile ? "18px" : "15px",
        letterSpacing: mobile ? "0.02em" : "0.04em",
        fontFamily: "DM Sans, system-ui, sans-serif",
        fontWeight: mobile ? 300 : 400,
        transition: "color 0.3s cubic-bezier(.16,1,.3,1)",
        color: active ? "var(--cedar-text)" : "var(--cedar-muted)",
        textDecoration: "none",
        display: "block",
      }}
    >
      {children}
    </Link>
  );
}

// ─── Placeholder for wallet button before providers mount ─────────────────────
function ConnectPlaceholder({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <button
      type="button"
      style={{
        padding: "9px 18px",
        fontSize: "13px",
        letterSpacing: "0.10em",
        fontFamily: "DM Sans, system-ui, sans-serif",
        fontWeight: 400,
        textTransform: "uppercase" as const,
        color: "#C4852A",
        background: "transparent",
        border: "1px solid rgba(196,133,42,0.55)",
        cursor: "wait",
        width: fullWidth ? "100%" : "auto",
        opacity: 0.6,
      }}
    >
      Connect wallet
    </button>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
export function Header() {
  const walletReady = useWalletReady();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const baseLinks = [
    { to: "/",          label: "Home"         },
    { to: "/explore",   label: "Properties"   },
    { to: "/sell",      label: "Sell"         },
    { to: "/tokenize",  label: "Tokenize"     },
    { to: "/about",     label: "How it works" },
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: "66px",
          backgroundColor: "rgba(249,246,240,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(196,133,42,0.10)",
        }}
      >
        <div className="h-full flex items-center justify-between gap-4 px-6 lg:pl-[80px] lg:pr-[52px]">

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, textDecoration: "none" }}>
            <DiamondMark />
            <CedarXWordmark />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8">
            {baseLinks.map(({ to, label }) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
            {walletReady && (
              <React.Suspense fallback={null}>
                <ActivityNavLink />
              </React.Suspense>
            )}
          </nav>

          {/* Desktop right */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ThemeToggle />
            {walletReady ? (
              <React.Suspense fallback={<ConnectPlaceholder />}>
                <WalletDesktopRight />
              </React.Suspense>
            ) : (
              <ConnectPlaceholder />
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1 shrink-0"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(28,23,16,0.55)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="mobile-menu-backdrop"
            style={{ position: "absolute", inset: 0, background: "rgba(249,246,240,0.70)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="mobile-menu-drawer"
            style={{
              position: "absolute", top: "66px", left: 0, right: 0,
              background: "rgba(249,246,240,0.97)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(196,133,42,0.12)",
            }}
          >
            <nav style={{ padding: "8px 24px 4px" }}>
              {baseLinks.map(({ to, label }) => (
                <div key={to} style={{ borderBottom: "1px solid rgba(196,133,42,0.08)", padding: "14px 0" }}>
                  <NavLink to={to} onClick={() => setMobileOpen(false)} mobile>{label}</NavLink>
                </div>
              ))}
              {walletReady && (
                <React.Suspense fallback={null}>
                  <ActivityNavLink mobile onClose={() => setMobileOpen(false)} />
                </React.Suspense>
              )}
            </nav>
            <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {walletReady ? (
                <React.Suspense fallback={<ConnectPlaceholder fullWidth />}>
                  <WalletMobileBottom />
                </React.Suspense>
              ) : (
                <ConnectPlaceholder fullWidth />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
