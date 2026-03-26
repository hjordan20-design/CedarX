/**
 * WalletControls — contains all wagmi + RainbowKit hook usage for the Header.
 *
 * This module is lazy-loaded from Header.tsx. It is only ever imported after
 * WalletProviders (WagmiProvider + RainbowKitProvider) have mounted, so all
 * wagmi/rainbowkit hooks here are safe to call.
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown } from "lucide-react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

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
          color: "var(--cedar-muted)", background: "transparent",
          border: "1px solid rgba(196,133,42,0.20)", cursor: "pointer",
          transition: "all 0.3s cubic-bezier(.16,1,.3,1)",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.40)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,133,42,0.20)"; }}
        aria-label="Switch network"
      >
        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: current?.dotColor ?? "#8B7355", display: "inline-block" }} />
        {current?.short ?? "Net"}
        <ChevronDown size={10} style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)", color: "var(--cedar-muted)" }} />
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

// ─── Nav link (reused here for Activity link) ─────────────────────────────────
function NavLink({ to, onClick, children, mobile }: {
  to: string; onClick?: () => void; children: React.ReactNode; mobile?: boolean;
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

// ─── Exported composed sections ───────────────────────────────────────────────

/** Desktop right section: ChainSwitcher + WalletButton */
export function WalletDesktopRight() {
  return (
    <>
      <ChainSwitcher />
      <WalletButton />
    </>
  );
}

/** Mobile bottom section: Network label + ChainSwitcher + WalletButton */
export function WalletMobileBottom() {
  const { isConnected } = useAccount();
  return (
    <>
      {isConnected && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--cedar-muted)" }}>Network</span>
          <ChainSwitcher />
        </div>
      )}
      <WalletButton fullWidth />
    </>
  );
}

/** "My Activity" nav link — only shown when wallet is connected */
export function ActivityNavLink({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const { isConnected } = useAccount();
  if (!isConnected) return null;

  if (mobile) {
    return (
      <div style={{ borderBottom: "1px solid rgba(196,133,42,0.08)", padding: "14px 0" }}>
        <NavLink to="/activity" onClick={onClose} mobile>My Activity</NavLink>
      </div>
    );
  }

  return <NavLink to="/activity">My Activity</NavLink>;
}
