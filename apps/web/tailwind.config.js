/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cedar: {
          bg:          "#0C0E09",
          surface:     "#131508",
          "surface-alt": "#1A1E10",
          border:      "#272D1A",
          text:        "#EBE7D5",
          muted:       "#8D8B72",
          amber:       "#C4852A",
          "amber-lt":  "#D4952F",
          green:       "#3A6648",
          red:         "#7A3535",
        },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans:    ["DM Sans", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        // Display sizes used in hero — Cormorant Garamond benefits from larger tracking
        "display-lg": ["clamp(3rem, 7vw, 6rem)",   { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.1",  letterSpacing: "-0.015em" }],
      },
      backgroundImage: {
        // Subtle radial warmth for the hero section
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(196,133,42,0.08) 0%, transparent 60%)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
