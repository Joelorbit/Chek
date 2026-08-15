import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // EyuTheme Core Token System
        canvas: "#232323",
        surface: {
          DEFAULT: "#2a2a2a",
          elevated: "#323232",
          raised: "#3c3c3c",
          pressed: "#1a1a1a",
          inset: "#1a1a1a",
        },
        ink: {
          DEFAULT: "#d3d5d0",
          secondary: "rgba(211, 213, 208, 0.82)",
          muted: "rgba(211, 213, 208, 0.68)",
          faint: "rgba(211, 213, 208, 0.46)",
          inverse: "#232323",
        },
        line: {
          DEFAULT: "rgba(211, 213, 208, 0.14)",
          strong: "rgba(211, 213, 208, 0.28)",
          soft: "rgba(211, 213, 208, 0.07)",
        },
        eyu: {
          olive: "#5a6237",
          "olive-strong": "#6c7642",
          "olive-soft": "rgba(90, 98, 55, 0.20)",
          ochre: "#b48148",
          "ochre-strong": "#c89254",
          "ochre-soft": "rgba(180, 129, 72, 0.18)",
          terracotta: "#7e5026",
          "terracotta-soft": "rgba(126, 80, 38, 0.20)",
          sage: "#949a88",
          charcoal: "#232323",
        },
      },
      fontFamily: {
        sans: ["Lexend", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        heading: ["Outfit", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        eyu: "0.425rem",
      },
    },
  },
  plugins: [],
};
export default config;
