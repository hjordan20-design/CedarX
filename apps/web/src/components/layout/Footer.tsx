import { Link } from "react-router-dom";

function FooterMark() {
  return (
    <svg viewBox="0 0 24 28" fill="none" className="w-4 h-[18px]" aria-hidden="true">
      <path d="M12 1L16 8H8Z" fill="currentColor" />
      <path d="M12 9L19.5 18H4.5Z" fill="currentColor" />
      <path d="M12 19L23 27H1Z" fill="currentColor" />
      <rect x="10.5" y="25.5" width="3" height="2" rx="0.25" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative bg-cedar-footer mt-32">
      {/* Amber gradient top divider — same fade technique as section dividers */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background: "linear-gradient(to right, transparent 0%, rgba(196,133,42,0.20) 35%, rgba(196,133,42,0.20) 65%, transparent 100%)",
        }}
      />

      <div className="max-w-7xl mx-auto px-6 pt-[120px] pb-[80px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cedar-text">
              <FooterMark />
              <span className="font-sans text-[14px] font-medium tracking-[0.04em]">
                Cedar<span className="text-cedar-amber">X</span>
              </span>
            </div>
            <p className="text-cedar-muted/70 text-sm leading-relaxed max-w-[260px]">
              The real-world asset marketplace. Peer-to-peer trading of tokenized
              real estate, luxury goods, art, and collectibles.
            </p>
            <p className="text-cedar-muted/50 text-xs tracking-widest uppercase">
              Real assets. Onchain.
            </p>
            <a
              href="https://x.com/cedarxio"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cedar-muted/70 hover:text-cedar-text transition-colors duration-300 text-sm"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @cedarxio
            </a>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-cedar-muted/40 text-[11px] tracking-widest uppercase font-sans">Navigate</h3>
            <nav className="space-y-3">
              {[
                { to: "/",        label: "Home" },
                { to: "/explore", label: "Explore assets" },
                { to: "/about",   label: "How it works" },
                { to: "/tos",     label: "Terms of service" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="block text-sm text-cedar-muted/70 hover:text-cedar-text transition-colors duration-300"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Protocols */}
          <div className="space-y-4">
            <h3 className="text-cedar-muted/40 text-[11px] tracking-widest uppercase font-sans">Indexed protocols</h3>
            <nav className="space-y-3">
              {[
                { href: "https://fabrica.land",      label: "Fabrica" },
                { href: "https://www.4kprotocol.com", label: "4K Protocol" },
                { href: "https://courtyard.io",       label: "Courtyard" },
              ].map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-cedar-muted/70 hover:text-cedar-text transition-colors duration-300"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div
          className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-cedar-muted/40 text-xs">
            © {new Date().getFullYear()} CedarX. All rights reserved.
          </p>
          <p className="text-cedar-muted/30 text-xs max-w-sm text-right">
            Transactions are peer-to-peer and irreversible. CedarX takes no custody of funds or tokens.
          </p>
        </div>
      </div>
    </footer>
  );
}
