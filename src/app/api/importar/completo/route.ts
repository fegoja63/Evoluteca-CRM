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
  etapaOportunidad?: string;
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
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? "").trim()));

  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    headers.forEach((h, i) => { fila[h] = String(row.getCell(i + 1).value ?? "").trim(); });
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
        extras: getExtras(fila),
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

  const contactosResult = await prisma.contacto.createMany({ data: contactosData, skipDuplicates: false });

  // ── PASO 3: Oportunidades en lote ────────────────────────────
  const oportunidadesData = filas
    .filter((f) => get(f, "tituloOportunidad"))
    .map((fila) => {
      const empresaNombre = get(fila, "empresa");
      const empresaId = empresaNombre ? empresaCache.get(empresaNombre.toLowerCase()) ?? null : null;
      const etapaRaw = get(fila, "etapaOportunidad")?.toUpperCase().trim() ?? "";
      const etapa = (ETAPAS_MAP[etapaRaw] ?? "PROSPECTO") as "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA";
      const valor = limpiarValor(get(fila, "valorOportunidad") ?? "");
      return {
        titulo: get(fila, "tituloOportunidad")!,
        etapa,
        valor,
        empresaId,
        extras: getExtras(fila),
        tenantId,
      };
    });

  const oportunidadesResult = await prisma.oportunidad.createMany({ data: oportunidadesData, skipDuplicates: false });

  return NextResponse.json({
    ok: true,
    empresasCreadas: empresasNuevas.size,
    contactosCreados: contactosResult.count,
    oportunidadesCreadas: oportunidadesResult.count,
    errores: 0,
    total: filas.length,
  });
}
