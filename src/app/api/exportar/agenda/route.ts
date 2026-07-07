import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const actividades = await prisma.actividad.findMany({
    where: { tenantId: session.user.tenantId, ...filtroOwner(session.user.rol, session.user.id) },
    orderBy: { fecha: "asc" },
    include: {
      empresa:     { select: { nombre: true } },
      contacto:    { select: { nombre: true } },
      oportunidad: { select: { titulo: true } },
    },
  });

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Agenda");

  ws.columns = [
    { header: "Tipo",        key: "tipo",        width: 14 },
    { header: "Título",      key: "titulo",      width: 35 },
    { header: "Fecha",       key: "fecha",       width: 20 },
    { header: "Estado",      key: "estado",      width: 14 },
    { header: "Empresa",     key: "empresa",     width: 28 },
    { header: "Contacto",    key: "contacto",    width: 25 },
    { header: "Oportunidad", key: "oportunidad", width: 30 },
    { header: "Notas",       key: "notas",       width: 40 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  for (const a of actividades) {
    ws.addRow({
      tipo:        a.tipo,
      titulo:      a.titulo,
      fecha:       new Date(a.fecha).toLocaleString("es-CO"),
      estado:      a.completada ? "Completada" : "Pendiente",
      empresa:     a.empresa?.nombre ?? "",
      contacto:    a.contacto?.nombre ?? "",
      oportunidad: a.oportunidad?.titulo ?? "",
      notas:       a.notas ?? "",
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
      "Content-Disposition": `attachment; filename="agenda-${hoy}.xlsx"`,
    },
  });
}
