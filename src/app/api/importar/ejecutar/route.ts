import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

type Mapeo = Record<string, string>; // campoDelCRM -> columnaDelExcel

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  const modulo = formData.get("modulo") as string;
  const mapeoRaw = formData.get("mapeo") as string;

  if (!file || !modulo || !mapeoRaw) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const mapeo: Mapeo = JSON.parse(mapeoRaw);
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell) => headers.push(String(cell.value ?? "").trim()));

  function getCol(fila: Record<string, string>, campo: string): string | null {
    const colExcel = mapeo[campo];
    if (!colExcel || colExcel === "__ignorar__") return null;
    return fila[colExcel]?.trim() || null;
  }

  // Columnas ya mapeadas a campos estándar del CRM
  const columnasMapeadas = new Set(Object.values(mapeo).filter(v => v !== "__ignorar__"));

  function getExtras(fila: Record<string, string>): Record<string, string> | null {
    const extras: Record<string, string> = {};
    for (const [col, val] of Object.entries(fila)) {
      if (!columnasMapeadas.has(col) && val?.trim()) {
        extras[col] = val.trim();
      }
    }
    return Object.keys(extras).length > 0 ? extras : null;
  }

  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    headers.forEach((h, i) => { fila[h] = String(row.getCell(i + 1).value ?? "").trim(); });
    if (Object.values(fila).some((v) => v)) filas.push(fila);
  });

  let creados = 0;
  let errores = 0;

  if (modulo === "empresas") {
    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      try {
        await prisma.empresa.create({
          data: {
            nombre,
            sector: getCol(fila, "sector"),
            telefono: getCol(fila, "telefono"),
            sitioWeb: getCol(fila, "sitioWeb"),
            notas: getCol(fila, "notas"),
            extras: getExtras(fila),
            tenantId,
          },
        });
        creados++;
      } catch { errores++; }
    }
  } else if (modulo === "contactos") {
    const empresas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
    const empresaMap = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]));

    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      const empresaNombre = getCol(fila, "empresa");
      const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : null;
      try {
        await prisma.contacto.create({
          data: {
            nombre,
            email: getCol(fila, "email"),
            telefono: getCol(fila, "telefono"),
            cargo: getCol(fila, "cargo"),
            notas: getCol(fila, "notas"),
            extras: getExtras(fila),
            empresaId: empresaId || null,
            tenantId,
          },
        });
        creados++;
      } catch { errores++; }
    }
  } else if (modulo === "oportunidades") {
    const empresas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
    const empresaMap = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]));
    const ETAPAS_VALIDAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];

    for (const fila of filas) {
      const titulo = getCol(fila, "titulo");
      if (!titulo) { errores++; continue; }
      const empresaNombre = getCol(fila, "empresa");
      const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : null;
      const etapaRaw = getCol(fila, "etapa")?.toUpperCase().replace(/\s/g, "_") ?? "";
      const etapa = ETAPAS_VALIDAS.includes(etapaRaw) ? etapaRaw as "PROSPECTO" | "CALIFICADO" | "PROPUESTA" | "NEGOCIACION" | "GANADA" | "PERDIDA" : "PROSPECTO";
      const valorRaw = getCol(fila, "valor");
      const valor = valorRaw ? Number(valorRaw.replace(/[^0-9.]/g, "")) : null;
      try {
        await prisma.oportunidad.create({
          data: {
            titulo,
            etapa,
            valor: valor && !isNaN(valor) ? valor : null,
            notas: getCol(fila, "notas"),
            extras: getExtras(fila),
            empresaId: empresaId || null,
            tenantId,
          },
        });
        creados++;
      } catch { errores++; }
    }
  } else if (modulo === "espectadores") {
    const SEGMENTOS_VALIDOS = ["INDIVIDUAL", "GRUPO", "EMPRESA", "COLEGIO"];
    for (const fila of filas) {
      const nombre = getCol(fila, "nombre");
      if (!nombre) { errores++; continue; }
      const segRaw = getCol(fila, "segmento")?.toUpperCase() ?? "";
      const segmento = SEGMENTOS_VALIDOS.includes(segRaw) ? segRaw as "INDIVIDUAL" | "GRUPO" | "EMPRESA" | "COLEGIO" : "INDIVIDUAL";
      try {
        await prisma.espectador.create({
          data: {
            nombre,
            email: getCol(fila, "email"),
            telefono: getCol(fila, "telefono"),
            segmento,
            notas: getCol(fila, "notas"),
            extras: getExtras(fila),
            tenantId,
          },
        });
        creados++;
      } catch { errores++; }
    }
  } else {
    return NextResponse.json({ error: "Módulo no soportado" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, creados, errores, total: filas.length });
}
