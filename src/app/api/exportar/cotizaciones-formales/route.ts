import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { numeroCotizacion } from "@/lib/cotizaciones";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const cotizaciones = await prisma.cotizacion.findMany({
    where: { tenantId: session.user.tenantId, eliminadoEn: null },
    orderBy: { numero: "desc" },
    include: {
      empresa:  { select: { nombre: true } },
      contacto: { select: { nombre: true } },
      oportunidad: { select: { titulo: true } },
      items: true,
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Cotizaciones formales");

  ws.columns = [
    { header: "N°",           key: "numero",       width: 8 },
    { header: "Estado",       key: "estado",       width: 14 },
    { header: "Cliente",      key: "cliente",      width: 30 },
    { header: "Contacto",     key: "contacto",     width: 25 },
    { header: "Oportunidad",  key: "oportunidad",  width: 30 },
    { header: "Sede",         key: "sede",         width: 25 },
    { header: "Fecha evento", key: "fechaEvento",  width: 16 },
    { header: "Validez",      key: "fechaValidez", width: 16 },
    { header: "Total (COP)",  key: "total",        width: 18 },
    { header: "Creada",       key: "creadoEn",     width: 16 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  for (const c of cotizaciones) {
    const total = c.items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
    ws.addRow({
      numero:       numeroCotizacion(c),
      estado:       c.estado,
      cliente:      c.empresa?.nombre ?? "",
      contacto:     c.contacto?.nombre ?? "",
      oportunidad:  c.oportunidad?.titulo ?? "",
      sede:         c.sede ?? "",
      fechaEvento:  c.fechaEvento ? new Date(c.fechaEvento).toLocaleDateString("es-CO") : "",
      fechaValidez: c.fechaValidez ? new Date(c.fechaValidez).toLocaleDateString("es-CO") : "",
      total,
      creadoEn:     new Date(c.creadoEn).toLocaleDateString("es-CO"),
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
      "Content-Disposition": `attachment; filename="cotizaciones-formales-${hoy}.xlsx"`,
    },
  });
}
