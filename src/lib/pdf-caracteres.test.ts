import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

// Los PDFs (@react-pdf) usan la fuente estándar Helvetica, que solo trae los
// caracteres de WinAnsi (cp1252). Cualquier otro —flechas "→", números en
// círculo "①", emojis— sale como un símbolo roto (p. ej. "→" se veía como "'").
// Esta prueba revisa el texto de cada ruta que genera PDFs y falla si aparece
// un carácter que Helvetica no puede dibujar. Usa "›" en vez de "→".

// Bytes 0x80–0x9F de cp1252 que sí tienen carácter asignado (el resto de >0x7F
// coincide con Latin-1, U+00A0–U+00FF).
const EXTRA_CP1252 = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const soportado = (ch: string) => {
  const c = ch.codePointAt(0)!;
  return c < 0x80 || (c >= 0xa0 && c <= 0xff) || EXTRA_CP1252.has(ch);
};

const RAIZ = join(__dirname, "..", "app", "api");
const ARCHIVOS = [
  join(RAIZ, "cotizaciones", "[id]", "pdf", "route.ts"),
  ...readdirSync(join(RAIZ, "manual")).map((d) => join(RAIZ, "manual", d, "route.ts")),
];

describe("PDFs: solo caracteres que Helvetica puede dibujar", () => {
  for (const archivo of ARCHIVOS) {
    it(archivo.slice(RAIZ.length + 1).replace(/\\/g, "/"), () => {
      const problemas: string[] = [];
      readFileSync(archivo, "utf-8").split("\n").forEach((linea, i) => {
        const t = linea.trim();
        // Los comentarios no se dibujan en el PDF.
        if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*")) return;
        for (const ch of linea) {
          if (!soportado(ch)) problemas.push(`L${i + 1}: "${ch}" (U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")})`);
        }
      });
      expect(problemas).toEqual([]);
    });
  }
});
