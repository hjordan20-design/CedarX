import { Link } from "react-router-dom";

export function DarkCtaBlock() {
  return (
    <section className="max-w-7xl mx-auto px-6" style={{ paddingTop: "56px", paddingBottom: "56px" }}>
      <div
        style={{
          borderRadius: "20px",
          background: "linear-gradient(135deg, #1A1613 0%, #2A2420 50%, #1A1613 100%)",
          padding: "clamp(40px, 6vw, 72px) clamp(32px, 6vw, 72px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "20px",
        }}
        className="sm:flex-row sm:items-center sm:justify-between"
      >
        <div style={{ maxWidth: "520px" }}>
          <h2
            style={{
              fontFamily: "Cormorant Garamond, Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(26px, 3.5vw, 40px)",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: "rgba(255,251,242,0.96)",
              marginBottom: "14px",
            }}
          >
            Own land you can{" "}
            <em style={{ fontStyle: "italic", color: "#C4852A" }}>verify</em>
          </h2>
          <p
            style={{
              fontFamily: "DM Sans, system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "15px",
              lineHeight: 1.7,
              color: "rgba(255,251,242,0.50)",
            }}
          >
            Every property on CedarX is backed by a real deed held in trust,
            tokenized as an ERC-1155 on Ethereum. Full ownership. Fully onchain.
          </p>
        </div>

        <Link
          to="/explore"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "14px 28px",
            background: "#C4852A",
            color: "#1A1410",
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontWeight: 500,
            fontSize: "13px",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            textDecoration: "none",
            borderRadius: "4px",
            flexShrink: 0,
            transition: "background 0.2s ease",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#D49840"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#C4852A"; }}
        >
          Browse Properties
        </Link>
      </div>
    </section>
  );
}
