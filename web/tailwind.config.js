/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#FF6B35", dark: "#E55E2C", light: "#FF8C61" },
        accent: { DEFAULT: "#06D6A0", dark: "#05B88B" },
        dark: "#1A1A2E",
        surface: "#F0EEE9",
        muted: "#9CA3AF",
        border: "rgba(0,0,0,0.07)",
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 16px rgba(0,0,0,0.08)",
        "card-hover": "0 4px 24px rgba(0,0,0,0.12)",
        button: "0 4px 12px rgba(255,107,53,0.35)",
        float: "0 8px 32px rgba(0,0,0,0.12)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #FF6B35 0%, #FF8C61 100%)",
        "gradient-dark": "linear-gradient(135deg, #1A1A2E 0%, #2D2D4E 100%)",
        "gradient-surface": "linear-gradient(180deg, #FFF5F0 0%, #F0EEE9 100%)",
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": { display: "none" },
        },
        ".tap-highlight-none": { "-webkit-tap-highlight-color": "transparent" },
      });
    },
  ],
};
