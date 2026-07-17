import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { MODALIDAD_LABEL, numeroCotizacion } from "@/lib/cotizaciones";
import { seccionesCotizacion } from "@/lib/cuerpo-cotizacion";
import React from "react";

export const dynamic = "force-dynamic";

const styles = StyleSheet.create({
  page:        { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b", backgroundColor: "#ffffff" },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: "#2563eb" },
  logoBox:     { backgroundColor: "#1e3a8a", borderRadius: 6, padding: 8, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  logoText:    { color: "#ffffff", fontSize: 20, fontFamily: "Helvetica-Bold" },
  tenantName:  { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#0f172a", marginBottom: 3 },
  tenantSub:   { fontSize: 7.5, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5 },
  cotNumBox:   { alignItems: "flex-end" },
  cotLabel:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#2563eb", letterSpacing: 2, marginBottom: 3 },
  cotNum:      { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  cotMeta:     { fontSize: 7.5, color: "#64748b", marginTop: 3 },
  badge:       { backgroundColor: "#dbeafe", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, marginTop: 5 },
  badgeText:   { fontSize: 8, color: "#1d4ed8", fontFamily: "Helvetica-Bold" },
  section:     { marginBottom: 20 },
  sectionTitle:{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  grid2:       { flexDirection: "row", gap: 16 },
  infoBox:     { flex: 1, backgroundColor: "#f8fafc", borderRadius: 6, padding: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  infoLabel:   { fontSize: 7, color: "#94a3b8", marginBottom: 2 },
  infoValue:   { fontSize: 9, color: "#1e293b", fontFamily: "Helvetica-Bold" },
  table:       { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, overflow: "hidden" },
  tableHead:   { flexDirection: "row", backgroundColor: "#f1f5f9", paddingVertical: 8, paddingHorizontal: 12 },
  tableHeadTx: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase" },
  tableRow:    { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  tableRowAlt: { backgroundColor: "#f8fafc" },
  colDesc:     { flex: 4 },
  colNum:      { flex: 1, textAlign: "right" },
  cellTx:      { fontSize: 9, color: "#374151" },
  totalBox:    { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totalInner:  { backgroundColor: "#1e3a8a", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: "flex-end" },
  totalLabel:  { fontSize: 8, color: "#93c5fd", marginBottom: 2 },
  totalValue:  { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  notesBox:    { backgroundColor: "#fefce8", borderRadius: 6, padding: 12, borderWidth: 1, borderColor: "#fde68a", marginTop: 20 },
  notesLabel:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#92400e", marginBottom: 4 },
  notesTx:     { fontSize: 9, color: "#78350f" },
  condBox:     { backgroundColor: "#f8fafc", borderRadius: 6, padding: 12, borderWidth: 1, borderColor: "#e2e8f0", marginTop: 20 },
  condLabel:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  condLi:      { flexDirection: "row", marginBottom: 4 },
  condBullet:  { width: 10, fontSize: 9, color: "#64748b" },
  condTx:      { flex: 1, fontSize: 8.5, color: "#475569", lineHeight: 1.4 },
  condStrong:  { fontFamily: "Helvetica-Bold", color: "#334155" },
  footer:      { position: "absolute", bottom: 28, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8 },
  footerTx:    { fontSize: 7, color: "#94a3b8" },
});

const ESTADO: Record<string, string> = { BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada" };

// Renderiza una sección del cuerpo de cotización (título + contenido). Cada
// salto de línea del contenido se muestra como un punto/párrafo aparte. Si el
// contenido es una sola línea, se muestra como un párrafo simple sin viñeta.
function SeccionCotBox({ titulo, contenido }: { titulo: string; contenido: string }) {
  const lineas = contenido.split("\n").map(l => l.trim()).filter(Boolean);
  return React.createElement(View, { style: styles.condBox, wrap: false },
    titulo ? React.createElement(Text, { style: styles.condLabel }, titulo) : null,
    ...(lineas.length > 1
      ? lineas.map((linea, i) => React.createElement(View, { key: i, style: styles.condLi },
          React.createElement(Text, { style: styles.condBullet }, "•"),
          React.createElement(Text, { style: styles.condTx }, linea),
        ))
      : lineas.map((linea, i) => React.createElement(Text, { key: i, style: styles.condTx }, linea))
    ),
  );
}

function fmt(v: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
}
function fmtFecha(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" });
}
// Para fechas de CALENDARIO (fechaEvento, fechaValidez): se guardan como medianoche
// UTC del día elegido en un <input type="date">. Formatearlas en hora local las
// corre un día atrás en timezones detrás de UTC (Colombia es UTC-5). fmtFecha()
// sigue usándose tal cual para "Emitida" (creadoEn), que sí es un instante real
// donde la hora local es la correcta.
function fmtFechaCalendario(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("No autorizado", { status: 401 });

  const cot = await prisma.cotizacion.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId, eliminadoEn: null },
    include: {
      empresa:     { select: { nombre: true, email: true, telefono: true } },
      contacto:    { select: { nombre: true, email: true, cargo: true } },
      oportunidad: { select: { titulo: true } },
      items:       { orderBy: { id: "asc" } },
      lineasAhorro:{ orderBy: { id: "asc" } },
      tenant:      { select: { nombre: true, logoUrl: true, cuerpoCotizacion: true } },
    },
  });
  if (!cot) return new NextResponse("No encontrada", { status: 404 });

  const esFijo = !cot.modalidad || cot.modalidad === "FEE_FIJO";
  const subtotal = cot.items.reduce((acc, i) => acc + i.cantidad * Number(i.precioUnit), 0);
  const pctImpuesto = Number(cot.impuestoPorcentaje ?? 0);
  const valorImpuesto = subtotal * (pctImpuesto / 100);
  const pctImpuesto2 = Number(cot.impuesto2Porcentaje ?? 0);
  const valorImpuesto2 = subtotal * (pctImpuesto2 / 100);
  const total = subtotal + valorImpuesto + valorImpuesto2;

  // Modalidad de honorarios (success fee / fee mensual). En el servidor los
  // montos son Decimal de Prisma, por eso se calcula inline con Number().
  const ahorroMes = (cot.lineasAhorro ?? []).reduce((a, l) => a + Number(l.ahorroEstimadoMensual), 0);
  const pctHon = Number(cot.porcentajeHonorarios ?? 0);
  const mesesHz = cot.horizonteMeses ?? 0;
  const feeMes = Number(cot.feeMensual ?? 0);
  const valorContrato = cot.modalidad === "SUCCESS_FEE" ? ahorroMes * (pctHon / 100) * mesesHz
    : cot.modalidad === "FEE_MENSUAL" ? feeMes * mesesHz
    : total;

  // Si el logo configurado no carga (URL rota, host caído, no es una imagen),
  // @react-pdf/renderer puede lanzar una excepción no controlada dentro de
  // renderToBuffer y tumbar la ruta con un 500. Se valida antes de intentar
  // usarlo y, si falla, se cae al placeholder en vez de romper el PDF.
  let logoUrl: string | null = null;
  if (cot.tenant.logoUrl?.startsWith("data:image/")) {
    // Logo subido como archivo (base64) — ya validado al guardarlo, no hace
    // falta (ni se puede) verificarlo con un fetch de red.
    logoUrl = cot.tenant.logoUrl;
  } else if (cot.tenant.logoUrl) {
    try {
      const check = await fetch(cot.tenant.logoUrl, { method: "GET", signal: AbortSignal.timeout(4000) });
      const contentType = check.headers.get("content-type") ?? "";
      if (check.ok && contentType.startsWith("image/")) logoUrl = cot.tenant.logoUrl;
    } catch {
      // logo inválido o inalcanzable — se usa el placeholder
    }
  }

  const numEtiqueta = numeroCotizacion(cot);
  const doc = React.createElement(Document, { title: `Cotización ${numEtiqueta}` },
    React.createElement(Page, { size: "A4", style: styles.page },

      // Header
      React.createElement(View, { style: styles.header },
        React.createElement(View, { style: { flexDirection: "row", alignItems: "center", gap: 10 } },
          logoUrl
            ? React.createElement(Image, { src: logoUrl, style: { width: 44, height: 44, objectFit: "contain" } })
            : React.createElement(View, { style: styles.logoBox },
                React.createElement(Text, { style: styles.logoText }, "E")
              ),
          React.createElement(View, null,
            React.createElement(Text, { style: styles.tenantName }, cot.tenant.nombre),
            React.createElement(Text, { style: styles.tenantSub }, "Propuesta comercial")
          )
        ),
        React.createElement(View, { style: styles.cotNumBox },
          React.createElement(Text, { style: styles.cotLabel }, "COTIZACIÓN"),
          React.createElement(Text, { style: styles.cotNum }, `N.º ${numEtiqueta.replace(/^#/, "")}`),
          React.createElement(Text, { style: styles.cotMeta }, `Emitida el ${fmtFecha(cot.creadoEn)}`),
          React.createElement(View, { style: styles.badge },
            React.createElement(Text, { style: styles.badgeText }, ESTADO[cot.estado] ?? cot.estado)
          )
        )
      ),

      // Datos
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Información"),
        React.createElement(View, { style: styles.grid2 },
          React.createElement(View, { style: styles.infoBox },
            React.createElement(Text, { style: styles.infoLabel }, "Cliente"),
            React.createElement(Text, { style: styles.infoValue }, cot.empresa?.nombre ?? "—"),
            cot.empresa?.email ? React.createElement(Text, { style: { fontSize: 8, color: "#64748b", marginTop: 2 } }, cot.empresa.email) : null,
            cot.empresa?.telefono ? React.createElement(Text, { style: { fontSize: 8, color: "#64748b" } }, cot.empresa.telefono) : null,
          ),
          React.createElement(View, { style: styles.infoBox },
            React.createElement(Text, { style: styles.infoLabel }, "Contacto"),
            React.createElement(Text, { style: styles.infoValue }, cot.contacto?.nombre ?? "—"),
            cot.contacto?.cargo ? React.createElement(Text, { style: { fontSize: 8, color: "#64748b", marginTop: 2 } }, cot.contacto.cargo) : null,
            cot.contacto?.email ? React.createElement(Text, { style: { fontSize: 8, color: "#64748b" } }, cot.contacto.email) : null,
          ),
          React.createElement(View, { style: styles.infoBox },
            React.createElement(Text, { style: styles.infoLabel }, "Evento / Sede"),
            React.createElement(Text, { style: styles.infoValue }, cot.sede ?? "—"),
            React.createElement(Text, { style: { fontSize: 8, color: "#64748b", marginTop: 2 } }, `Fecha: ${fmtFechaCalendario(cot.fechaEvento)}`),
          ),
          React.createElement(View, { style: styles.infoBox },
            React.createElement(Text, { style: styles.infoLabel }, "Fechas"),
            React.createElement(Text, { style: { fontSize: 8, color: "#64748b" } }, `Emitida: ${fmtFecha(cot.creadoEn)}`),
            React.createElement(Text, { style: { fontSize: 8, color: "#64748b", marginTop: 2 } }, `Válida hasta: ${fmtFechaCalendario(cot.fechaValidez)}`),
          ),
        )
      ),

      // Servicios / honorarios según la modalidad de cobro
      esFijo ? React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, "Servicios"),
        React.createElement(View, { style: styles.table },
          React.createElement(View, { style: styles.tableHead },
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colDesc] }, "Descripción"),
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colNum] }, "Cant."),
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colNum] }, "Precio unit."),
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colNum] }, "Subtotal"),
          ),
          ...cot.items.map((item, i) => {
            const sub = item.cantidad * Number(item.precioUnit);
            return React.createElement(View, { key: item.id, wrap: false, style: [styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}] },
              React.createElement(Text, { style: [styles.cellTx, styles.colDesc] }, item.descripcion),
              React.createElement(Text, { style: [styles.cellTx, styles.colNum] }, String(item.cantidad)),
              React.createElement(Text, { style: [styles.cellTx, styles.colNum] }, fmt(Number(item.precioUnit))),
              React.createElement(Text, { style: [styles.cellTx, styles.colNum, { fontFamily: "Helvetica-Bold" }] }, fmt(sub)),
            );
          })
        ),
        React.createElement(View, { style: styles.totalBox, wrap: false },
          React.createElement(View, { style: styles.totalInner },
            (pctImpuesto > 0 || pctImpuesto2 > 0) ? React.createElement(View, { style: { marginBottom: 6, alignItems: "flex-end" } },
              React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `Subtotal: ${fmt(subtotal)}`),
              pctImpuesto > 0 ? React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `${cot.impuestoNombre ?? "Impuesto"} (${pctImpuesto}%): ${fmt(valorImpuesto)}`) : null,
              pctImpuesto2 > 0 ? React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `${cot.impuesto2Nombre ?? "Impuesto"} (${pctImpuesto2}%): ${fmt(valorImpuesto2)}`) : null,
            ) : null,
            React.createElement(Text, { style: styles.totalLabel }, "TOTAL"),
            React.createElement(Text, { style: styles.totalValue }, fmt(total)),
          )
        )
      ) : React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, `Propuesta de honorarios — ${MODALIDAD_LABEL[cot.modalidad] ?? ""}`),
        cot.modalidad === "SUCCESS_FEE" ? React.createElement(View, { style: styles.table },
          React.createElement(View, { style: styles.tableHead },
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colDesc] }, "Área de gasto"),
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colNum] }, "Gasto base/mes"),
            React.createElement(Text, { style: [styles.tableHeadTx, styles.colNum] }, "Ahorro/mes"),
          ),
          ...(cot.lineasAhorro ?? []).map((l, i) =>
            React.createElement(View, { key: l.id, wrap: false, style: [styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}] },
              React.createElement(Text, { style: [styles.cellTx, styles.colDesc] }, l.area),
              React.createElement(Text, { style: [styles.cellTx, styles.colNum] }, fmt(Number(l.gastoBaseMensual))),
              React.createElement(Text, { style: [styles.cellTx, styles.colNum, { fontFamily: "Helvetica-Bold" }] }, fmt(Number(l.ahorroEstimadoMensual))),
            )
          )
        ) : null,
        React.createElement(View, { style: styles.totalBox, wrap: false },
          React.createElement(View, { style: styles.totalInner },
            React.createElement(View, { style: { marginBottom: 6, alignItems: "flex-end" } },
              cot.modalidad === "SUCCESS_FEE" ? React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `Ahorro mensual estimado: ${fmt(ahorroMes)}`) : null,
              cot.modalidad === "SUCCESS_FEE" ? React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `Honorarios: ${pctHon}% del ahorro`) : null,
              cot.modalidad === "FEE_MENSUAL" ? React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `Fee mensual: ${fmt(feeMes)}`) : null,
              React.createElement(Text, { style: { fontSize: 8, color: "#93c5fd" } }, `Horizonte: ${mesesHz} meses`),
            ),
            React.createElement(Text, { style: styles.totalLabel }, cot.modalidad === "SUCCESS_FEE" ? "HONORARIO ESTIMADO" : "TOTAL DEL CONTRATO"),
            React.createElement(Text, { style: styles.totalValue }, fmt(valorContrato)),
          )
        ),
        cot.modalidad === "SUCCESS_FEE" ? React.createElement(Text, { style: { fontSize: 7.5, color: "#94a3b8", marginTop: 6 } }, "Estimación sobre el ahorro proyectado. El honorario real se cobra sobre el ahorro efectivamente verificado durante el horizonte del contrato.") : null,
      ),

      // Notas
      cot.notas ? React.createElement(View, { style: styles.notesBox, wrap: false },
        React.createElement(Text, { style: styles.notesLabel }, "OBSERVACIONES"),
        React.createElement(Text, { style: styles.notesTx }, cot.notas),
      ) : null,

      // Condiciones comerciales propias de esta cotización (heredadas del
      // cliente y editables por cotización). Van antes del cuerpo general del
      // tenant, como bloque específico de este cliente.
      cot.condicionesComerciales
        ? React.createElement(SeccionCotBox, { titulo: "Condiciones comerciales", contenido: cot.condicionesComerciales })
        : null,

      // Cuerpo / condiciones de la cotización (configurable por tenant; si no
      // hay nada configurado, seccionesCotizacion() devuelve las condiciones
      // comerciales por defecto).
      ...seccionesCotizacion(cot.tenant.cuerpoCotizacion).map((s, i) =>
        React.createElement(SeccionCotBox, { key: i, titulo: s.titulo, contenido: s.contenido })
      ),

      // Footer
      React.createElement(View, { style: styles.footer },
        React.createElement(Text, { style: styles.footerTx }, `Cotización ${numEtiqueta} · ${cot.tenant.nombre}`),
        React.createElement(Text, { style: styles.footerTx }, `Generado el ${new Date().toLocaleDateString("es-CO")}`),
      )
    )
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cotizacion-${numEtiqueta.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || String(cot.numero).padStart(4, "0")}.pdf"`,
    },
  });
}
