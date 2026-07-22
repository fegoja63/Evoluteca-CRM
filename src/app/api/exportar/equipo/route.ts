import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // select explicito: sin el, findMany carga el usuario entero en memoria
  // -passwordHash, totpSecret, codigosRespaldo, tokens de reseteo-. Hoy el
  // archivo solo escribe 5 columnas a mano, asi que no se filtra nada, pero
  // no hay razon para tener los secretos a mano aqui: el dia que alguien
  // agregue una columna volcando el objeto completo, se irian en el Excel.
  const usuarios = await prisma.usuario.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { nombre: "asc" },
    select: { nombre: true, email: true, rol: true, activo: true, creadoEn: true },
  });

  const ROL_LABEL: Record<string, string> = {
    ADMINISTRADOR: "Administrador",
    GERENTE: "Gerente",
    COMERCIAL: "Comercial",
  };

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Equipo");

  ws.columns = [
    { header: "Nombre",         key: "nombre",   width: 28 },
    { header: "Correo",         key: "email",    width: 32 },
    { header: "Rol",            key: "rol",      width: 16 },
    { header: "Estado",         key: "activo",   width: 12 },
    { header: "Fecha de alta",  key: "creadoEn", width: 16 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 20;

  for (const u of usuarios) {
    ws.addRow({
      nombre:   u.nombre,
      email:    u.email,
      rol:      ROL_LABEL[u.rol] ?? u.rol,
      activo:   u.activo ? "Activo" : "Inactivo",
      creadoEn: new Date(u.creadoEn).toLocaleDateString("es-CO"),
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
      "Content-Disposition": `attachment; filename="equipo-${hoy}.xlsx"`,
    },
  });
}
