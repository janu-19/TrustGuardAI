/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#060913",       // sleek dark body background
        cardBg: "#0c101f",       // premium cards
        cardBorder: "#1e293b",   // card borders
        glowGreen: "#10b981",    // trusted glow
        glowYellow: "#f59e0b",   // warning glow
        glowRed: "#ef4444",      // alert glow
        accentBlue: "#3b82f6",   // active items
        accentIndigo: "#6366f1", // buttons
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
