import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

type MapeoCompleto = {
  empresa?: string;
  contacto?: string;
  emailContacto?: string;
  telefonoContacto?: string;
  cargoContacto?: string;
  tituloOportunidad?: string;
  valorOportunidad?: string;
  costoOportunidad?: string;
  etapaOportunidad?: string;
  fechaEvento?: string;
  fechaCierre?: string;
  sede?: string;
  origenLead?: string;
  segmento?: string;
  recurrente?: string;
};

const ETAPAS_MAP: Record<string, string> = {
  "HECHO": "GANADA", "GANADO": "GANADA", "GANADA": "GANADA",
  "DESCARTADO": "PERDIDA", "PERDIDO": "PERDIDA", "PERDIDA": "PERDIDA",
  "PROPUESTA": "PROPUESTA", "NEGOCIACION": "NEGOCIACION", "NEGOCIACIÓN": "NEGOCIACION",
  "CALIFICADO": "CALIFICADO", "PROSPECTO": "PROSPECTO",
  "EN PROCESO": "PROPUESTA", "PROCESO": "PROPUESTA",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  const mapeoRaw = formData.get("mapeo") as string;
  const colsExtraRaw = formData.get("colsExtra") as string;

  if (!file || !mapeoRaw) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  const mapeo: MapeoCompleto = JSON.parse(mapeoRaw);
  const colsExtra: string[] = colsExtraRaw ? JSON.parse(colsExtraRaw) : [];
  const colsUsadas = new Set(Object.values(mapeo).filter(Boolean));

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  // Usar la hoja con más filas para evitar leer hojas de resumen/dashboard
  const ws = wb.worksheets.reduce((best, curr) =>
    (curr.rowCount > best.rowCount ? curr : best), wb.worksheets[0]);

  function leerCelda(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return "";
    if (typeof v === "object" && "result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "");
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }

  // Leer headers con su número de columna real (evita desplazamiento si hay columnas vacías al inicio)
  const headerMap: { col: number; nombre: string }[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = leerCelda(cell).trim();
    if (val) headerMap.push({ col: colNumber, nombre: val });
  });

  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    headerMap.forEach(({ col, nombre }) => { fila[nombre] = leerCelda(row.getCell(col)).trim(); });
    if (Object.values(fila).some((v) => v)) filas.push(fila);
  });

  function get(fila: Record<string, string>, campo: keyof MapeoCompleto): string | null {
    const col = mapeo[campo];
    if (!col) return null;
    return fila[col]?.trim() || null;
  }

  function getExtras(fila: Record<string, string>): Record<string, string> | null {
    const extras: Record<string, string> = {};
    for (const col of colsExtra) {
      if (!colsUsadas.has(col)) {
        const val = fila[col]?.trim();
        if (val) extras[col] = val;
      }
    }
    return Object.keys(extras).length > 0 ? extras : null;
  }

  function parseFecha(str: string | null): Date | null {
    if (!str) return null;
    // Intenta parsear formatos comunes: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    const limpio = str.trim();
    const partes = limpio.split(/[\/\-\.]/);
    if (partes.length === 3) {
      const [a, b, c] = partes.map(Number);
      if (c > 1900) return new Date(c, a - 1, b); // DD/MM/YYYY
      if (a > 1900) return new Date(a, b - 1, c); // YYYY-MM-DD
    }
    const d = new Date(limpio);
    return isNaN(d.getTime()) ? null : d;
  }

  function limpiarValor(str: string): number | null {
    const limpio = str.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(limpio);
    return limpio && !isNaN(n) ? n : null;
  }

  // ── PASO 1: Empresas ──────────────────────────────────────────
  // Pre-cargar empresas ya existentes
  const existentes = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
  const empresaCache = new Map<string, string>(existentes.map((e) => [e.nombre.toLowerCase(), e.id]));

  // Colectar empresas nuevas únicas
  const empresasNuevas = new Map<string, Record<string, string>>(); // nombre.lower → fila representativa
  for (const fila of filas) {
    const nombre = get(fila, "empresa");
    if (!nombre) continue;
    const key = nombre.toLowerCase();
    if (!empresaCache.has(key) && !empresasNuevas.has(key)) {
      empresasNuevas.set(key, fila);
    }
  }

  // Insertar empresas nuevas en lote
  if (empresasNuevas.size > 0) {
    await prisma.empresa.createMany({
      data: Array.from(empresasNuevas.entries()).map(([, fila]) => ({
        nombre: get(fila, "empresa")!,
        extras: getExtras(fila) ?? undefined,
        tenantId,
      })),
      skipDuplicates: true,
    });
    // Recargar para obtener IDs
    const recargadas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
    recargadas.forEach((e) => empresaCache.set(e.nombre.toLowerCase(), e.id));
  }

  // ── PASO 2: Contactos en lote ─────────────────────────────────
  const contactosData = filas
    .filter((f) => get(f, "contacto"))
    .map((fila) => {
      const empresaNombre = get(fila, "empresa");
      const empresaId = empresaNombre ? empresaCache.get(empresaNombre.toLowerCase()) ?? null : null;
      return {
        nombre: get(fila, "contacto")!,
        email: get(fila, "emailContacto"),
        telefono: get(fila, "telefonoContacto"),
        cargo: get(fila, "cargoContacto"),
        empresaId,
        tenantId,
      };
    });

  let contactosCreados = 0;
  let contactosError = "";
  try {
    const r = await prisma.contacto.createMany({ data: contactosData, skipDuplicates: true });
    contactosCreados = r.count;
  } catch (e) {
    contactosError = String(e);
    console.error("Error creando contactos:", e);
  }

  // ── PASO 3: Oportunidades en lote ────────────────────────────
  const oportunidadesData = filas
    .filter((f) => get(f, "tituloOportunidad"))
    .map((fila) => {
      const empresaNombre = get(fila, "empresa");
      const empresaId = empresaNombre ? empresaCache.get(empresaNombre.toLowerCase()) ?? null : null;
      const etapaRaw = get(fila, "etapaOportunidad")?.toUpperCase().trim() ?? "";
      const etapa = (ETAPAS_MAP[etapaRaw] ?? "PROSPECTO") as "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";
      const valor = limpiarValor(get(fila, "valorOportunidad") ?? "");
      const costo = limpiarValor(get(fila, "costoOportunidad") ?? "");
      const fechaEvento = parseFecha(get(fila, "fechaEvento"));
      const fechaCierre = parseFecha(get(fila, "fechaCierre"));
      const recurrenteRaw = get(fila, "recurrente")?.toUpperCase().trim();
      const recurrente = recurrenteRaw === "SI" || recurrenteRaw === "SÍ" || recurrenteRaw === "YES" || recurrenteRaw === "1" ? true
        : recurrenteRaw === "NO" || recurrenteRaw === "0" ? false : null;
      return {
        titulo: get(fila, "tituloOportunidad")!,
        etapa,
        valor,
        costo,
        fechaEvento,
        fechaCierre,
        sede: get(fila, "sede"),
        origenLead: get(fila, "origenLead"),
        segmento: get(fila, "segmento"),
        recurrente,
        empresaId,
        extras: getExtras(fila) ?? undefined,
        tenantId,
      };
    });

  let oportunidadesCreadas = 0;
  let oportunidadesError = "";
  try {
    const r = await prisma.oportunidad.createMany({ data: oportunidadesData, skipDuplicates: true });
    oportunidadesCreadas = r.count;
  } catch (e) {
    oportunidadesError = String(e);
    console.error("Error creando oportunidades:", e);
  }

  return NextResponse.json({
    ok: true,
    empresasCreadas: empresasNuevas.size,
    contactosCreados,
    oportunidadesCreadas,
    errores: 0,
    total: filas.length,
    debug: {
      contactosMapeados: contactosData.length,
      oportunidadesMapeadas: oportunidadesData.length,
      contactosError,
      oportunidadesError,
    },
  });
}
