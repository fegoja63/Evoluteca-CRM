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
  await wb.xlsx.load(buffer);

  const hojas = wb.worksheets.map((ws) => ws.name);
  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });

  const columnas: string[] = [];
  ws.getRow(1).eachCell((cell) => {
    const val = String(cell.value ?? "").trim();
    if (val) columnas.push(val);
  });

  const muestra: Record<string, string>[] = [];
  let count = 0;
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1 || count >= 3) return;
    const fila: Record<string, string> = {};
    columnas.forEach((col, i) => {
      const cell = row.getCell(i + 1);
      fila[col] = String(cell.value ?? "").trim();
    });
    if (Object.values(fila).some((v) => v)) { muestra.push(fila); count++; }
  });

  return NextResponse.json({ hojas, columnas, muestra, totalFilas: ws.rowCount - 1 });
}
