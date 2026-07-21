import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import ExcelJS from "exceljs";

export async function GET(request: Request, props: { params: Promise<{ modulo: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const tenantId = session.user.tenantId;
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Evoluteca CRM";

  const estilo = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;
  };

  switch (params.modulo) {
    case "empresas": {
      const datos = await prisma.empresa.findMany({
        where: { tenantId, ...ownerFiltro },
        orderBy: { nombre: "asc" },
        include: { _count: { select: { contactos: true } } },
      });
      const ws = wb.addWorksheet("Empresas");
      ws.columns = [
        { header: "Nombre", key: "nombre", width: 30 },
        { header: "Sector", key: "sector", width: 20 },
        { header: "Teléfono", key: "telefono", width: 18 },
        { header: "Sitio Web", key: "sitioWeb", width: 30 },
        { header: "Contactos", key: "contactos", width: 12 },
        { header: "Notas", key: "notas", width: 40 },
        { header: "Creado en", key: "creadoEn", width: 20 },
      ];
      datos.forEach((e) => ws.addRow({
        nombre: e.nombre, sector: e.sector, telefono: e.telefono,
        sitioWeb: e.sitioWeb, contactos: e._count.contactos,
        notas: e.notas, creadoEn: new Date(e.creadoEn).toLocaleDateString("es-CO"),
      }));
      estilo(ws);
      break;
    }
    case "contactos": {
      const datos = await prisma.contacto.findMany({
        where: { tenantId },
        orderBy: { nombre: "asc" },
        include: { empresa: { select: { nombre: true } } },
      });
      const ws = wb.addWorksheet("Contactos");
      ws.columns = [
        { header: "Nombre", key: "nombre", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Teléfono", key: "telefono", width: 18 },
        { header: "Cargo", key: "cargo", width: 20 },
        { header: "Empresa", key: "empresa", width: 25 },
        { header: "Segmento", key: "segmento", width: 15 },
        { header: "Notas", key: "notas", width: 40 },
      ];
      datos.forEach((c) => ws.addRow({
        nombre: c.nombre, email: c.email, telefono: c.telefono,
        cargo: c.cargo, empresa: c.empresa?.nombre,
        segmento: c.segmento, notas: c.notas,
      }));
      estilo(ws);
      break;
    }
    case "pipeline": {
      const datos = await prisma.oportunidad.findMany({
        where: { tenantId, eliminadoEn: null, ...ownerFiltro },
        orderBy: { creadoEn: "desc" },
        include: {
          empresa: { select: { nombre: true } },
          contacto: { select: { nombre: true } },
        },
      });
      const ws = wb.addWorksheet("Pipeline");
      ws.columns = [
        { header: "Título", key: "titulo", width: 35 },
        { header: "Etapa", key: "etapa", width: 15 },
        { header: "Valor (USD)", key: "valor", width: 15 },
        { header: "Empresa", key: "empresa", width: 25 },
        { header: "Contacto", key: "contacto", width: 25 },
        { header: "Notas", key: "notas", width: 40 },
        { header: "Creado en", key: "creadoEn", width: 20 },
      ];
      datos.forEach((o) => ws.addRow({
        titulo: o.titulo, etapa: o.etapa, valor: o.valor ? Number(o.valor) : null,
        empresa: o.empresa?.nombre, contacto: o.contacto?.nombre,
        notas: o.notas, creadoEn: new Date(o.creadoEn).toLocaleDateString("es-CO"),
      }));
      estilo(ws);
      break;
    }
    case "agenda": {
      const datos = await prisma.actividad.findMany({
        where: { tenantId, ...ownerFiltro },
        orderBy: { fecha: "asc" },
        include: {
          empresa: { select: { nombre: true } },
          contacto: { select: { nombre: true } },
        },
      });
      const ws = wb.addWorksheet("Agenda");
      ws.columns = [
        { header: "Título", key: "titulo", width: 35 },
        { header: "Tipo", key: "tipo", width: 12 },
        { header: "Fecha", key: "fecha", width: 20 },
        { header: "Completada", key: "completada", width: 14 },
        { header: "Empresa", key: "empresa", width: 25 },
        { header: "Contacto", key: "contacto", width: 25 },
        { header: "Notas", key: "notas", width: 40 },
      ];
      datos.forEach((a) => ws.addRow({
        titulo: a.titulo, tipo: a.tipo,
        fecha: new Date(a.fecha).toLocaleString("es-CO"),
        completada: a.completada ? "Sí" : "No",
        empresa: a.empresa?.nombre, contacto: a.contacto?.nombre,
        notas: a.notas,
      }));
      estilo(ws);
      break;
    }
    case "cotizaciones": {
      const datos = await prisma.cotizacion.findMany({
        where: { tenantId, eliminadoEn: null },
        orderBy: { creadoEn: "desc" },
        include: {
          empresa: { select: { nombre: true } },
          items: true,
        },
      });
      const ws = wb.addWorksheet("Cotizaciones");
      ws.columns = [
        { header: "# Cotización", key: "numero", width: 14 },
        { header: "Estado", key: "estado", width: 14 },
        { header: "Empresa", key: "empresa", width: 25 },
        { header: "Descripción ítem", key: "descripcion", width: 35 },
        { header: "Cantidad", key: "cantidad", width: 12 },
        { header: "Precio unit. (USD)", key: "precio", width: 18 },
        { header: "Subtotal (USD)", key: "subtotal", width: 16 },
        { header: "Notas", key: "notas", width: 40 },
      ];
      datos.forEach((c) => {
        c.items.forEach((it) => ws.addRow({
          numero: c.numero, estado: c.estado,
          empresa: c.empresa?.nombre,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio: Number(it.precioUnit),
          subtotal: it.cantidad * Number(it.precioUnit),
          notas: c.notas,
        }));
      });
      estilo(ws);
      break;
    }
    case "espectadores": {
      const datos = await prisma.espectador.findMany({
        where: { tenantId },
        orderBy: { nombre: "asc" },
      });
      const ws = wb.addWorksheet("Audiencia");
      ws.columns = [
        { header: "Nombre", key: "nombre", width: 30 },
        { header: "Email", key: "email", width: 30 },
        { header: "Teléfono", key: "telefono", width: 18 },
        { header: "Segmento", key: "segmento", width: 15 },
        { header: "Notas", key: "notas", width: 40 },
      ];
      datos.forEach((e) => ws.addRow({
        nombre: e.nombre, email: e.email,
        telefono: e.telefono, segmento: e.segmento, notas: e.notas,
      }));
      estilo(ws);
      break;
    }
    case "funciones": {
      const datos = await prisma.funcion.findMany({
        where: { tenantId },
        orderBy: { fecha: "desc" },
      });
      const ws = wb.addWorksheet("Funciones");
      ws.columns = [
        { header: "Título / Obra", key: "titulo", width: 35 },
        { header: "Fecha", key: "fecha", width: 20 },
        { header: "Sillas totales", key: "sillasTotales", width: 15 },
        { header: "Sillas vendidas", key: "sillasVendidas", width: 16 },
        { header: "% Ocupación", key: "ocupacion", width: 14 },
        { header: "Canal", key: "canal", width: 14 },
        { header: "Ingreso estimado (COP)", key: "ingreso", width: 22 },
        { header: "Notas", key: "notas", width: 40 },
      ];
      datos.forEach((f) => ws.addRow({
        titulo: f.titulo,
        fecha: new Date(f.fecha).toLocaleString("es-CO"),
        sillasTotales: f.sillasTotales,
        sillasVendidas: f.sillasVendidas,
        ocupacion: f.sillasTotales > 0 ? `${Math.round((f.sillasVendidas / f.sillasTotales) * 100)}%` : "0%",
        canal: f.canal,
        ingreso: f.ingresoEstimado ? Number(f.ingresoEstimado) : null,
        notas: f.notas,
      }));
      estilo(ws);
      break;
    }
    default:
      return NextResponse.json({ error: "Módulo no válido" }, { status: 400 });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const nombreArchivo = `${params.modulo}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
