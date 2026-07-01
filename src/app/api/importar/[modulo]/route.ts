import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function POST(
  request: Request,
  { params }: { params: { modulo: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;

  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "El archivo no tiene hojas" }, { status: 400 });

  // Leer encabezados de la primera fila
  const headers: string[] = [];
  ws.getRow(1).eachCell((cell) => { headers.push(String(cell.value ?? "").trim()); });

  // Leer filas de datos (saltar fila 1 y filas vacías)
  const filas: Record<string, string>[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const fila: Record<string, string> = {};
    row.eachCell((cell, colNum) => {
      const header = headers[colNum - 1];
      if (header) fila[header] = String(cell.value ?? "").trim();
    });
    const tieneContenido = Object.values(fila).some((v) => v);
    if (tieneContenido) filas.push(fila);
  });

  if (filas.length === 0) {
    return NextResponse.json({ error: "El archivo no tiene datos" }, { status: 400 });
  }

  let creados = 0;
  let errores = 0;

  const col = (fila: Record<string, string>, ...posibles: string[]) => {
    for (const p of posibles) {
      const val = Object.entries(fila).find(([k]) => k.toLowerCase().replace(/\s|\*/g, "").includes(p.toLowerCase()))?.[1];
      if (val) return val;
    }
    return null;
  };

  switch (params.modulo) {
    case "empresas": {
      for (const fila of filas) {
        const nombre = col(fila, "nombre");
        if (!nombre) { errores++; continue; }
        try {
          await prisma.empresa.create({
            data: {
              nombre,
              sector: col(fila, "sector") || null,
              telefono: col(fila, "telefono", "teléfono") || null,
              sitioWeb: col(fila, "web", "sitio") || null,
              notas: col(fila, "notas") || null,
              tenantId,
            },
          });
          creados++;
        } catch { errores++; }
      }
      break;
    }
    case "contactos": {
      // Pre-cargar empresas del tenant para vincular por nombre
      const empresas = await prisma.empresa.findMany({ where: { tenantId }, select: { id: true, nombre: true } });
      const empresaMap = new Map(empresas.map((e) => [e.nombre.toLowerCase(), e.id]));

      for (const fila of filas) {
        const nombre = col(fila, "nombre");
        if (!nombre) { errores++; continue; }
        const empresaNombre = col(fila, "empresa");
        const empresaId = empresaNombre ? empresaMap.get(empresaNombre.toLowerCase()) : null;
        try {
          await prisma.contacto.create({
            data: {
              nombre,
              email: col(fila, "email", "correo") || null,
              telefono: col(fila, "telefono", "teléfono") || null,
              cargo: col(fila, "cargo") || null,
              notas: col(fila, "notas") || null,
              empresaId: empresaId || null,
              tenantId,
            },
          });
          creados++;
        } catch { errores++; }
      }
      break;
    }
    case "espectadores": {
      for (const fila of filas) {
        const nombre = col(fila, "nombre");
        if (!nombre) { errores++; continue; }
        const segmentoRaw = col(fila, "segmento")?.toUpperCase();
        const segmento = ["INDIVIDUAL", "GRUPO", "EMPRESA", "COLEGIO"].includes(segmentoRaw ?? "")
          ? (segmentoRaw as "INDIVIDUAL" | "GRUPO" | "EMPRESA" | "COLEGIO")
          : "INDIVIDUAL";
        try {
          await prisma.espectador.create({
            data: {
              nombre,
              email: col(fila, "email", "correo") || null,
              telefono: col(fila, "telefono", "teléfono") || null,
              segmento,
              notas: col(fila, "notas") || null,
              tenantId,
            },
          });
          creados++;
        } catch { errores++; }
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Módulo no soportado para importación" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, creados, errores, total: filas.length });
}
