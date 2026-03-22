import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer
      style={{
        background: "rgba(249,246,240,0.70)",
        borderTop: "1px solid rgba(196,133,42,0.10)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{ padding: "80px 52px 60px 80px" }}
        className="px-6 pt-16 pb-10 lg:!px-[80px] lg:!pt-[80px] lg:!pb-[60px] lg:!pr-[52px]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {/* Diamond mark */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polygon points="12,2 22,12 12,22 2,12" stroke="#C4852A" strokeWidth="1.4" fill="none" />
                <polygon points="12,6 18,12 12,18 6,12" stroke="#C4852A" strokeWidth="1.0" strokeOpacity="0.65" fill="none" />
                <circle cx="12" cy="12" r="1.8" fill="#C4852A" opacity="0.7" />
              </svg>
              <span style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "17px", fontWeight: 500, letterSpacing: "0.04em", color: "#1C1710" }}>
                Cedar<span style={{ color: "#C4852A" }}>X</span>
              </span>
            </div>

            <p style={{ fontSize: "15px", fontWeight: 300, lineHeight: 1.7, color: "rgba(28,23,16,0.55)", maxWidth: "240px" }}>
              The real-world asset marketplace. Peer-to-peer trading of tokenized real estate, luxury goods, and collectibles.
            </p>

            <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontStyle: "italic", fontWeight: 400, fontSize: "15px", color: "#C4852A" }}>
              Real assets. Onchain.
            </p>

            <a
              href="https://x.com/cedarxio"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "15px", color: "rgba(28,23,16,0.55)", textDecoration: "none", transition: "color 0.3s ease" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.80)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.55)"; }}
            >
              <svg viewBox="0 0 24 24" style={{ width: "13px", height: "13px", fill: "currentColor" }} aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @cedarxio
            </a>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.28)" }}>
              Navigate
            </h3>
            <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { to: "/",        label: "Home" },
                { to: "/explore", label: "Explore assets" },
                { to: "/about",   label: "How it works" },
                { to: "/tos",     label: "Terms of service" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  style={{ fontSize: "15px", fontWeight: 300, color: "rgba(28,23,16,0.55)", textDecoration: "none", transition: "color 0.3s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.80)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.55)"; }}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Protocols */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontFamily: "DM Sans, system-ui, sans-serif", fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(28,23,16,0.28)" }}>
              Indexed protocols
            </h3>
            <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { href: "https://fabrica.land",       label: "Fabrica" },
                { href: "https://www.4kprotocol.com", label: "4K Protocol" },
                { href: "https://courtyard.io",        label: "Courtyard" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "15px", fontWeight: 300, color: "rgba(28,23,16,0.55)", textDecoration: "none", transition: "color 0.3s ease" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#C4852A"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.55)"; }}
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div
          style={{
            paddingTop: "32px",
            borderTop: "1px solid rgba(196,133,42,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <p style={{ fontSize: "12px", color: "rgba(28,23,16,0.28)" }}>
            © {new Date().getFullYear()} CedarX. All rights reserved.
          </p>
          <p style={{ fontSize: "12px", color: "rgba(28,23,16,0.28)", maxWidth: "360px" }} className="sm:text-right">
            Transactions are peer-to-peer and irreversible. CedarX takes no custody of funds or tokens.
          </p>
        </div>
      </div>
    </footer>
  );
}
