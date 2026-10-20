/**
 * Plantilla mensual del Gerente Financiero: una fila por mes con el estado de
 * resultados. Se llena en Excel (o CSV) y se sube; aquí se lee y se valida.
 * Nada se guarda en este paso: la pantalla muestra lo leído y el usuario lo
 * confirma.
 */
import { parseMonto } from "@/lib/parse-monto";
import type { Periodo } from "./estados";

export const COLUMNAS_PLANTILLA = [
  { clave: "mes", titulo: "Mes", ayuda: "AAAA-MM, p. ej. 2026-01" },
  { clave: "ventas", titulo: "Ventas", ayuda: "Ingresos operacionales" },
  { clave: "costoVentas", titulo: "Costo de ventas", ayuda: "Costo directo de lo vendido" },
  { clave: "gastosAdmin", titulo: "Gastos de administración", ayuda: "" },
  { clave: "gastosVentas", titulo: "Gastos de ventas", ayuda: "Mercadeo, comisiones, publicidad" },
  { clave: "depreciacion", titulo: "Depreciación", ayuda: "Y amortizaciones" },
  { clave: "intereses", titulo: "Intereses", ayuda: "Gastos financieros" },
] as const;

type ClaveMonto = Exclude<(typeof COLUMNAS_PLANTILLA)[number]["clave"], "mes">;

export type Unidad = "pesos" | "miles" | "millones";
export const MULTIPLICADOR: Record<Unidad, number> = { pesos: 1, miles: 1_000, millones: 1_000_000 };

export type Celda = string | number | Date | null | undefined;

const MESES: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5,
  jun: 6, junio: 6, jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, sept: 9, septiembre: 9, set: 9, setiembre: 9,
  oct: 10, octubre: 10, nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};

const DIACRITICOS = new RegExp("[̀-ͯ]", "g");
const normalizar = (s: string) => s.normalize("NFD").replace(DIACRITICOS, "").toLowerCase().trim();

const aMes = (anio: number, mes: number) =>
  anio >= 2000 && anio <= 2100 && mes >= 1 && mes <= 12 ? `${anio}-${String(mes).padStart(2, "0")}` : null;
const anioCompleto = (a: number) => (a < 100 ? 2000 + a : a);

/** "2026-01", "2026/1", "01/2026", "ene 2026", "enero-26", o una fecha de Excel → "YYYY-MM". */
export function leerMes(c: Celda): string | null {
  if (c instanceof Date) {
    // Excel guarda la fecha como medianoche UTC del día escrito: se lee en UTC.
    return aMes(c.getUTCFullYear(), c.getUTCMonth() + 1);
  }
  if (c === null || c === undefined) return null;
  const s = normalizar(String(c));
  let m = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:t.*)?$/.exec(s);
  if (m) return aMes(Number(m[1]), Number(m[2]));
  m = /^(\d{1,2})[-/.](\d{4}|\d{2})$/.exec(s);
  if (m) return aMes(anioCompleto(Number(m[2])), Number(m[1]));
  m = /^([a-z]+)\.?[\s\-/]*(?:de\s+)?(\d{4}|\d{2})$/.exec(s);
  if (m && MESES[m[1]]) return aMes(anioCompleto(Number(m[2])), MESES[m[1]]);
  return null;
}

/**
 * Monto de un estado financiero: como `parseMonto` (formato colombiano), pero
 * respeta los negativos con signo ("-1.200") o entre paréntesis ("(1.200)"),
 * que es como los contadores escriben una pérdida.
 */
export function leerMonto(c: Celda): number | null {
  if (typeof c === "number") return Number.isFinite(c) ? c : null;
  if (c === null || c === undefined || c instanceof Date) return null;
  const s = String(c).trim();
  if (!s || s === "-") return null;
  const negativo = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/[$\s]/g, ""));
  const n = parseMonto(s);
  return n === null ? null : negativo ? -n : n;
}

