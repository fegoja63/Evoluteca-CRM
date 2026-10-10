import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import twColors from "tailwindcss/colors";

// Extraído del degradado real del logo (public/Logo Evoluteca.png),
// tramo azul — brand-950 es el navy del sidebar, brand-600 el acento
// interactivo (botones, links, ítem activo del menú).
const BRAND: Record<string, string> = {
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
};
// Acento cálido (rojo ladrillo) — usado sobre el navy (brand-950/900)
// para estado activo, CTAs, cifras destacadas y barras de progreso.
const ACCENT: Record<string, string> = {
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
};

// ── Modo oscuro por variables ────────────────────────────────────────────────
// Cada paleta usada en la app se sirve como `rgb(var(--c-<paleta>-<tono>))`.
// En :root las variables valen lo mismo que antes (el modo claro no cambia) y
// bajo `.dark` toman su versión nocturna. Así las ~5.000 clases de color de las
// pantallas funcionan en los dos modos sin escribir `dark:` en cada una.
const TONOS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];

// Grises (slate/neutral/gray): escala invertida a mano para que el texto
// secundario (400–500) siga legible sobre fondo oscuro.
const GRIS_NOCHE: Record<string, string> = {
  50: "#182235", 100: "#1f2a3e", 200: "#2a374d", 300: "#3b4a62", 400: "#7c8aa0",
  500: "#94a3b8", 600: "#a9b6c8", 700: "#cbd5e1", 800: "#e2e8f0", 900: "#f1f5f9", 950: "#f8fafc",
};

// Colores con matiz: los tintes claros (50–100) pasan a oscuros, los tonos de
// texto (700–950) pasan a claros y los medios (400–600: botones, barras) se
// quedan. Las insignias "bg-x-50 text-x-700" se leen igual de noche.
// 200–300 se quedan: casi siempre son texto claro sobre el navy (menú,
// encabezados). Cuando son fondo o borde de una tarjeta, TINTE_NOCHE los
// oscurece con una regla aparte.
const ESPEJO: Record<string, string> = {
  50: "950", 100: "900", 200: "200", 300: "300", 400: "400", 500: "500",
  600: "600", 700: "400", 800: "300", 900: "200", 950: "100",
};
const TINTE_NOCHE: Record<string, string> = { 200: "800", 300: "700" };

const PALETAS: Record<string, { dia: Record<string, string>; noche: Record<string, string> }> = {};
for (const gris of ["slate", "neutral", "gray"] as const) {
  PALETAS[gris] = { dia: twColors[gris], noche: GRIS_NOCHE };
}
const conMatiz: Record<string, Record<string, string>> = {
  brand: BRAND, accent: ACCENT,
  red: twColors.red, amber: twColors.amber, emerald: twColors.emerald, blue: twColors.blue,
  violet: twColors.violet, rose: twColors.rose, sky: twColors.sky, orange: twColors.orange,
  green: twColors.green, cyan: twColors.cyan,
};
// Mezcla dos colores hex (peso = cuánto de `a`).
const mezcla = (a: string, b: string, peso: number) => {
  const ca = parseInt(a.slice(1), 16), cb = parseInt(b.slice(1), 16);
  const canal = (sh: number) => Math.round(((ca >> sh) & 255) * peso + ((cb >> sh) & 255) * (1 - peso));
  return "#" + [16, 8, 0].map(sh => canal(sh).toString(16).padStart(2, "0")).join("");
};
const SUPERFICIE_NOCHE = "#131c2e"; // = --superficie en globals.css

for (const [nombre, dia] of Object.entries(conMatiz)) {
  const tono = (t: string) => dia[t] ?? dia["900"]; // accent no tiene 950
  const noche = Object.fromEntries(TONOS.map(t => [t, tono(ESPEJO[t])]));
  // Los tintes de fondo (50/100) se funden con la superficie: un rojo 950 puro
  // satura demasiado una tarjeta entera.
  noche["50"] = mezcla(tono("950"), SUPERFICIE_NOCHE, 0.45);
  noche["100"] = mezcla(tono("900"), SUPERFICIE_NOCHE, 0.6);
  // El navy de la marca (800–950) es superficie (menú, encabezados): se queda.
  if (nombre === "brand") for (const t of ["800", "900", "950"]) noche[t] = dia[t];
  PALETAS[nombre] = { dia, noche };
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const coloresTema = Object.fromEntries(
  Object.keys(PALETAS).map(nombre => [
    nombre,
    Object.fromEntries(TONOS.map(t => [t, `rgb(var(--c-${nombre}-${t}) / <alpha-value>)`])),
  ]),
);
// Reglas de noche para bg/border/ring-<color>-200/300 (y sus hover/focus):
// sobre una tarjeta oscura deben ser oscuras aunque la variable siga clara.
const esc = (s: string) => s.replace(/:/g, "\\:");
const tintesNoche: Record<string, Record<string, string>> = {};
for (const [nombre, dia] of Object.entries(conMatiz)) {
  for (const [t, destino] of Object.entries(TINTE_NOCHE)) {
    const valor = dia[destino];
    for (const [util, prop] of [["bg", "background-color"], ["border", "border-color"], ["ring", "--tw-ring-color"]] as const) {
      for (const pre of ["", "hover:", "focus:", "focus-within:"]) {
        const estado = pre ? `:${pre.slice(0, -1)}` : "";
        tintesNoche[`.dark .${esc(`${pre}${util}-${nombre}-${t}`)}${estado}`] = { [prop]: valor };
      }
    }
  }
  // Como TEXTO, 500/600 pierden contraste sobre fondo oscuro: pasan a 400.
  // (Como fondo de botón se quedan; por eso va por regla y no por variable.)
  for (const t of ["500", "600"]) {
    for (const pre of ["", "hover:", "group-hover:"]) {
      const estado = pre === "hover:" ? ":hover" : "";
      const sel = pre === "group-hover:" ? `.dark .group:hover .${esc(`${pre}text-${nombre}-${t}`)}` : `.dark .${esc(`${pre}text-${nombre}-${t}`)}${estado}`;
      tintesNoche[sel] = { color: dia["400"] };
    }
  }
}
// El navy de la marca (800–950) queda fijo por ser superficie, pero como TEXTO
// (insignias de etapa sobre tinte claro) de noche se aclara.
for (const [t, claro] of [["800", "200"], ["900", "200"], ["950", "100"]] as const) {
  tintesNoche[`.dark .${esc(`text-brand-${t}`)}`] = { color: BRAND[claro] };
}

const variables = (modo: "dia" | "noche") =>
  Object.fromEntries(
    Object.entries(PALETAS).flatMap(([nombre, p]) =>
      TONOS.map(t => [`--c-${nombre}-${t}`, rgb(p[modo][t] ?? p[modo]["900"])]),
    ),
  );

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
      // Escala tipográfica: 2xs (11px) solo para etiquetas en mayúsculas,
      // insignias y contadores; el texto normal empieza en xs (12px).
      // No usar tamaños arbitrarios (text-[10px]).
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      // Entradas cortas (≤200ms): el fondo del modal se funde, el panel sube
      // apenas y crece desde 96%, el menú del celular se desliza desde la izq.
      // globals.css las apaga si el sistema pide reducir movimiento.
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(6px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "slide-in-left": { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(0)" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "modal-in": "modal-in 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-left": "slide-in-left 220ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ...coloresTema,
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ addBase }) => {
      addBase({ ":root": variables("dia"), ".dark": variables("noche"), ...tintesNoche });
    }),
  ],
};
export default config;
