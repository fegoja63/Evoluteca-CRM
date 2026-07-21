import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import ExcelJS from "exceljs";

const PLANTILLAS: Record<string, { hoja: string; columnas: { header: string; key: string; width: number; ejemplo: string }[] }> = {
  empresas: {
    hoja: "Empresas",
    columnas: [
      { header: "Nombre *", key: "nombre", width: 30, ejemplo: "Empresa ABC S.A.S" },
      { header: "Sector", key: "sector", width: 20, ejemplo: "Tecnología" },
      { header: "Teléfono", key: "telefono", width: 18, ejemplo: "601 123 4567" },
      { header: "Sitio Web", key: "sitioWeb", width: 30, ejemplo: "www.empresaabc.com" },
      { header: "Notas", key: "notas", width: 40, ejemplo: "Cliente desde 2020" },
    ],
  },
  contactos: {
    hoja: "Contactos",
    columnas: [
      { header: "Nombre *", key: "nombre", width: 30, ejemplo: "Juan Pérez García" },
      { header: "Email", key: "email", width: 30, ejemplo: "juan@empresa.com" },
      { header: "Teléfono", key: "telefono", width: 18, ejemplo: "300 123 4567" },
      { header: "Cargo", key: "cargo", width: 20, ejemplo: "Gerente Comercial" },
      { header: "Empresa", key: "empresa", width: 25, ejemplo: "Empresa ABC S.A.S" },
      { header: "Segmento", key: "segmento", width: 15, ejemplo: "INDIVIDUAL" },
      { header: "Notas", key: "notas", width: 40, ejemplo: "Contacto principal" },
    ],
  },
  pipeline: {
    hoja: "Pipeline",
    columnas: [
      { header: "Título *", key: "titulo", width: 35, ejemplo: "Proyecto Web Empresa ABC" },
      { header: "Etapa", key: "etapa", width: 15, ejemplo: "PROSPECTO" },
      { header: "Valor (USD)", key: "valor", width: 15, ejemplo: "5000" },
      { header: "Empresa", key: "empresa", width: 25, ejemplo: "Empresa ABC S.A.S" },
      { header: "Notas", key: "notas", width: 40, ejemplo: "Reunión pendiente" },
    ],
  },
  espectadores: {
    hoja: "Audiencia",
    columnas: [
      { header: "Nombre *", key: "nombre", width: 30, ejemplo: "María López" },
      { header: "Email", key: "email", width: 30, ejemplo: "maria@email.com" },
      { header: "Teléfono", key: "telefono", width: 18, ejemplo: "310 987 6543" },
      { header: "Segmento", key: "segmento", width: 15, ejemplo: "INDIVIDUAL" },
      { header: "Notas", key: "notas", width: 40, ejemplo: "Asistente frecuente" },
    ],
  },
};

export async function GET(request: Request, props: { params: Promise<{ modulo: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const plantilla = PLANTILLAS[params.modulo];
  if (!plantilla) return NextResponse.json({ error: "Módulo no válido" }, { status: 400 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Evoluteca CRM";
  const ws = wb.addWorksheet(plantilla.hoja);

  ws.columns = plantilla.columnas.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  // Estilo encabezado
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 22;

  // Fila de ejemplo
  const ejemplo: Record<string, string> = {};
  plantilla.columnas.forEach((c) => { ejemplo[c.key] = c.ejemplo; });
  const filaEjemplo = ws.addRow(ejemplo);
  filaEjemplo.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF888888" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };
  });

  // Nota en fila 3
  ws.getCell("A3").value = "⬆ Elimina la fila de ejemplo antes de importar. Los campos con * son obligatorios.";
  ws.getCell("A3").font = { color: { argb: "FFCC0000" }, italic: true, size: 9 };
  ws.mergeCells(`A3:G3`);

  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla_${params.modulo}.xlsx"`,
    },
  });
}
