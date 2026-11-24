import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { paletaMarca } from "@/lib/color-marca";
import { formatoDia } from "@/lib/fecha-bogota";
import { millones, mesCorto, variacion } from "@/lib/finanzas/formato";
import type { CifrasInforme, FilaResultados, TextoInforme } from "@/lib/finanzas/informe";

export const dynamic = "force-dynamic";

// PDF del informe de análisis financiero (ver lib/finanzas/informe.ts):
// GET /api/finanzas/informe/pdf?id=<informe>. Solo de la propia cuenta.

const h = React.createElement;
const SEMAFORO: Record<string, { texto: string; color: string }> = {
  bien: { texto: "Bien", color: "#059669" },
  atencion: { texto: "Atención", color: "#d97706" },
  riesgo: { texto: "Riesgo", color: "#dc2626" },
};
const NIVEL_CAJA: Record<string, string> = { verde: "#059669", ambar: "#d97706", rojo: "#dc2626" };

async function logoValido(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:image/")) return url;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    return r.ok && (r.headers.get("content-type") ?? "").startsWith("image/") ? url : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const informe = await prisma.informeFinanciero.findFirst({
    where: { id, tenantId: acceso.tenantId },
    select: { mes: true, creadoEn: true, cifras: true, texto: true, tenant: { select: { nombre: true, logoUrl: true, colorMarca: true } } },
  });
  if (!informe) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const c = informe.cifras as unknown as CifrasInforme;
  const t = informe.texto as unknown as TextoInforme;
  const marca = paletaMarca(informe.tenant.colorMarca);
  const logo = await logoValido(informe.tenant.logoUrl);

  const s = StyleSheet.create({
    page: { padding: 36, paddingBottom: 54, fontSize: 9.5, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.45 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 2, borderBottomColor: marca.principal, paddingBottom: 10, marginBottom: 14 },
    marcaTxt: { fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 },
    titulo: { fontSize: 17, fontFamily: "Helvetica-Bold", color: marca.oscuro, marginTop: 2, lineHeight: 1.2 },
    sub: { fontSize: 9, color: "#64748b", marginTop: 6 },
    h2: { fontSize: 12, fontFamily: "Helvetica-Bold", color: marca.oscuro, marginTop: 14, marginBottom: 6 },
    p: { marginBottom: 6 },
    caja: { backgroundColor: marca.claro, borderRadius: 6, padding: 10, marginBottom: 8 },
    cajaTitulo: { fontFamily: "Helvetica-Bold", fontSize: 11, color: marca.textoSobreClaro, marginBottom: 4 },
    li: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 12, fontFamily: "Helvetica-Bold", color: marca.principal },
    liTxt: { flex: 1 },
    tabla: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, marginBottom: 8 },
    fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
    filaHead: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    celda: { flex: 1, padding: 4, textAlign: "right" },
    celdaIzq: { flex: 2, padding: 4 },
    head: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#475569" },
    reco: { borderLeftWidth: 3, borderLeftColor: marca.principal, paddingLeft: 8, marginBottom: 7 },
    recoTitulo: { fontFamily: "Helvetica-Bold" },
    muted: { color: "#64748b", fontSize: 8.5 },
    footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 5 },
    footerTxt: { fontSize: 7.5, color: "#94a3b8" },
  });

  const parrafos = (xs: string[]) => xs.map((x, i) => h(Text, { key: i, style: s.p }, x));
  const vinetas = (xs: string[]) => xs.map((x, i) => h(View, { key: i, style: s.li }, h(Text, { style: s.bullet }, `${i + 1}.`), h(Text, { style: s.liTxt }, x)));

  // Resultados del mes contra el anterior y el mismo mes del año pasado.
  const filasResultados: [string, keyof FilaResultados][] = [
    ["Ventas", "ventas"], ["Costo de ventas", "costoVentas"], ["Utilidad bruta", "utilidadBruta"],
    ["Gastos de administración", "gastosAdmin"], ["Gastos de ventas", "gastosVentas"], ["EBITDA", "ebitda"], ["Utilidad neta (est.)", "utilidadNeta"],
  ];
  const num = (f: FilaResultados | null, k: keyof FilaResultados) => (f ? millones(f[k] as number) : "—");
  const tablaResultados = h(View, { style: s.tabla },
    h(View, { style: s.filaHead },
      h(Text, { style: [s.celdaIzq, s.head] }, "Concepto"),
      h(Text, { style: [s.celda, s.head] }, mesCorto(c.mes)),
      h(Text, { style: [s.celda, s.head] }, c.anterior ? mesCorto(c.anterior.mes) : "Mes anterior"),
      h(Text, { style: [s.celda, s.head] }, "Var."),
      h(Text, { style: [s.celda, s.head] }, c.anioAnterior ? mesCorto(c.anioAnterior.mes) : "Año anterior"),
      h(Text, { style: [s.celda, s.head] }, "Var."),
    ),
    ...filasResultados.map(([nombre, k]) => h(View, { key: k, style: s.fila },
      h(Text, { style: s.celdaIzq }, nombre),
      h(Text, { style: s.celda }, num(c.actual, k)),
      h(Text, { style: s.celda }, num(c.anterior, k)),
      h(Text, { style: s.celda }, c.anterior ? variacion(c.actual[k] as number, c.anterior[k] as number) : "—"),
      h(Text, { style: s.celda }, num(c.anioAnterior, k)),
      h(Text, { style: s.celda }, c.anioAnterior ? variacion(c.actual[k] as number, c.anioAnterior[k] as number) : "—"),
    )),
  );

  const tablaSerie = c.serie.length > 1 ? h(View, { style: s.tabla },
    h(View, { style: s.filaHead },
      h(Text, { style: [s.celdaIzq, s.head] }, "Mes"),
      h(Text, { style: [s.celda, s.head] }, "Ventas"),
      h(Text, { style: [s.celda, s.head] }, "Margen bruto"),
      h(Text, { style: [s.celda, s.head] }, "EBITDA"),
      h(Text, { style: [s.celda, s.head] }, "Utilidad neta"),
    ),
    ...c.serie.map(f => h(View, { key: f.mes, style: s.fila },
      h(Text, { style: s.celdaIzq }, mesCorto(f.mes)),
      h(Text, { style: s.celda }, millones(f.ventas)),
      h(Text, { style: s.celda }, f.ventas ? `${Math.round((f.utilidadBruta / f.ventas) * 100)}%` : "—"),
      h(Text, { style: s.celda }, millones(f.ebitda)),
      h(Text, { style: s.celda }, millones(f.utilidadNeta)),
    )),
  ) : null;

  const tablaIndicadores = h(View, { style: s.tabla },
    h(View, { style: s.filaHead },
      h(Text, { style: [s.celdaIzq, s.head] }, "Indicador"),
      h(Text, { style: [s.celda, s.head] }, "Valor"),
      h(Text, { style: [s.celda, s.head] }, "Estado"),
      h(Text, { style: [{ flex: 4, padding: 4 }, s.head] }, "Qué significa"),
    ),
    ...c.indicadores.map((i, n) => h(View, { key: n, style: s.fila, wrap: false },
      h(Text, { style: s.celdaIzq }, i.nombre),
      h(Text, { style: s.celda }, i.valor),
      h(Text, { style: [s.celda, { color: i.semaforo ? SEMAFORO[i.semaforo].color : "#94a3b8", fontFamily: "Helvetica-Bold" }] }, i.semaforo ? SEMAFORO[i.semaforo].texto : "Sin datos"),
      h(Text, { style: { flex: 4, padding: 4, fontSize: 8.5, color: "#475569" } }, i.lectura),
    )),
  );

  const tablaClientes = c.clientes.length ? h(View, { style: s.tabla },
    h(View, { style: s.filaHead },
      h(Text, { style: [s.celdaIzq, s.head] }, "Cliente"),
      h(Text, { style: [s.celda, s.head] }, "Ventas"),
      h(Text, { style: [s.celda, s.head] }, "Participación"),
      h(Text, { style: [s.celda, s.head] }, "Margen"),
      h(Text, { style: [s.celdaIzq, s.head] }, "Alerta"),
    ),
    ...c.clientes.map((k, n) => h(View, { key: n, style: s.fila, wrap: false },
      h(Text, { style: s.celdaIzq }, k.cliente),
      h(Text, { style: s.celda }, millones(k.ventas)),
      h(Text, { style: s.celda }, `${Math.round(k.participacion * 100)}%`),
      h(Text, { style: s.celda }, `${Math.round(k.margen * 100)}%`),
      h(Text, { style: [s.celdaIzq, { color: k.alerta ? "#d97706" : "#94a3b8" }] }, k.alerta ?? "—"),
    )),
  ) : null;

  const generado = formatoDia(informe.creadoEn, { day: "numeric", month: "long", year: "numeric" });
  const pie = h(View, { style: s.footer, fixed: true },
    h(Text, { style: s.footerTxt }, `${informe.tenant.nombre} · Informe de análisis financiero · ${mesCorto(c.mes)}`),
    h(Text, { style: s.footerTxt, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Página ${pageNumber} de ${totalPages}` } as object),
  );

  const doc = h(Document, { title: `Informe financiero ${c.mes} - ${informe.tenant.nombre}` },
    h(Page, { size: "A4", style: s.page },
      pie,
      h(View, { style: s.header },
        h(View, { style: { flex: 1 } },
          h(Text, { style: s.marcaTxt }, informe.tenant.nombre),
          h(Text, { style: s.titulo }, "Informe de análisis financiero"),
          h(Text, { style: s.sub }, `Mes analizado: ${mesCorto(c.mes)} · Generado el ${generado}`),
        ),
        logo ? h(Image, { src: logo, style: { width: 70, height: 46, objectFit: "contain" } }) : null,
      ),

      h(View, { style: s.caja },
        h(Text, { style: s.cajaTitulo }, t.titulo),
        h(Text, null, t.resumenEjecutivo),
      ),
      t.decisionesUrgentes.length ? h(View, null, h(Text, { style: s.h2 }, "Decisiones más urgentes"), ...vinetas(t.decisionesUrgentes)) : null,

      h(Text, { style: s.h2 }, "1. Resultados del mes"),
      tablaResultados,
      ...parrafos(t.resultados),
      tablaSerie ? h(View, { wrap: false }, h(Text, { style: [s.muted, { marginBottom: 4 }] }, "Últimos meses (millones de pesos):"), tablaSerie) : null,

      h(Text, { style: s.h2, minPresenceAhead: 120 }, "2. Balance e indicadores"),
      c.balance
        ? h(Text, { style: s.muted }, `Balance al ${formatoDia(c.balance.corte)}: caja ${millones(c.balance.caja)} · cartera ${millones(c.balance.cuentasPorCobrar)} · activo total ${millones(c.balance.activoTotal)} · pasivo total ${millones(c.balance.pasivoTotal)} · patrimonio ${millones(c.balance.patrimonio)}.`)
        : h(Text, { style: s.muted }, "No hay balance cargado: los indicadores de liquidez y endeudamiento quedan sin calcular."),
      h(View, { style: { marginTop: 6 } }, tablaIndicadores),
      ...parrafos(t.balanceIndicadores),

      h(Text, { style: s.h2 }, "3. Caja de las próximas 13 semanas"),
      c.caja ? h(View, { style: [s.caja, { backgroundColor: "#f8fafc", borderLeftWidth: 3, borderLeftColor: NIVEL_CAJA[c.caja.nivel] }] },
        h(Text, { style: { fontFamily: "Helvetica-Bold", color: NIVEL_CAJA[c.caja.nivel] } }, c.caja.titulo),
        h(Text, null, c.caja.detalle),
        h(Text, { style: s.muted }, `Punto más bajo: ${millones(c.caja.minimo.saldo)} el ${formatoDia(c.caja.minimo.dia)}${c.caja.diasCaja !== null ? ` · Días de caja: ${c.caja.diasCaja}` : ""}`),
      ) : null,
      ...parrafos(t.caja),
      c.equilibrio ? h(Text, { style: s.muted }, `Punto de equilibrio: se necesitan ventas de ${millones(c.equilibrio.ventasNecesarias)} al mes para cubrir gastos fijos de ${millones(c.equilibrio.gastosFijos)} (margen de contribución ${Math.round(c.equilibrio.margenContribucion * 100)}%).`) : null,

      tablaClientes || t.clientes.length ? h(View, null, h(Text, { style: s.h2 }, "4. Rentabilidad por cliente"), tablaClientes, ...parrafos(t.clientes)) : null,

      h(Text, { style: s.h2, break: true }, "Recomendaciones"),
      ...t.recomendaciones.map((r, i) => h(View, { key: i, style: s.reco, wrap: false },
        h(Text, { style: s.recoTitulo }, `${i + 1}. ${r.accion}`),
        h(Text, null, `Por qué: ${r.porque}`),
        h(Text, { style: s.muted }, `Impacto esperado: ${r.impacto}`),
      )),
      t.preguntasContador.length ? h(View, null, h(Text, { style: s.h2 }, "Preguntas para el contador"), ...vinetas(t.preguntasContador)) : null,

      h(Text, { style: [s.muted, { marginTop: 14 }] },
        "Cifras calculadas por el sistema a partir de los estados financieros cargados (utilidad neta con impuesto de renta estimado del 35%). El análisis lo redacta un asistente con inteligencia artificial sobre esas cifras: no reemplaza la revisión del contador ni constituye asesoría tributaria o legal."),
    ),
  );

  const buffer = await renderToBuffer(doc);
  const nombre = `informe-financiero-${c.mes}-${informe.tenant.nombre.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nombre}"` },
  });
}
