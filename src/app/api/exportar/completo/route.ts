import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Evoluteca CRM";

  const cabecera = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;
  };

  // ── Hoja 1: Clientes ──
  const empresas = await prisma.empresa.findMany({
    where: { tenantId },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { contactos: true, oportunidades: true } } },
  });
  const wsEmp = wb.addWorksheet("Clientes");
  wsEmp.columns = [
    { header: "Nombre",        key: "nombre",      width: 32 },
    { header: "Sector",        key: "sector",      width: 22 },
    { header: "Email",         key: "email",       width: 30 },
    { header: "Teléfono",      key: "telefono",    width: 18 },
    { header: "Sitio Web",     key: "sitioWeb",    width: 30 },
    { header: "Etiquetas",     key: "etiquetas",   width: 25 },
    { header: "Notas",         key: "notas",       width: 40 },
    { header: "Contactos",     key: "nContactos",  width: 12 },
    { header: "Oportunidades", key: "nOpors",      width: 16 },
    { header: "Creado en",     key: "creadoEn",    width: 18 },
  ];
  empresas.forEach((e) => wsEmp.addRow({
    nombre: e.nombre, sector: e.sector, email: e.email,
    telefono: e.telefono, sitioWeb: e.sitioWeb,
    etiquetas: (e.etiquetas ?? []).join(", "),
    notas: e.notas,
    nContactos: e._count.contactos,
    nOpors: e._count.oportunidades,
    creadoEn: new Date(e.creadoEn).toLocaleDateString("es-CO"),
  }));
  cabecera(wsEmp);

  // ── Hoja 2: Contactos ──
  const contactos = await prisma.contacto.findMany({
    where: { tenantId },
    orderBy: { nombre: "asc" },
    include: { empresa: { select: { nombre: true } } },
  });
  const wsCon = wb.addWorksheet("Contactos");
  wsCon.columns = [
    { header: "Nombre",   key: "nombre",   width: 30 },
    { header: "Email",    key: "email",    width: 30 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Cargo",    key: "cargo",    width: 20 },
    { header: "Empresa",  key: "empresa",  width: 28 },
    { header: "Segmento", key: "segmento", width: 15 },
    { header: "Notas",    key: "notas",    width: 40 },
  ];
  contactos.forEach((c) => wsCon.addRow({
    nombre: c.nombre, email: c.email, telefono: c.telefono,
    cargo: c.cargo, empresa: c.empresa?.nombre,
    segmento: c.segmento, notas: c.notas,
  }));
  cabecera(wsCon);

  // ── Hoja 3: Pipeline ──
  const oportunidades = await prisma.oportunidad.findMany({
    where: { tenantId },
    orderBy: { creadoEn: "desc" },
    include: {
      empresa: { select: { nombre: true } },
      contacto: { select: { nombre: true } },
    },
  });
  const wsOp = wb.addWorksheet("Pipeline");
  wsOp.columns = [
    { header: "Título",      key: "titulo",    width: 35 },
    { header: "Etapa",       key: "etapa",     width: 15 },
    { header: "Valor (COP)", key: "valor",     width: 18 },
    { header: "Empresa",     key: "empresa",   width: 28 },
    { header: "Contacto",    key: "contacto",  width: 28 },
    { header: "Notas",       key: "notas",     width: 40 },
    { header: "Creado en",   key: "creadoEn",  width: 18 },
  ];
  oportunidades.forEach((o) => wsOp.addRow({
    titulo: o.titulo, etapa: o.etapa,
    valor: o.valor ? Number(o.valor) : null,
    empresa: o.empresa?.nombre, contacto: o.contacto?.nombre,
    notas: o.notas,
    creadoEn: new Date(o.creadoEn).toLocaleDateString("es-CO"),
  }));
  cabecera(wsOp);

  // ── Hoja 4: Actividades ──
  const actividades = await prisma.actividad.findMany({
    where: { tenantId },
    orderBy: { fecha: "asc" },
    include: {
      empresa: { select: { nombre: true } },
      contacto: { select: { nombre: true } },
    },
  });
  const wsAct = wb.addWorksheet("Actividades");
  wsAct.columns = [
    { header: "Título",     key: "titulo",     width: 35 },
    { header: "Tipo",       key: "tipo",       width: 12 },
    { header: "Fecha",      key: "fecha",      width: 22 },
    { header: "Completada", key: "completada", width: 12 },
    { header: "Empresa",    key: "empresa",    width: 28 },
    { header: "Contacto",   key: "contacto",   width: 28 },
    { header: "Notas",      key: "notas",      width: 40 },
  ];
  actividades.forEach((a) => wsAct.addRow({
    titulo: a.titulo, tipo: a.tipo,
    fecha: new Date(a.fecha).toLocaleString("es-CO"),
    completada: a.completada ? "Sí" : "No",
    empresa: a.empresa?.nombre, contacto: a.contacto?.nombre,
    notas: a.notas,
  }));
  cabecera(wsAct);

  // ── Hoja 5: Cotizaciones ──
  const cotizaciones = await prisma.cotizacion.findMany({
    where: { tenantId },
    orderBy: { numero: "desc" },
    include: { empresa: { select: { nombre: true } }, items: true },
  });
  const wsCot = wb.addWorksheet("Cotizaciones");
  wsCot.columns = [
    { header: "# Cotización",     key: "numero",      width: 14 },
    { header: "Estado",           key: "estado",      width: 14 },
    { header: "Empresa",          key: "empresa",     width: 28 },
    { header: "Descripción ítem", key: "descripcion", width: 35 },
    { header: "Cantidad",         key: "cantidad",    width: 12 },
    { header: "Precio unit (COP)",key: "precio",      width: 20 },
    { header: "Subtotal (COP)",   key: "subtotal",    width: 18 },
    { header: "Notas",            key: "notas",       width: 40 },
    { header: "Fecha validez",    key: "fechaValidez",width: 18 },
    { header: "Creado en",        key: "creadoEn",    width: 18 },
  ];
  cotizaciones.forEach((c) => {
    if (c.items.length === 0) {
      wsCot.addRow({
        numero: c.numero, estado: c.estado,
        empresa: c.empresa?.nombre,
        descripcion: "", cantidad: null, precio: null, subtotal: null,
        notas: c.notas,
        fechaValidez: c.fechaValidez ? new Date(c.fechaValidez).toLocaleDateString("es-CO") : "",
        creadoEn: new Date(c.creadoEn).toLocaleDateString("es-CO"),
      });
    } else {
      c.items.forEach((it, idx) => wsCot.addRow({
        numero: idx === 0 ? c.numero : "",
        estado: idx === 0 ? c.estado : "",
        empresa: idx === 0 ? c.empresa?.nombre : "",
        descripcion: it.descripcion,
        cantidad: it.cantidad,
        precio: Number(it.precioUnit),
        subtotal: it.cantidad * Number(it.precioUnit),
        notas: idx === 0 ? c.notas : "",
        fechaValidez: idx === 0 && c.fechaValidez ? new Date(c.fechaValidez).toLocaleDateString("es-CO") : "",
        creadoEn: idx === 0 ? new Date(c.creadoEn).toLocaleDateString("es-CO") : "",
      }));
    }
  });
  cabecera(wsCot);

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="evoluteca-crm-completo_${fecha}.xlsx"`,
    },
  });
}
