import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

// ─── Diamond mark — geometric logo ───────────────────────────────────────────
function DiamondMark({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <polygon points="12,2 22,12 12,22 2,12" stroke="#C4852A" strokeWidth="1.2" fill="none" />
      <polygon points="12,6 18,12 12,18 6,12" stroke="#C4852A" strokeWidth="0.7" strokeOpacity="0.45" fill="none" />
      <circle cx="12" cy="12" r="1.5" fill="#C4852A" opacity="0.6" />
    </svg>
  );
}

function CedarXWordmark() {
  return (
    <span style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "15px", fontWeight: 500, letterSpacing: "0.04em" }}>
      <span style={{ color: "#1C1710" }}>Cedar</span>
      <span style={{ color: "#C4852A" }}>X</span>
    </span>
  );
}

// ─── Nav link ────────────────────────────────────────────────────────────────
function NavLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const active = pathname === to || (to !== "/" && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        fontSize: "12px",
        letterSpacing: "0.06em",
        fontFamily: "DM Sans, system-ui, sans-serif",
        transition: "color 0.3s cubic-bezier(.16,1,.3,1)",
        color: active ? "rgba(28,23,16,0.70)" : "rgba(28,23,16,0.38)",
        textDecoration: "none",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.70)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = active ? "rgba(28,23,16,0.70)" : "rgba(28,23,16,0.38)"; }}
    >
      {children}
    </Link>
  );
}

// ─── Chain switcher ───────────────────────────────────────────────────────────
const SUPPORTED_CHAINS = [
  { id: 1,   name: "Ethereum", short: "ETH",  dotColor: "#C4852A" },
  { id: 137, name: "Polygon",  short: "MATIC", dotColor: "#8B5CF6" },
] as const;

function ChainSwitcher() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!isConnected) return null;

  const current = SUPPORTED_CHAINS.find((c) => c.id === chainId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 10px",
          fontSize: "11px",
          letterSpacing: "0.06em",
          color: "rgba(28,23,16,0.50)",
          background: "transparent",
          border: "1px solid rgba(196,133,42,0.20)",
          cursor: "pointer",
          transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.40)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.20)"; }}
        aria-label="Switch network"
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: current?.dotColor ?? "#8B7355", display: "inline-block" }} />
        {current?.short ?? "Net"}
        <ChevronDown
          size={10}
          style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "rgba(28,23,16,0.38)" }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            width: "144px",
            zIndex: 50,
            background: "rgba(249,246,240,0.96)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(196,133,42,0.18)",
          }}
        >
          {SUPPORTED_CHAINS.map((chain) => (
            <button
              key={chain.id}
              onClick={() => { switchChain({ chainId: chain.id }); setOpen(false); }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                fontSize: "11px",
                letterSpacing: "0.06em",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                color: chain.id === chainId ? "rgba(28,23,16,0.80)" : "rgba(28,23,16,0.42)",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(196,133,42,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: chain.dotColor, display: "inline-block" }} />
              {chain.name}
              {chain.id === chainId && (
                <span style={{ marginLeft: "auto", color: "#C4852A", fontSize: "10px" }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wallet button ────────────────────────────────────────────────────────────
function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
            type="button"
            style={{
              padding: "6px 16px",
              fontSize: "11px",
              letterSpacing: "0.12em",
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 400,
              textTransform: "uppercase" as const,
              color: "#C4852A",
              background: "transparent",
              border: "1px solid rgba(196,133,42,0.55)",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "#C4852A";
              (e.currentTarget as HTMLElement).style.color = "#FFFFFF";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color = "#C4852A";
            }}
          >
            {connected ? account.displayName : "Connect wallet"}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks = [
    { to: "/",        label: "Home" },
    { to: "/explore", label: "Explore" },
    { to: "/about",   label: "How it works" },
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
        <div
          style={{
            maxWidth: "100%",
            padding: "0 52px 0 80px",
            height: "66px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "32px",
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <DiamondMark />
            <CedarXWordmark />
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: "32px" }} className="hidden md:flex">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>

          {/* Desktop right: chain switcher + wallet */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }} className="hidden md:flex">
            <ChainSwitcher />
            <WalletButton />
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden p-1"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(28,23,16,0.50)" }}
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(249,246,240,0.65)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "66px",
              left: 0,
              right: 0,
              background: "rgba(249,246,240,0.96)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(196,133,42,0.10)",
            }}
          >
            <nav style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {navLinks.map(({ to, label }) => (
                <div key={to} style={{ padding: "10px 0", borderBottom: "1px solid rgba(196,133,42,0.08)" }}>
                  <NavLink to={to} onClick={() => setMobileOpen(false)}>
                    {label}
                  </NavLink>
                </div>
              ))}
            </nav>
            <div style={{ padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>Network</span>
                <ChainSwitcher />
              </div>
              <WalletButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
