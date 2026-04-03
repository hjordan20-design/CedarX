import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-relay-teal/30 mt-auto">
      <div className="max-w-content mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <Link to="/" className="text-lg font-bold text-relay-text tracking-tight">
              Relay<span className="text-relay-teal">X</span>
            </Link>
            <p className="text-sm text-relay-muted mt-1">
              Keys to furnished rentals.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-relay-secondary">
            <Link to="/" className="hover:text-relay-text transition-colors">
              Browse
            </Link>
            <Link to="/trade" className="hover:text-relay-text transition-colors">
              Trade
            </Link>
            <Link to="/landlords" className="hover:text-relay-text transition-colors">
              List Your Property
            </Link>
          </nav>
        </div>

        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-relay-border flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs text-relay-muted">
            &copy; {new Date().getFullYear()} RelayX. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-relay-muted">
            <span>Settlement in USDC</span>
            <span className="text-relay-border">|</span>
            <span>Ethereum</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
