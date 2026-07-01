import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const funciones = await prisma.funcion.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { fecha: "desc" },
    include: { _count: { select: { npsList: true } } },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Funciones");

  ws.columns = [
    { header: "Función / Obra", key: "titulo", width: 35 },
    { header: "Fecha", key: "fecha", width: 20 },
    { header: "Canal", key: "canal", width: 14 },
    { header: "Sillas totales", key: "sillasTotales", width: 16 },
    { header: "Sillas vendidas", key: "sillasVendidas", width: 16 },
    { header: "Ocupación %", key: "ocupacion", width: 14 },
    { header: "Ingreso estimado (COP)", key: "ingreso", width: 22 },
    { header: "NPS (respuestas)", key: "nps", width: 18 },
    { header: "Notas", key: "notas", width: 35 },
  ];

  ws.getRow(1).eachCell(cell => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  const CANAL: Record<string, string> = { PLATAFORMA: "Plataforma", TAQUILLA: "Taquilla", INVITADOS: "Invitados", EMPRESA: "Empresa" };

  for (const f of funciones) {
    const pct = f.sillasTotales > 0 ? Math.round((f.sillasVendidas / f.sillasTotales) * 100) : 0;
    const row = ws.addRow({
      titulo: f.titulo,
      fecha: new Date(f.fecha).toLocaleString("es-CO"),
      canal: CANAL[f.canal] ?? f.canal,
      sillasTotales: f.sillasTotales,
      sillasVendidas: f.sillasVendidas,
      ocupacion: pct,
      ingreso: f.ingresoEstimado ? Number(f.ingresoEstimado) : "",
      nps: f._count.npsList,
      notas: f.notas ?? "",
    });
    if (f.ingresoEstimado) row.getCell("ingreso").numFmt = "#,##0";
    row.getCell("ocupacion").numFmt = '0"%"';
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
      "Content-Disposition": `attachment; filename="funciones-${hoy}.xlsx"`,
    },
  });
}
