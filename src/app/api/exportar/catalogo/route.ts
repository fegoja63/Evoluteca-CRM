import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";
import { formatoFecha, fechaISO } from "@/lib/fecha-bogota";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const productos = await prisma.producto.findMany({
    where: { tenantId: session.user.tenantId, activo: true },
    orderBy: { nombre: "asc" },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Catálogo");

  ws.columns = [
    { header: "Nombre",       key: "nombre",      width: 35 },
    { header: "Descripción",  key: "descripcion", width: 45 },
    { header: "Precio base (COP)", key: "precio", width: 20 },
    { header: "Creado",       key: "creadoEn",    width: 16 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  for (const p of productos) {
    ws.addRow({
      nombre:      p.nombre,
      descripcion: p.descripcion ?? "",
      precio:      Number(p.precioBase),
      creadoEn:    formatoFecha(new Date(p.creadoEn)),
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
  const hoy = fechaISO(new Date());

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="catalogo-${hoy}.xlsx"`,
    },
  });
}
