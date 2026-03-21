import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X, ChevronDown } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

// ─── CedarX mark — geometric three-tier cedar tree ───────────────────────────
function CedarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 1L16 8H8Z" fill="currentColor" />
      <path d="M12 9L19.5 18H4.5Z" fill="currentColor" />
      <path d="M12 19L23 27H1Z" fill="currentColor" />
      <rect x="10.5" y="25.5" width="3" height="2" rx="0.25" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function CedarXWordmark() {
  return (
    <span className="font-sans text-[15px] font-medium tracking-[0.04em]">
      <span className="text-cedar-text">Cedar</span>
      <span className="text-cedar-amber">X</span>
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
      className={`text-[13px] tracking-widest uppercase font-sans transition-colors duration-150 ${
        active ? "text-cedar-text" : "text-cedar-muted hover:text-cedar-text"
      }`}
    >
      {children}
    </Link>
  );
}

// ─── Chain switcher ───────────────────────────────────────────────────────────
const SUPPORTED_CHAINS = [
  { id: 1,   name: "Ethereum", short: "ETH",   dot: "bg-cedar-amber" },
  { id: 137, name: "Polygon",  short: "MATIC",  dot: "bg-violet-400"  },
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
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-cedar-border
          text-cedar-muted hover:text-cedar-text hover:border-cedar-muted
          text-[11px] tracking-widest uppercase transition-colors"
        aria-label="Switch network"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current?.dot ?? "bg-cedar-muted"}`} />
        {current?.short ?? "Net"}
        <ChevronDown
          size={10}
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-cedar-surface border border-cedar-border z-50 shadow-lg">
          {SUPPORTED_CHAINS.map((chain) => (
            <button
              key={chain.id}
              onClick={() => { switchChain({ chainId: chain.id }); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] tracking-widest uppercase
                hover:bg-cedar-surface-alt transition-colors ${
                  chain.id === chainId ? "text-cedar-text" : "text-cedar-muted"
                }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${chain.dot}`} />
              {chain.name}
              {chain.id === chainId && (
                <span className="ml-auto text-cedar-amber text-[10px]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const navLinks = [
    { to: "/",       label: "Home" },
    { to: "/explore", label: "Explore" },
    { to: "/about",  label: "How It Works" },
  ];

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-300
          ${scrolled || mobileOpen
            ? "bg-cedar-bg/95 backdrop-blur-md border-b border-cedar-border"
            : "bg-transparent border-b border-transparent"}
        `}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 text-cedar-text hover:text-cedar-amber-lt transition-colors"
          >
            <CedarMark className="w-5 h-[22px]" />
            <CedarXWordmark />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>

          {/* Desktop right: chain switcher + wallet */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <ChainSwitcher />
            <ConnectButton
              label="Connect wallet"
              accountStatus="address"
              chainStatus="none"
              showBalance={false}
            />
          </div>

          {/* Mobile: hamburger */}
          <button
            className="md:hidden text-cedar-muted hover:text-cedar-text transition-colors p-1"
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
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-cedar-bg/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel — slides in from top below the header */}
          <div className="absolute top-16 left-0 right-0 bg-cedar-bg border-b border-cedar-border">
            <nav className="px-6 py-5 space-y-1">
              {navLinks.map(({ to, label }) => (
                <div key={to} className="py-2.5 border-b border-cedar-border/50 last:border-0">
                  <NavLink to={to} onClick={() => setMobileOpen(false)}>
                    {label}
                  </NavLink>
                </div>
              ))}
            </nav>

            {/* Chain + wallet at the bottom of the panel */}
            <div className="px-6 pb-6 pt-2 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-cedar-muted text-[10px] tracking-widest uppercase">
                  Network
                </span>
                <ChainSwitcher />
              </div>
              <ConnectButton
                label="Connect wallet"
                accountStatus="address"
                chainStatus="none"
                showBalance={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
