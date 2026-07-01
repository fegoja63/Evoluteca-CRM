import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const empresas = await prisma.empresa.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { contactos: true, oportunidades: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Clientes");

  ws.columns = [
    { header: "Nombre", key: "nombre", width: 35 },
    { header: "Email", key: "email", width: 30 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Sector", key: "sector", width: 25 },
    { header: "Sitio web", key: "sitioWeb", width: 28 },
    { header: "Contactos", key: "contactos", width: 12 },
    { header: "Propuestas", key: "oportunidades", width: 12 },
    { header: "Notas", key: "notas", width: 40 },
    { header: "Fecha creación", key: "creadoEn", width: 16 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  for (const e of empresas) {
    ws.addRow({
      nombre: e.nombre,
      email: e.email ?? "",
      telefono: e.telefono ?? "",
      sector: e.sector ?? "",
      sitioWeb: e.sitioWeb ?? "",
      contactos: e._count.contactos,
      oportunidades: e._count.oportunidades,
      notas: e.notas ?? "",
      creadoEn: new Date(e.creadoEn).toLocaleDateString("es-CO"),
    });
  }

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
      "Content-Disposition": `attachment; filename="clientes-${hoy}.xlsx"`,
    },
  });
}
