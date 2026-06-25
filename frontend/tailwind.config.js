/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  "#e6f4f5", 100: "#c8e8ea", 200: "#91d0d4",
          300: "#5ab8bd", 400: "#23a0a6", 500: "#0d7377",
          600: "#0a5c60", 700: "#084548", 800: "#052e30",
          900: "#021718",
        },
        sage: {
          50:  "#e8f5ee", 100: "#c6e8d5", 200: "#8dd1ab",
          300: "#54ba81", 400: "#2d8c5c", 500: "#1a6b44",
          600: "#134f32",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card:    "0 1px 4px rgba(13,115,119,.06)",
        "card-md":"0 4px 12px rgba(13,115,119,.08)",
        "card-lg":"0 8px 24px rgba(13,115,119,.12)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(.4,0,.6,1) infinite",
      },
    },
  },
  plugins: [],
};
