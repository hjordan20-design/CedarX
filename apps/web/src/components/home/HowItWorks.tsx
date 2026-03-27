import { Link } from "react-router-dom";
import { Wallet, MapPin, Zap } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const STEPS = [
  {
    number: "01",
    icon: <Wallet size={18} strokeWidth={1.5} />,
    title: "Connect your wallet",
    body: "Use MetaMask, Coinbase Wallet, or any WalletConnect-compatible wallet. Your property token, your keys.",
  },
  {
    number: "02",
    icon: <MapPin size={18} strokeWidth={1.5} />,
    title: "Find a property",
    body: "Filter by state, county, acreage, and price. Every listing is backed by a Fabrica tokenized deed on Ethereum.",
  },
  {
    number: "03",
    icon: <Zap size={18} strokeWidth={1.5} />,
    title: "Buy with USDC",
    body: "Approve once, then execute. The swap contract transfers the deed token to you and USDC to the seller — atomically, in one transaction.",
  },
];

function Step({ number, icon, title, body, index }: typeof STEPS[number] & { index: number }) {
  const { ref, inView } = useInView();

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className={`scroll-fade${inView ? " in-view" : ""}`}
      style={{ transitionDelay: inView ? `${index * 100}ms` : "0ms", display: "flex", flexDirection: "column", gap: "20px" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "13px", color: "#C4852A", opacity: 0.7 }}>{number}</span>
        <div style={{ width: "1px", height: "16px", background: "rgba(196,133,42,0.20)" }} />
        <span style={{ color: "rgba(196,133,42,0.70)" }}>{icon}</span>
      </div>
      <h3 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontWeight: 300, fontSize: "20px", letterSpacing: "-0.01em", color: "#1C1710" }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(28,23,16,0.55)", lineHeight: 1.75 }}>{body}</p>
    </div>
  );
}

export function HowItWorks() {
  const { ref: headingRef, inView: headingInView } = useInView();

  return (
    <section style={{ borderTop: "1px solid rgba(196,133,42,0.08)" }}>
      <div className="max-w-7xl mx-auto px-6" style={{ paddingTop: "100px", paddingBottom: "80px" }}>
        <div
          ref={headingRef as React.Ref<HTMLDivElement>}
          className={`scroll-fade${headingInView ? " in-view" : ""}`}
          style={{ marginBottom: "60px" }}
        >
          <h2
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(2rem, 4vw, 3.5rem)",
              letterSpacing: "-0.02em",
              color: "#1C1710",
              marginBottom: "12px",
            }}
          >
            How it works
          </h2>
          <p style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.35)" }}>
            Three steps. No broker. No escrow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {STEPS.map((step, i) => (
            <Step key={step.number} {...step} index={i} />
          ))}
        </div>

        <div
          style={{
            marginTop: "64px",
            paddingTop: "40px",
            borderTop: "1px solid rgba(196,133,42,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            alignItems: "flex-start",
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <p style={{ fontSize: "14px", fontWeight: 300, color: "rgba(28,23,16,0.55)", maxWidth: "420px", lineHeight: 1.7 }}>
            Every swap is executed by a{" "}
            <span style={{ color: "#1C1710", fontWeight: 400 }}>non-custodial smart contract</span>{" "}
            on Ethereum. CedarX never holds your tokens or funds.
          </p>
          <Link to="/about" className="btn-ghost shrink-0">
            Read the full FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
