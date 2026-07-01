import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("archivo") as File;
  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  const hojas = wb.worksheets.map((ws) => ws.name);
  const ws = wb.worksheets.reduce((best, curr) =>
    (curr.rowCount > best.rowCount ? curr : best), wb.worksheets[0]);
  if (!ws) return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });

  function leerCelda(cell: ExcelJS.Cell): string {
    const v = cell.value;
    if (v === null || v === undefined) return "";
    if (typeof v === "object" && "result" in v) return String((v as ExcelJS.CellFormulaValue).result ?? "");
    if (v instanceof Date) return v.toISOString();
    return String(v);
  }

  // Leer headers con su número de columna real (no índice secuencial)
  const headerMap: { col: number; nombre: string }[] = [];
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const val = leerCelda(cell).trim();
    if (val) headerMap.push({ col: colNumber, nombre: val });
  });

  const columnas = headerMap.map(h => h.nombre);

  const muestra: Record<string, string>[] = [];
  let count = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1 || count >= 5) return;
    const fila: Record<string, string> = {};
    // Usar el número de columna real para leer el dato correcto
    headerMap.forEach(({ col, nombre }) => {
      fila[nombre] = leerCelda(row.getCell(col)).trim();
    });
    if (Object.values(fila).some((v) => v)) { muestra.push(fila); count++; }
  });

  return NextResponse.json({ hojas, columnas, muestra, totalFilas: ws.rowCount - 1 });
}
