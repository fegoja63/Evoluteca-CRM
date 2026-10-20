import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { COLUMNAS_PLANTILLA } from "@/lib/finanzas/plantilla";
import { fechaISO } from "@/lib/fecha-bogota";

export const dynamic = "force-dynamic";

// Plantilla en Excel con los últimos 12 meses ya escritos, lista para llenar.
export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Resultados mensuales");
  ws.columns = COLUMNAS_PLANTILLA.map(c => ({ header: c.titulo, key: c.clave, width: c.clave === "mes" ? 12 : 22 }));
  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  ws.getRow(1).height = 30;

  // Los 12 meses anteriores al actual (hora de Colombia).
  const [anio, mes] = fechaISO().slice(0, 7).split("-").map(Number);
  for (let i = 12; i >= 1; i--) {
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1));
    ws.addRow({ mes: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}` });
  }
  ws.getColumn("mes").numFmt = "@";
  for (const c of COLUMNAS_PLANTILLA.slice(1)) ws.getColumn(c.clave).numFmt = "#,##0";

  const ayuda = wb.addWorksheet("Instrucciones");
  ayuda.getColumn(1).width = 100;
  [
    "Una fila por mes, con el estado de resultados de ese mes (no el acumulado del año).",
    "Mes: AAAA-MM (por ejemplo 2026-01). También se entiende \"ene 2026\" o \"01/2026\".",
    "Escriba los montos en pesos, miles o millones; al subir el archivo elija la unidad.",
    "Las columnas que no use pueden quedar vacías (cuentan como cero), menos Ventas.",
    ...COLUMNAS_PLANTILLA.filter(c => c.ayuda).map(c => `${c.titulo}: ${c.ayuda}.`),
  ].forEach(t => ayuda.addRow([t]));

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-gerente-financiero.xlsx"',
    },
  });
}
