/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../apps/*/src/**/*.{js,ts,jsx,tsx}",
    "../../apps/*/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F4F6F5",
        foreground: "#14201B",
        muted: "#5E6B65",
        border: "#E2E8E4",
        sale: "#E5484D",
        accent: {
          light: "#E6F5EE",
          DEFAULT: "#0F7B5F",
          dark: "#0A5D47",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "8px",
        card: "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,32,27,0.04), 0 1px 3px rgba(20,32,27,0.06)",
        "card-hover": "0 10px 28px rgba(20,32,27,0.10)",
      },
    },
  },
  plugins: [],
};
