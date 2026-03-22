/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cedar: {
          bg:            "#F9F6F0",   /* warm cream base */
          surface:       "#FFFFFF",
          "surface-alt": "#F3EDE2",
          border:        "#E8DCC8",   /* warm amber-tinted divider */
          footer:        "#F9F6F0",
          text:          "#1C1710",   /* dark warm brown */
          muted:         "#8B7355",   /* medium warm brown */
          amber:         "#C4852A",
          "amber-lt":    "#D4952F",
          green:         "#3A6648",
          red:           "#7A3535",
        },
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans:    ["DM Sans", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-lg": ["clamp(3rem, 7vw, 6rem)",   { lineHeight: "1.0",  letterSpacing: "-0.02em" }],
        "display-md": ["clamp(2rem, 4vw, 3.5rem)", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
      },
      animation: {
        "fade-up": "fadeUp 0.85s cubic-bezier(.16,1,.3,1) both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