// Encabezados que reconocemos para cada columna (sin tildes, en minúscula).
const ALIAS: Record<string, (typeof COLUMNAS_PLANTILLA)[number]["clave"]> = {
  mes: "mes", periodo: "mes", fecha: "mes",
  ventas: "ventas", ingresos: "ventas", "ingresos operacionales": "ventas",
  "costo de ventas": "costoVentas", costo_ventas: "costoVentas", costo: "costoVentas", "costo de venta": "costoVentas",
  "gastos de administracion": "gastosAdmin", gastos_admin: "gastosAdmin", "gastos administrativos": "gastosAdmin", administracion: "gastosAdmin",
  "gastos de ventas": "gastosVentas", gastos_ventas: "gastosVentas", "gastos comerciales": "gastosVentas",
  depreciacion: "depreciacion", "depreciacion y amortizacion": "depreciacion",
  intereses: "intereses", "gastos financieros": "intereses",
};

export type ResultadoLectura = {
  periodos: Periodo[];
  /** Problemas por fila, en lenguaje del usuario. */
  errores: string[];
};

/** Lee las filas de la plantilla (la primera es el encabezado). */
export function leerPlantilla(filas: Celda[][], unidad: Unidad = "pesos"): ResultadoLectura {
  const errores: string[] = [];
  const iEnc = filas.findIndex(f => f.some(c => c !== null && c !== undefined && String(c).trim() !== ""));
  if (iEnc < 0) return { periodos: [], errores: ["El archivo está vacío."] };

  const columnas = new Map<string, number>();
  filas[iEnc].forEach((c, i) => {
    const clave = ALIAS[normalizar(String(c ?? ""))];
    if (clave && !columnas.has(clave)) columnas.set(clave, i);
  });
  if (!columnas.has("mes") || !columnas.has("ventas")) {
    return { periodos: [], errores: ["No se encontraron las columnas \"Mes\" y \"Ventas\". Use la plantilla descargable."] };
  }

  const x = MULTIPLICADOR[unidad];
  const porMes = new Map<string, Periodo>();
  filas.slice(iEnc + 1).forEach((fila, idx) => {
    const n = iEnc + idx + 2; // número de fila como lo ve el usuario en Excel
    if (fila.every(c => c === null || c === undefined || String(c).trim() === "")) return;
    const mes = leerMes(fila[columnas.get("mes")!]);
    if (!mes) { errores.push(`Fila ${n}: el mes no se reconoce (use AAAA-MM, p. ej. 2026-01).`); return; }
    const ventas = leerMonto(fila[columnas.get("ventas")!]);
    if (ventas === null) { errores.push(`Fila ${n} (${mes}): falta el valor de ventas.`); return; }
    const p: Periodo = { mes, ventas: ventas * x, costoVentas: 0, gastosAdmin: 0, gastosVentas: 0, depreciacion: 0, intereses: 0 };
    for (const clave of ["costoVentas", "gastosAdmin", "gastosVentas", "depreciacion", "intereses"] as ClaveMonto[]) {
      const i = columnas.get(clave);
      if (i === undefined) continue;
      const v = leerMonto(fila[i]);
      if (v === null && fila[i] !== null && fila[i] !== undefined && String(fila[i]).trim() !== "") {
        errores.push(`Fila ${n} (${mes}): "${String(fila[i])}" no es un monto válido.`);
      }
      p[clave] = (v ?? 0) * x;
    }
    if (porMes.has(mes)) errores.push(`Fila ${n}: el mes ${mes} está repetido; se usa la última fila.`);
    porMes.set(mes, p);
  });

  const periodos = [...porMes.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  if (periodos.length === 0 && errores.length === 0) errores.push("La plantilla no tiene meses con datos.");
  return { periodos, errores };
}

/** Separa un CSV en filas y celdas (detecta ";", tabulador o ","). */
export function filasDeCsv(texto: string): Celda[][] {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim() !== "");
  if (lineas.length === 0) return [];
  const enc = lineas[0];
  const sep = enc.includes(";") ? ";" : enc.includes("\t") ? "\t" : ",";
  return lineas.map(l => l.split(sep).map(c => c.trim().replace(/^"(.*)"$/, "$1")));
}
