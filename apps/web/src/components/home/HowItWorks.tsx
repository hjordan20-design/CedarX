import { Link } from "react-router-dom";
import { Wallet, Search, Zap } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: <Wallet size={18} strokeWidth={1.5} />,
    title: "Connect your wallet",
    body: "Use MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet. Your assets, your keys.",
  },
  {
    number: "02",
    icon: <Search size={18} strokeWidth={1.5} />,
    title: "Browse real assets",
    body: "Filter by category, protocol, and price. Every listing is backed by a real-world asset token on Ethereum.",
  },
  {
    number: "03",
    icon: <Zap size={18} strokeWidth={1.5} />,
    title: "Buy with USDC",
    body: "Approve once, then execute. The swap contract transfers the token to you and USDC to the seller — atomically, in one transaction.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-cedar-border">
      <div className="max-w-7xl mx-auto px-6 py-24">
        <div className="mb-16">
          <h2 className="display text-display-md text-cedar-text mb-3">
            How it works
          </h2>
          <p className="text-cedar-muted text-sm tracking-widest uppercase">
            Three steps. No custody. No intermediaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {STEPS.map(({ number, icon, title, body }) => (
            <div key={number} className="space-y-5">
              {/* Step number + icon */}
              <div className="flex items-center gap-4">
                <span className="font-mono text-cedar-amber text-sm opacity-60">{number}</span>
                <div className="w-px h-4 bg-cedar-border" />
                <span className="text-cedar-amber">{icon}</span>
              </div>

              {/* Content */}
              <h3 className="font-sans text-base font-medium text-cedar-text">
                {title}
              </h3>
              <p className="text-cedar-muted text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className="mt-16 pt-12 border-t border-cedar-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <p className="text-cedar-muted text-sm max-w-md">
            Every swap is executed by a{" "}
            <span className="text-cedar-text">non-custodial smart contract</span>{" "}
            on Ethereum L1. CedarX never holds your tokens or funds.
          </p>
          <Link to="/about" className="btn-ghost shrink-0">
            Read the full FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
