export function HomeFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(196,133,42,0.10)",
        padding: "24px 0",
      }}
    >
      <div
        className="max-w-7xl mx-auto px-6"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <p
          style={{
            fontFamily: "DM Sans, system-ui, sans-serif",
            fontSize: "13px",
            color: "rgba(28,23,16,0.35)",
          }}
        >
          © 2026 CedarX Inc.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          {[
            { label: "FAQ",     href: "/faq"                    },
            { label: "Terms",   href: "/terms"                  },
            { label: "Privacy", href: "/privacy"                },
            { label: "hello@cedarx.io", href: "mailto:hello@cedarx.io" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              style={{
                fontFamily: "DM Sans, system-ui, sans-serif",
                fontSize: "13px",
                color: "rgba(28,23,16,0.40)",
                textDecoration: "none",
                transition: "color 0.2s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#C4852A"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(28,23,16,0.40)"; }}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
