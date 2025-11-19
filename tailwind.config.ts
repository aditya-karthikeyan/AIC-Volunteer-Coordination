import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#3BB4C1",
          light: "#4FC5D1",
          dark: "#32A2AD",
        },
        limeGreen: "#C4D600",
        darkBlue: "#0F1C2E",
        textSecondary: "#475466",
        cardBg: "#FFFFFF",
        bgBase: "#F7F9FA",
        gray: {
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
      },
      boxShadow: {
        "clay": "0px 10px 30px rgba(0, 0, 0, 0.12), inset 0px 2px 3px rgba(255, 255, 255, 0.7)",
        "clay-sm": "0px 6px 20px rgba(0, 0, 0, 0.1), inset 0px 1px 2px rgba(255, 255, 255, 0.6)",
        "clay-button": "0px 8px 20px rgba(59, 180, 193, 0.4), inset 0px -3px 5px rgba(0, 0, 0, 0.15), inset 0px 3px 6px rgba(255, 255, 255, 0.5)",
        "clay-hover": "0px 12px 35px rgba(0, 0, 0, 0.15), inset 0px 2px 4px rgba(255, 255, 255, 0.8)",
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
export default config;
