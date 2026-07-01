import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const espectadores = await prisma.espectador.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { npsList: true } } },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Audiencia");

  ws.columns = [
    { header: "Nombre", key: "nombre", width: 30 },
    { header: "Email", key: "email", width: 30 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Segmento", key: "segmento", width: 14 },
    { header: "NPS (respuestas)", key: "nps", width: 18 },
    { header: "Notas", key: "notas", width: 35 },
    { header: "Fecha registro", key: "fecha", width: 18 },
  ];

  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  const SEG: Record<string, string> = { INDIVIDUAL: "Individual", GRUPO: "Grupo", EMPRESA: "Empresa", COLEGIO: "Colegio" };

  for (const e of espectadores) {
    ws.addRow({
      nombre: e.nombre,
      email: e.email ?? "",
      telefono: e.telefono ?? "",
      segmento: SEG[e.segmento] ?? e.segmento,
      nps: e._count.npsList,
      notas: e.notas ?? "",
      fecha: new Date(e.creadoEn).toLocaleDateString("es-CO"),
    });
  }

  ws.eachRow((row, rn) => {
    if (rn === 1) return;
    row.eachCell(cell => {
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
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="audiencia-${hoy}.xlsx"`,
    },
  });
}
