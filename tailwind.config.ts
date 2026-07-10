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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Extraído del degradado real del logo (public/Logo Evoluteca.png),
        // tramo azul — brand-950 es el navy del sidebar, brand-600 el acento
        // interactivo (botones, links, ítem activo del menú).
        brand: {
          50:  "#eef6fa",
          100: "#d9ecf3",
          200: "#b3d9e8",
          300: "#82c0d8",
          400: "#4fa3c2",
          500: "#2f8ab0",
          600: "#23708f",
          700: "#1c5972",
          800: "#174155",
          900: "#122e3d",
          950: "#0b1c26",
        },
        // Acento cálido (terracota) — usado sobre el navy (brand-950/900) para
        // estado activo, CTAs, cifras destacadas y barras de progreso.
        accent: {
          50:  "#fdf4ec",
          100: "#fae3ce",
          200: "#f3c69c",
          300: "#eba468",
          400: "#e28840",
          500: "#d97328",
          600: "#c05f1e",
          700: "#9c4b18",
          800: "#7a3b14",
          900: "#5c2d10",
        },
      },
    },
  },
  plugins: [],
};
export default config;
