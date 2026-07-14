import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
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
        // Acento cálido (rojo ladrillo) — usado sobre el navy (brand-950/900)
        // para estado activo, CTAs, cifras destacadas y barras de progreso.
        accent: {
          50:  "#fdece9",
          100: "#fad0c9",
          200: "#f4a999",
          300: "#ea8068",
          400: "#de5c3f",
          500: "#cf4326",
          600: "#b53419",
          700: "#922912",
          800: "#71200e",
          900: "#54170a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
