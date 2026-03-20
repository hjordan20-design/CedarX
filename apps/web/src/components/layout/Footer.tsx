import { Link } from "react-router-dom";

function FooterMark() {
  return (
    <svg viewBox="0 0 24 28" fill="none" className="w-4 h-[18px]" aria-hidden="true">
      <path d="M12 1 L19 11 H14.5 L20 19 H13.5 L15 24.5 H9 L10.5 19 H4 L9.5 11 H5 Z" fill="currentColor" />
      <rect x="10.5" y="24" width="3" height="3.5" rx="0.5" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-cedar-border bg-cedar-bg mt-32">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cedar-text">
              <FooterMark />
              <span className="font-sans text-[14px] font-medium tracking-[0.12em] uppercase">
                Cedar<span className="text-cedar-amber">X</span>
              </span>
            </div>
            <p className="text-cedar-muted text-sm leading-relaxed max-w-[260px]">
              The real asset marketplace. Peer-to-peer trading of tokenized
              land, treasuries, and rental property.
            </p>
            <p className="text-cedar-muted text-xs tracking-widest uppercase">
              Real assets. Onchain.
            </p>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-cedar-muted text-[11px] tracking-widest uppercase font-sans">
              Navigate
            </h3>
            <nav className="space-y-3">
              {[
                { to: "/",       label: "Home" },
                { to: "/explore", label: "Explore assets" },
                { to: "/about",  label: "How it works" },
                { to: "/tos",    label: "Terms of service" },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="block text-sm text-cedar-muted hover:text-cedar-text transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Protocols */}
          <div className="space-y-4">
            <h3 className="text-cedar-muted text-[11px] tracking-widest uppercase font-sans">
              Indexed protocols
            </h3>
            <nav className="space-y-3">
              {[
                { href: "https://fabrica.land",  label: "Fabrica",      sub: "Land" },
                { href: "https://ondo.finance",  label: "Ondo Finance", sub: "Fixed income" },
                { href: "https://realt.co",      label: "RealT",        sub: "Rental property" },
              ].map(({ href, label, sub }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-baseline gap-2 text-sm text-cedar-muted hover:text-cedar-text transition-colors"
                >
                  {label}
                  <span className="text-[11px] text-cedar-muted/60">{sub}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-cedar-border pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-cedar-muted text-xs">
            © {new Date().getFullYear()} CedarX. All rights reserved.
          </p>
          <p className="text-cedar-muted/50 text-xs">
            Transactions are peer-to-peer and irreversible. CedarX takes no custody of funds or tokens.
          </p>
        </div>
      </div>
    </footer>
  );
}
