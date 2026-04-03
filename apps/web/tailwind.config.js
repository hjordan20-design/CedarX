/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        relay: {
          bg:        "#0A0A0A",
          elevated:  "#141414",
          subtle:    "#1A1A1A",
          border:    "#262626",
          text:      "#F5F5F5",
          secondary: "#A0A0A0",
          muted:     "#666666",
          gold:      "#C9A96E",
          "gold-lt": "#D4B87A",
          success:   "#22C55E",
          warning:   "#F59E0B",
          error:     "#EF4444",
          usdc:      "#2775CA",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "page-title":    ["2.25rem", { lineHeight: "1.1", fontWeight: "600" }],
        "section-header": ["1.5rem", { lineHeight: "1.2", fontWeight: "600" }],
        "card-title":    ["1.25rem", { lineHeight: "1.3", fontWeight: "600" }],
      },
      borderRadius: {
        card: "14px",
      },
      maxWidth: {
        content: "1280px",
      },
      animation: {
        "fade-up": "fadeUp 0.6s cubic-bezier(.16,1,.3,1) both",
        "fade-in": "fadeIn 0.4s ease both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
