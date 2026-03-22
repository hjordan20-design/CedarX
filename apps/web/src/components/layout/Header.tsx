import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

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
        color: active ? "rgba(28,23,16,0.80)" : "rgba(28,23,16,0.45)",
        textDecoration: "none",
        display: "block",
      }}
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
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "6px 10px", fontSize: "11px", letterSpacing: "0.06em",
          color: "rgba(28,23,16,0.50)", background: "transparent",
          border: "1px solid rgba(196,133,42,0.20)", cursor: "pointer",
          transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.40)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.20)"; }}
        aria-label="Switch network"
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: current?.dotColor ?? "#8B7355", display: "inline-block" }} />
        {current?.short ?? "Net"}
        <ChevronDown size={10} style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "rgba(28,23,16,0.38)" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", width: "144px", zIndex: 50,
          background: "rgba(249,246,240,0.96)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(196,133,42,0.18)",
        }}>
          {SUPPORTED_CHAINS.map((chain) => (
            <button
              key={chain.id}
              onClick={() => { switchChain({ chainId: chain.id }); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", fontSize: "11px", letterSpacing: "0.06em",
                cursor: "pointer", background: "transparent", border: "none",
                color: chain.id === chainId ? "rgba(28,23,16,0.80)" : "rgba(28,23,16,0.42)",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(196,133,42,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: chain.dotColor, display: "inline-block" }} />
              {chain.name}
              {chain.id === chainId && <span style={{ marginLeft: "auto", color: "#C4852A", fontSize: "10px" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Wallet button ────────────────────────────────────────────────────────────
function WalletButton({ fullWidth }: { fullWidth?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <button
            onClick={connected ? openAccountModal : openConnectModal}
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
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
              width: fullWidth ? "100%" : "auto",
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
        {/* Responsive container: 24px padding on mobile, 80px/52px on desktop */}
        <div className="h-full flex items-center justify-between gap-4 px-6 lg:pl-[80px] lg:pr-[52px]">

          {/* Logo */}
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, textDecoration: "none" }}>
            <DiamondMark />
            <CedarXWordmark />
          </Link>

          {/* Desktop nav — hidden below lg */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>

          {/* Desktop right — hidden below lg */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ChainSwitcher />
            <WalletButton />
          </div>

          {/* Mobile hamburger — visible below lg */}
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

      {/* Mobile / tablet menu — visible below lg */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(249,246,240,0.70)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            style={{
              position: "absolute", top: "66px", left: 0, right: 0,
              background: "rgba(249,246,240,0.97)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(196,133,42,0.12)",
            }}
          >
            <nav style={{ padding: "8px 24px 4px" }}>
              {navLinks.map(({ to, label }) => (
                <div key={to} style={{ borderBottom: "1px solid rgba(196,133,42,0.08)", padding: "14px 0" }}>
                  <NavLink to={to} onClick={() => setMobileOpen(false)} mobile>{label}</NavLink>
                </div>
              ))}
            </nav>
            <div style={{ padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>Network</span>
                <ChainSwitcher />
              </div>
              <WalletButton fullWidth />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
