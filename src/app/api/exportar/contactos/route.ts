import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const contactos = await prisma.contacto.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { nombre: "asc" },
    include: {
      empresa: { select: { nombre: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Contactos");

  ws.columns = [
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Email", key: "email", width: 30 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Cargo", key: "cargo", width: 22 },
    { header: "Empresa / Cliente", key: "empresa", width: 30 },
    { header: "Notas", key: "notas", width: 40 },
    { header: "Fecha creación", key: "creadoEn", width: 16 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  for (const c of contactos) {
    ws.addRow({
      nombre: c.nombre,
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      cargo: c.cargo ?? "",
      empresa: c.empresa?.nombre ?? "",
      notas: c.notas ?? "",
      creadoEn: new Date(c.creadoEn).toLocaleDateString("es-CO"),
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
      "Content-Disposition": `attachment; filename="contactos-${hoy}.xlsx"`,
    },
  });
}
