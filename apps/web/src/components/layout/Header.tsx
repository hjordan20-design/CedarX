import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { to: "/", label: "Browse" },
  { to: "/my-keys", label: "My Keys" },
  { to: "/market", label: "Market" },
  { to: "/sell", label: "Sell" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-relay-bg/90 backdrop-blur-xl border-b border-relay-border">
        <div className="max-w-content mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <span className="text-xl font-bold text-relay-text tracking-tight">
              Relay<span className="text-relay-teal">X</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "text-relay-text"
                      : "text-relay-secondary hover:text-relay-text"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <ConnectButton
                chainStatus="none"
                accountStatus="address"
                showBalance={false}
              />
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-1 text-relay-secondary hover:text-relay-text transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-relay-bg border-b border-relay-border animate-fade-in">
            <nav className="flex flex-col px-6 py-4 gap-1">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                      isActive
                        ? "text-relay-text bg-relay-subtle"
                        : "text-relay-secondary hover:text-relay-text hover:bg-relay-subtle"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="pt-3 pb-1">
                <ConnectButton
                  chainStatus="none"
                  accountStatus="address"
                  showBalance={false}
                />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
