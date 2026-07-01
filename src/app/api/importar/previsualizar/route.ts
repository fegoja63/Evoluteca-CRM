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
  // Usar la hoja con más filas (ignora hojas de resumen/dashboard)
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

  const columnas: string[] = [];
  ws.getRow(1).eachCell((cell) => {
    const val = leerCelda(cell).trim();
    if (val) columnas.push(val);
  });

  const muestra: Record<string, string>[] = [];
  let count = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1 || count >= 3) return;
    const fila: Record<string, string> = {};
    columnas.forEach((col, i) => {
      fila[col] = leerCelda(row.getCell(i + 1)).trim();
    });
    if (Object.values(fila).some((v) => v)) { muestra.push(fila); count++; }
  });

  return NextResponse.json({ hojas, columnas, muestra, totalFilas: ws.rowCount - 1 });
}
