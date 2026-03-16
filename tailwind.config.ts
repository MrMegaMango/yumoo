import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8F2",
        butter: "#FFF1DA",
        peach: "#FFC9A9",
        rose: "#F9D5CE",
        moss: "#6A8D73",
        ink: "#2B221E",
        cocoa: "#8F6F63",
        shell: "#FFFDFC"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        display: ["var(--font-display)"]
      },
      boxShadow: {
        card: "0 22px 50px -28px rgba(91, 60, 38, 0.28)",
        lift: "0 28px 70px -34px rgba(91, 60, 38, 0.35)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-4px)" }
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        float: "float 4s ease-in-out infinite",
        rise: "rise 0.5s ease-out"
      }
    }
  },
  plugins: []
};

export default config;

