import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * Guardián del error de las "5 horas corridas" (y del "día anterior").
 *
 * El error volvía cada vez que alguien convertía una fecha a mano:
 * `toISOString()` da UTC, `toLocaleDateString()` usa la zona del servidor (UTC
 * en Vercel) o del navegador, y cada pantalla improvisaba distinto. La única
 * forma permitida es src/lib/fecha-bogota.ts (formatoFecha, formatoFechaHora,
 * formatoHora, fechaISO, aInputFecha, aInputDatetimeLocal, ahoraParaInput).
 *
 * Si esta prueba falla: usa esas funciones en vez de la conversión señalada.
 */

const RAIZ = join(__dirname, "..");
const PERMITIDO = new Set(["lib/fecha-bogota.ts"]);
const MARCA = /fecha-guardian: permitido \(.+\)/;

const REGLAS: { nombre: string; re: RegExp }[] = [
  { nombre: "toISOString() recortado a fecha/hora (es UTC, no Bogotá) → fechaISO / aInputDatetimeLocal",
    re: /toISOString\(\)\s*\.\s*(slice|substring|substr)\(\s*0\s*,\s*(10|16)\s*\)|toISOString\(\)\s*\.\s*split\(\s*["']T["']\s*\)/ },
  { nombre: "toLocaleDateString / toLocaleTimeString → formatoFecha / formatoHora",
    re: /\.toLocale(Date|Time)String\(/ },
  { nombre: "toLocaleString con opciones de fecha → formatoFechaHora / formatoFecha",
    re: /\.toLocaleString\(\s*["'][a-z]{2}-[A-Z]{2}["']\s*,\s*\{[^}]*\b(hour|minute|day|month|year|weekday|timeZone)\b/ },
  { nombre: "new Date(...).toLocaleString(...) → formatoFechaHora",
    re: /new Date\([^)]*\)\s*\.toLocaleString\(/ },
  { nombre: "fecha armada a mano con getFullYear()/getMonth() → aInputDatetimeLocal / fechaISO",
    re: /getFullYear\(\)\s*\}-\$\{/ },
];

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "node_modules" ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : [];
  });
}

describe("fechas: solo conversiones de src/lib/fecha-bogota.ts", () => {
  it("ningún archivo convierte fechas a mano", () => {
    const hallazgos: string[] = [];
    for (const archivo of archivos(RAIZ)) {
      const rel = relative(RAIZ, archivo).replace(/\\/g, "/");
      if (PERMITIDO.has(rel)) continue;
      const lineas = readFileSync(archivo, "utf8").split("\n");
      lineas.forEach((linea, i) => {
        // Excepción explícita y justificada: "fecha-guardian: permitido (motivo)"
        // en la misma línea o en la anterior.
        if (MARCA.test(linea) || MARCA.test(lineas[i - 1] ?? "")) return;
        for (const r of REGLAS) if (r.re.test(linea)) hallazgos.push(`src/${rel}:${i + 1} — ${r.nombre}`);
      });
    }
    expect(hallazgos, `Conversión de fecha a mano:\n${hallazgos.join("\n")}`).toEqual([]);
  });

  it("new Intl.DateTimeFormat siempre con timeZone explícito", () => {
    const hallazgos: string[] = [];
    for (const archivo of archivos(RAIZ)) {
      const rel = relative(RAIZ, archivo).replace(/\\/g, "/");
      if (PERMITIDO.has(rel)) continue;
      const src = readFileSync(archivo, "utf8");
      for (const m of src.matchAll(/new Intl\.DateTimeFormat\(/g)) {
        const tramo = src.slice(m.index!, m.index! + 250);
        if (!/timeZone/.test(tramo)) hallazgos.push(`src/${rel}:${src.slice(0, m.index).split("\n").length}`);
      }
    }
    expect(hallazgos, `Intl.DateTimeFormat sin timeZone:\n${hallazgos.join("\n")}`).toEqual([]);
  });
});
