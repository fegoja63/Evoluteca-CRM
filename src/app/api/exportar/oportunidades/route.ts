import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const oportunidades = await prisma.oportunidad.findMany({
    where: {
      tenantId: session.user.tenantId,
      eliminadoEn: null,
      etapa: { notIn: ["GANADA", "PERDIDA"] },
      ...filtroOwner(session.user.rol, session.user.id),
    },
    orderBy: [{ etapa: "asc" }, { fechaEvento: "asc" }],
    include: {
      empresa: { select: { nombre: true } },
      contacto: { select: { nombre: true, email: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Negocios en negociación");

  ws.columns = [
    { header: "Empresa / Cliente", key: "empresa", width: 30 },
    { header: "Contacto", key: "contacto", width: 25 },
    { header: "Email", key: "email", width: 28 },
    { header: "Tipo de evento / Negocio", key: "titulo", width: 35 },
    { header: "Etapa", key: "etapa", width: 14 },
    { header: "Fecha del evento", key: "fechaEvento", width: 18 },
    { header: "Sede / Sala", key: "sede", width: 20 },
    { header: "Segmento", key: "segmento", width: 15 },
    { header: "Valor cotizado (COP)", key: "valor", width: 22 },
  ];

  // Estilo de encabezado
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  const ETAPA_LABEL: Record<string, string> = {
    PROSPECTO: "Prospecto",
    CALIFICADO: "Calificado",
    PROPUESTA: "Cotización",
    NEGOCIACION: "Negociación",
  };

  for (const op of oportunidades) {
    const row = ws.addRow({
      empresa: op.empresa?.nombre ?? "",
      contacto: op.contacto?.nombre ?? "",
      email: op.contacto?.email ?? "",
      titulo: op.titulo,
      etapa: ETAPA_LABEL[op.etapa] ?? op.etapa,
      fechaEvento: op.fechaEvento ? new Date(op.fechaEvento).toLocaleDateString("es-CO") : "",
      sede: op.sede ?? "",
      segmento: op.segmento ?? "",
      valor: op.valor ? Number(op.valor) : "",
    });
    // Formato moneda en columna valor
    if (op.valor) {
      row.getCell("valor").numFmt = '#,##0';
    }
  }

  // Fila de totales
  const totalRow = ws.addRow({
    empresa: "TOTAL",
    valor: oportunidades.reduce((acc, o) => acc + Number(o.valor ?? 0), 0),
  });
  totalRow.font = { bold: true };
  totalRow.getCell("valor").numFmt = '#,##0';

  // Bordes
  ws.eachRow((row, rn) => {
    if (rn === 1) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const hoy = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="negocios-activos-${hoy}.xlsx"`,
    },
  });
}
