import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens du UI Kit
        primary: "#1F3D2B",
        primaryLight: "#244A33",
        primaryDark: "#1A3526",
        accent: "#E85D2A",
        accentSoft: "#F4814F",
        cream: "#F4EDE4",
        creamSoft: "#FBF7F1",

        // Aliases historiques (cohérence existante)
        afro: {
          green: "#1F3D2B",
          "green-light": "#6BAA75",
          "green-deep": "#1A3526",
          orange: "#E85D2A",
          "orange-soft": "#F4814F",
          cream: "#F4EDE4",
          "cream-soft": "#FBF7F1",
          black: "#1A1A1A",
          red: "#C4452D",
          sand: "#E9E0D4",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "10px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
      },
      boxShadow: {
        soft: "0 12px 40px rgba(0, 0, 0, 0.12)",
        glow: "0 24px 60px -20px rgba(232, 93, 42, 0.45)",
        card: "0 8px 24px -8px rgba(31, 61, 43, 0.18)",
      },
      maxWidth: {
        container: "1240px",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        rotate: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pivot: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(2deg)" },
          "75%": { transform: "rotate(-2deg)" },
        },
        simmer: {
          "0%, 100%": { transform: "translateY(0) scale(1) rotate(0deg)" },
          "30%": { transform: "translateY(-2px) scale(1.02) rotate(1deg)" },
          "60%": { transform: "translateY(1px) scale(0.98) rotate(-1deg)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
        "rotate-slow": "rotate 20s linear infinite",
        "pivot-slow": "pivot 5s ease-in-out infinite",
        simmer: "simmer 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
