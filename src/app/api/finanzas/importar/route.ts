import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { leerPlantilla, filasDeCsv, type Celda, type Unidad } from "@/lib/finanzas/plantilla";
import { UNIDADES } from "@/lib/validations/finanzas";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;

function valorCelda(c: ExcelJS.Cell): Celda {
  const v = c.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "object" && "result" in v) {
    const r = (v as ExcelJS.CellFormulaValue).result;
    return r instanceof Date || typeof r === "number" || typeof r === "string" ? r : null;
  }
  if (typeof v === "object" && "richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map(t => t.text).join("");
  return String(v);
}

// Lee la plantilla mensual (Excel o CSV) y devuelve lo que entendió. No guarda
// nada: la pantalla lo muestra y el usuario confirma con PUT /periodos.
export async function POST(req: Request) {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;

  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: "El archivo pesa más de 5 MB" }, { status: 400 });
  const unidadPedida = String(form?.get("unidad") ?? "pesos");
  const unidad: Unidad = (UNIDADES as readonly string[]).includes(unidadPedida) ? (unidadPedida as Unidad) : "pesos";

  const nombre = archivo.name.toLowerCase();
  let filas: Celda[][];
  try {
    if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
      filas = filasDeCsv(await archivo.text());
    } else if (nombre.endsWith(".xlsx")) {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(Buffer.from(await archivo.arrayBuffer()) as unknown as ArrayBuffer);
      const hoja = wb.worksheets[0];
      if (!hoja) return NextResponse.json({ error: "El Excel no tiene hojas" }, { status: 400 });
      filas = [];
      hoja.eachRow({ includeEmpty: false }, fila => {
        const celdas: Celda[] = [];
        for (let c = 1; c <= hoja.columnCount; c++) celdas.push(valorCelda(fila.getCell(c)));
        filas.push(celdas);
      });
    } else {
      return NextResponse.json({ error: "Suba la plantilla en Excel (.xlsx) o CSV." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo. ¿Está dañado o protegido con clave?" }, { status: 400 });
  }

  return NextResponse.json(leerPlantilla(filas, unidad));
}
