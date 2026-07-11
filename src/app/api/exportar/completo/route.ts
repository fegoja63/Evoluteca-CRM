import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import ExcelJS from "exceljs";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Evoluteca CRM";

  // ── Una sola hoja con toda la información, igual al archivo de importación ──
  const ws = wb.addWorksheet("CRM Completo");

  ws.columns = [
    { header: "Empresa",            key: "empresa",          width: 32 },
    { header: "Sector",             key: "sector",           width: 22 },
    { header: "Email Empresa",      key: "emailEmpresa",     width: 30 },
    { header: "Teléfono Empresa",   key: "telefonoEmpresa",  width: 18 },
    { header: "Sitio Web",          key: "sitioWeb",         width: 28 },
    { header: "Etiquetas",          key: "etiquetas",        width: 22 },
    { header: "Contacto",           key: "contacto",         width: 28 },
    { header: "Email Contacto",     key: "emailContacto",    width: 30 },
    { header: "Teléfono Contacto",  key: "telefonoContacto", width: 18 },
    { header: "Cargo",              key: "cargo",            width: 20 },
    { header: "Segmento",           key: "segmento",         width: 15 },
    { header: "Título Oportunidad", key: "tituloOportunidad",width: 35 },
    { header: "Etapa",              key: "etapa",            width: 14 },
    { header: "Valor (COP)",        key: "valor",            width: 18 },
    { header: "Costo (COP)",        key: "costo",            width: 18 },
    { header: "Sede",               key: "sede",             width: 25 },
    { header: "Fecha Evento",       key: "fechaEvento",      width: 16 },
    { header: "Fecha Cierre",       key: "fechaCierre",      width: 16 },
    { header: "Origen Lead",        key: "origenLead",       width: 18 },
    { header: "Recurrente",         key: "recurrente",       width: 12 },
    { header: "Notas Empresa",      key: "notasEmpresa",     width: 40 },
    { header: "Notas Oportunidad",  key: "notasOportunidad", width: 40 },
  ];

  // Estilo encabezado
  ws.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 24;

  function fmtFecha(d: Date | null): string {
    if (!d) return "";
    return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // Traer oportunidades con todo relacionado
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);
  const oportunidades = await prisma.oportunidad.findMany({
    where: { tenantId, eliminadoEn: null, ...ownerFiltro },
    orderBy: { creadoEn: "asc" },
    include: {
      empresa: true,
      contacto: true,
    },
  });

  // Traer empresas sin oportunidades (para no perder clientes sin pipeline)
  const empresasConOportunidad = new Set(oportunidades.map(o => o.empresaId).filter(Boolean) as string[]);
  const idsConOportunidad = Array.from(empresasConOportunidad);
  const empresasSinOportunidad = await prisma.empresa.findMany({
    where: { tenantId, id: { notIn: idsConOportunidad }, ...ownerFiltro },
    orderBy: { nombre: "asc" },
    include: {
      contactos: { orderBy: { nombre: "asc" } },
    },
  });

  // Traer contactos sin oportunidad ni empresa con oportunidad
  const contactosSinOportunidad = await prisma.contacto.findMany({
    where: {
      tenantId,
      empresaId: { notIn: idsConOportunidad },
    },
    orderBy: { nombre: "asc" },
    include: { empresa: true },
  });

  // ── BLOQUE 1: Filas con oportunidades ──
  for (const o of oportunidades) {
    ws.addRow({
      empresa:          o.empresa?.nombre ?? "",
      sector:           o.empresa?.sector ?? "",
      emailEmpresa:     o.empresa?.email ?? "",
      telefonoEmpresa:  o.empresa?.telefono ?? "",
      sitioWeb:         o.empresa?.sitioWeb ?? "",
      etiquetas:        (o.empresa?.etiquetas ?? []).join(", "),
      contacto:         o.contacto?.nombre ?? "",
      emailContacto:    o.contacto?.email ?? "",
      telefonoContacto: o.contacto?.telefono ?? "",
      cargo:            o.contacto?.cargo ?? "",
      segmento:         o.contacto?.segmento ?? "",
      tituloOportunidad: o.titulo,
      etapa:            o.etapa,
      valor:            o.valor ? Number(o.valor) : "",
      costo:            o.costo ? Number(o.costo) : "",
      sede:             o.sede ?? "",
      fechaEvento:      fmtFecha(o.fechaEvento),
      fechaCierre:      fmtFecha(o.fechaCierre),
      origenLead:       o.origenLead ?? "",
      recurrente:       o.recurrente === true ? "SI" : o.recurrente === false ? "NO" : "",
      notasEmpresa:     o.empresa?.notas ?? "",
      notasOportunidad: o.notas ?? "",
    });
  }

  // ── BLOQUE 2: Empresas sin oportunidades (con sus contactos) ──
  for (const e of empresasSinOportunidad) {
    if (e.contactos.length === 0) {
      ws.addRow({
        empresa: e.nombre, sector: e.sector ?? "", emailEmpresa: e.email ?? "",
        telefonoEmpresa: e.telefono ?? "", sitioWeb: e.sitioWeb ?? "",
        etiquetas: (e.etiquetas ?? []).join(", "),
        notasEmpresa: e.notas ?? "",
      });
    } else {
      for (const c of e.contactos) {
        ws.addRow({
          empresa: e.nombre, sector: e.sector ?? "", emailEmpresa: e.email ?? "",
          telefonoEmpresa: e.telefono ?? "", sitioWeb: e.sitioWeb ?? "",
          etiquetas: (e.etiquetas ?? []).join(", "),
          contacto: c.nombre, emailContacto: c.email ?? "",
          telefonoContacto: c.telefono ?? "", cargo: c.cargo ?? "",
          segmento: c.segmento ?? "",
          notasEmpresa: e.notas ?? "",
        });
      }
    }
  }

  // ── BLOQUE 3: Contactos huérfanos ──
  for (const c of contactosSinOportunidad) {
    if (!empresasConOportunidad.has(c.empresaId ?? "")) {
      ws.addRow({
        empresa: c.empresa?.nombre ?? "",
        contacto: c.nombre, emailContacto: c.email ?? "",
        telefonoContacto: c.telefono ?? "", cargo: c.cargo ?? "",
        segmento: c.segmento ?? "",
      });
    }
  }

  // Estilo alternado en filas de datos
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", wrapText: false };
      if (rowNum % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
      }
    });
  });

  // Congelar fila de encabezado
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="evoluteca-crm-completo_${fecha}.xlsx"`,
    },
  });
}
