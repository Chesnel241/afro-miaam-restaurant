import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        afro: {
          green: "#1F3D2B",
          "green-deep": "#152A1E",
          "green-light": "#6BAA75",
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
      },
      boxShadow: {
        soft: "0 12px 40px rgba(0, 0, 0, 0.12)",
        glow: "0 24px 60px -20px rgba(232, 93, 42, 0.45)",
      },
      backgroundImage: {
        "afro-pattern":
          "radial-gradient(circle at 1px 1px, rgba(244,237,228,0.18) 1px, transparent 0)",
      },
      maxWidth: {
        container: "1200px",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        floaty: "floaty 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
