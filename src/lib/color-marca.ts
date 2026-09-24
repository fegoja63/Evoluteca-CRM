// Color de marca del tenant: lo que ve el CLIENTE FINAL (PDF de la cotización,
// página pública de la cotización y correo con que se envía) sale con el color
// corporativo de la empresa en vez del azul de Evoluteca.
//
// De un solo color elegido se deriva una paleta completa y SIEMPRE legible:
//   - principal:   el color tal cual (líneas y bordes, sin texto encima).
//   - oscuro:      fondos con texto blanco encima (encabezado, total, botones)
//                  y texto de marca sobre blanco. Si el color elegido es muy
//                  claro (ej. amarillo), se oscurece hasta tener contraste
//                  suficiente (WCAG ≥ 5:1 contra blanco).
//   - claro:       fondo suave (badge de estado).
//   - sobreOscuro / sobreOscuroSuave: textos secundarios sobre el fondo oscuro.
//
// Sin color elegido (null) devuelve EXACTAMENTE los azules de siempre, así que
// los tenants que no lo configuren no ven ningún cambio.
//
// Puro y sin dependencias: se usa en el servidor (PDF, correo) y en el cliente
// (página pública, vista previa en Configuración).

export type PaletaMarca = {
  principal: string;
  texto: string; // texto de marca sobre fondo blanco
  oscuro: string;
  claro: string;
  textoSobreClaro: string;
  sobreOscuro: string;
  sobreOscuroSuave: string;
};

export const PALETA_EVOLUTECA: PaletaMarca = {
  principal: "#2563eb",
  texto: "#2563eb",
  oscuro: "#1e3a8a",
  claro: "#dbeafe",
  textoSobreClaro: "#1d4ed8",
  sobreOscuro: "#93c5fd",
  sobreOscuroSuave: "#bfdbfe",
};

const RE_HEX = /^#?([0-9a-f]{6})$/i;

/** "#RRGGBB" en minúsculas, o null si viene vacío o con formato inválido. */
export function normalizarColorMarca(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(RE_HEX);
  return m ? `#${m[1].toLowerCase()}` : null;
}

type RGB = [number, number, number];

function aRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function aHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("");
}

// Mezcla lineal: t = 0 → a, t = 1 → b.
function mezclar(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function luminancia([r, g, b]: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const la = luminancia(aRgb(a));
  const lb = luminancia(aRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const BLANCO: RGB = [255, 255, 255];
const NEGRO: RGB = [0, 0, 0];
const CONTRASTE_MIN = 5;

// Mezcla el color con negro en pasos del 5% hasta alcanzar el contraste pedido
// contra `fondo` (o hasta llegar a negro).
function oscurecerHasta(base: RGB, fondo: string, minimo: number): string {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = aHex(mezclar(base, NEGRO, Math.min(t, 1)));
    if (contraste(c, fondo) >= minimo) return c;
  }
  return "#000000";
}

export function paletaMarca(color: string | null | undefined): PaletaMarca {
  const hex = normalizarColorMarca(color);
  if (!hex) return PALETA_EVOLUTECA;

  const base = aRgb(hex);
  // Oscurecer hasta que el texto blanco encima sea legible.
  const oscuroHex = oscurecerHasta(base, "#ffffff", CONTRASTE_MIN);
  const claroHex = aHex(mezclar(base, BLANCO, 0.88));
  const oscuro = aRgb(oscuroHex);

  return {
    principal: hex,
    texto: oscuroHex,
    oscuro: oscuroHex,
    claro: claroHex,
    // El fondo claro no es blanco puro: se verifica el contraste contra él.
    textoSobreClaro: oscurecerHasta(oscuro, claroHex, 4.5),
    sobreOscuro: aHex(mezclar(oscuro, BLANCO, 0.62)),
    sobreOscuroSuave: aHex(mezclar(oscuro, BLANCO, 0.75)),
  };
}
