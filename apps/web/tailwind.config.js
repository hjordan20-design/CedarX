/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cedar: {
          bg:          "#0D0D0C",
          surface:     "#141413",
          "surface-alt": "#1C1C1A",
          border:      "#2C2C2B",
          footer:      "#0A0A09",
          text:        "#C4C0B4",  /* rgba(255,255,255,0.75) warm equivalent */
          muted:       "#8D8B78",
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
        // Subtle amber warmth for the hero section — amber only, no green
        "hero-glow": "radial-gradient(ellipse 80% 50% at 40% 60%, rgba(196,133,42,0.06) 0%, transparent 70%)",
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
