import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

type Mapeo = Record<string, string>; // campoDelCRM -> columnaDelExcel

const SEGMENTOS_VALIDOS = ["INDIVIDUAL", "GRUPO", "EMPRESA", "COLEGIO"] as const;

// Importa la lista de asistentes de una obra/función desde un Excel:
// da de alta a cada persona en la audiencia SIN duplicar (busca coincidencia
// por email y, en su defecto, por nombre) y le registra la asistencia a esta
// función. Si la persona ya estaba registrada en esta función, no la repite.
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const funcion = await prisma.funcion.findFirst({
    where: { id: params.id, tenantId },
  });
  if (!funcion) return NextResponse.json({ error: "Función no encontrada" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  const mapeoRaw = formData.get("mapeo") as string;

  if (!file || !mapeoRaw) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const mapeo: Mapeo = JSON.parse(mapeoRaw);
  if (!mapeo.nombre) {
    return NextResponse.json({ error: "Debes asignar la columna del nombre del asistente" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets.reduce((best, curr) =>
    (curr.rowCount > best.rowCount ? curr : best), wb.worksheets[0]);

  function leerCelda(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return "";
    if (typeof v === "object" && "result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "");
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }

  const headerMap: { col: number; nombre: string }[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = leerCelda(cell).trim();
    if (val) headerMap.push({ col: colNumber, nombre: val });
  });

  function getCol(fila: Record<string, string>, campo: string): string | null {
    const colExcel = mapeo[campo];
    if (!colExcel || colExcel === "__ignorar__") return null;
    return fila[colExcel]?.trim() || null;
  }

  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    headerMap.forEach(({ col, nombre }) => { fila[nombre] = leerCelda(row.getCell(col)).trim(); });
    if (Object.values(fila).some((v) => v)) filas.push(fila);
  });

  // Índices para deduplicar contra la audiencia existente: por email (si tiene)
  // y por nombre normalizado. Se van actualizando a medida que creamos gente
  // nueva, para que dos filas de la misma persona dentro del mismo archivo no
  // generen dos espectadores.
  const espectadores = await prisma.espectador.findMany({
    where: { tenantId },
    select: { id: true, nombre: true, email: true },
  });
  const porEmail = new Map<string, string>();
  const porNombre = new Map<string, string>();
  for (const e of espectadores) {
    if (e.email) porEmail.set(e.email.toLowerCase().trim(), e.id);
    porNombre.set(e.nombre.toLowerCase().trim(), e.id);
  }

  // Quiénes ya tienen asistencia registrada en esta función.
  const yaAsisten = new Set(
    (await prisma.asistencia.findMany({
      where: { tenantId, funcionId: params.id },
      select: { espectadorId: true },
    })).map((a) => a.espectadorId)
  );

  let asistenciasCreadas = 0;
  let espectadoresNuevos = 0;
  let duplicados = 0; // ya estaban registrados en esta misma función
  let errores = 0;

  for (const fila of filas) {
    const nombre = getCol(fila, "nombre");
    if (!nombre) { errores++; continue; }

    const email = getCol(fila, "email");
    const telefono = getCol(fila, "telefono");
    const segRaw = getCol(fila, "segmento")?.toUpperCase() ?? "";
    const segmento = (SEGMENTOS_VALIDOS as readonly string[]).includes(segRaw)
      ? segRaw as typeof SEGMENTOS_VALIDOS[number]
      : "INDIVIDUAL";

    const emailKey = email?.toLowerCase().trim();
    const nombreKey = nombre.toLowerCase().trim();

    try {
      let espectadorId = (emailKey && porEmail.get(emailKey)) || porNombre.get(nombreKey);

      if (!espectadorId) {
        const nuevo = await prisma.espectador.create({
          data: { nombre, email, telefono, segmento, tenantId },
        });
        espectadorId = nuevo.id;
        espectadoresNuevos++;
        porNombre.set(nombreKey, espectadorId);
        if (emailKey) porEmail.set(emailKey, espectadorId);
      }

      if (yaAsisten.has(espectadorId)) { duplicados++; continue; }

      await prisma.asistencia.create({
        data: { funcionId: params.id, espectadorId, tenantId },
      });
      yaAsisten.add(espectadorId);
      asistenciasCreadas++;
    } catch { errores++; }
  }

  return NextResponse.json({
    ok: true,
    asistenciasCreadas,
    espectadoresNuevos,
    duplicados,
    errores,
    total: filas.length,
  });
}
