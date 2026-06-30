/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#e6f4f5", 100: "#c8e8ea", 200: "#91d0d4",
          300: "#5ab8bd", 400: "#23a0a6", 500: "#0d7377",
          600: "#0a5c60", 700: "#084548", 800: "#052e30", 900: "#021718",
        },
        sage: {
          50: "#e8f5ee", 100: "#c6e8d5", 200: "#8dd1ab",
          300: "#54ba81", 400: "#2d8c5c", 500: "#1a6b44", 600: "#134f32",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card:      "0 1px 4px rgba(13,115,119,.06)",
        "card-md": "0 4px 12px rgba(13,115,119,.08)",
        "card-lg": "0 8px 24px rgba(13,115,119,.12)",
        glow:      "0 0 24px rgba(13,115,119,.20)",
        "glow-lg": "0 0 40px rgba(13,115,119,.28)",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        scaleIn: {
          "0%":   { opacity: 0, transform: "scale(0.94)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition:  "400px 0" },
        },
        gradientShift: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%":     { backgroundPosition: "100% 50%" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        breathe: {
          "0%,100%": { transform: "scale(1)", boxShadow: "0 0 24px rgba(13,115,119,.18)" },
          "50%":     { transform: "scale(1.03)", boxShadow: "0 0 40px rgba(13,115,119,.30)" },
        },
        scanLine: {
          "0%":   { top: "0%", opacity: "0.6" },
          "100%": { top: "100%", opacity: "0" },
        },
      },
      animation: {
        "fade-up":        "fadeUp .4s cubic-bezier(0.34,1.56,0.64,1) both",
        "scale-in":       "scaleIn .35s cubic-bezier(0.34,1.56,0.64,1) both",
        "shimmer":        "shimmer 1.6s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "ticker":         "ticker 28s linear infinite",
        "breathe":        "breathe 5s ease-in-out infinite",
        "scan-line":      "scanLine 3s ease-in-out infinite",
        "pulse-slow":     "pulse 3s cubic-bezier(.4,0,.6,1) infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
    },
  },
  plugins: [],
};
