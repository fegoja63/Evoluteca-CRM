import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image, Svg, Rect, Line, Polyline } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { paletaMarca } from "@/lib/color-marca";
import { formatoDia } from "@/lib/fecha-bogota";
import { millones, mesCorto, variacion } from "@/lib/finanzas/formato";
import { PLAZOS, type BalanceInforme, type CifrasInforme, type FilaResultados, type TextoInforme } from "@/lib/finanzas/informe";
import { ACLARACION_MODO } from "@/lib/finanzas/modo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// PDF del informe de análisis financiero (ver lib/finanzas/informe.ts):
// GET /api/finanzas/informe/pdf?id=<informe>. Solo de la propia cuenta.
// Portada ejecutiva (logo del cliente, puntaje de salud, cifras clave,
// hallazgo y decisiones; "Preparado por" Evoluteca CRM y Felipe Gómez
// Jaramillo) y luego el análisis con gráficas, proyecciones y plan 30-60-90.

const h = React.createElement;
const W = 523; // ancho útil de una página A4 con márgenes de 36
const SEMAFORO: Record<string, { texto: string; color: string }> = {
  bien: { texto: "Bien", color: "#059669" },
  atencion: { texto: "Atención", color: "#d97706" },
  riesgo: { texto: "Riesgo", color: "#dc2626" },
};
const NIVEL_CAJA: Record<string, string> = { verde: "#059669", ambar: "#d97706", rojo: "#dc2626" };
const colorSalud = (p: number) => (p >= 75 ? "#059669" : p >= 55 ? "#2563eb" : p >= 35 ? "#d97706" : "#dc2626");

/** Imagen como data URI (una sola descarga); null si no se puede. */
async function imagen(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:image/")) return url;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const tipo = r.headers.get("content-type") ?? "";
    if (!r.ok || !tipo.startsWith("image/")) return null;
    return `data:${tipo.split(";")[0]};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;
  const url = new URL(req.url);
  const informe = await prisma.informeFinanciero.findFirst({
    where: { id: url.searchParams.get("id") ?? "", tenantId: acceso.tenantId },
    select: { mes: true, creadoEn: true, cifras: true, texto: true, tenant: { select: { nombre: true, logoUrl: true, colorMarca: true } } },
  });
  if (!informe) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const c = informe.cifras as unknown as CifrasInforme;
  const t = informe.texto as unknown as TextoInforme;
  const anual = c.modo === "anual";
  const impuestoReal = !!c.actual.impuestoReal;
  // Con el cierre anual (o si el informe trae el detalle) la tabla muestra hasta la utilidad neta.
  const conDetalle = anual || typeof c.actual.antesDeImpuestos === "number";
  let seccion = 0;
  const n = () => ++seccion;
  const marca = paletaMarca(informe.tenant.colorMarca);
  const [logoCliente, logoEvoluteca, logoFgj] = await Promise.all([
    imagen(informe.tenant.logoUrl),
    imagen(`${url.origin}/Logo%20Evoluteca%20CRM.png`),
    imagen(`${url.origin}/Logo%20FGJ.jpg`),
  ]);

  const s = StyleSheet.create({
    page: { paddingTop: 64, paddingHorizontal: 36, paddingBottom: 54, fontSize: 9.5, fontFamily: "Helvetica", color: "#1e293b", lineHeight: 1.45 },
    portada: { padding: 0, fontFamily: "Helvetica", color: "#1e293b" },
    banda: { backgroundColor: marca.oscuro, paddingHorizontal: 36, paddingTop: 30, paddingBottom: 26 },
    h2: { fontSize: 13, fontFamily: "Helvetica-Bold", color: marca.oscuro, marginTop: 16, marginBottom: 6 },
    h3: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#334155", marginTop: 8, marginBottom: 4 },
    p: { marginBottom: 6 },
    caja: { backgroundColor: marca.claro, borderRadius: 6, padding: 10, marginBottom: 8 },
    li: { flexDirection: "row", marginBottom: 3 },
    bullet: { width: 14, fontFamily: "Helvetica-Bold", color: marca.principal },
    liTxt: { flex: 1 },
    tabla: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, marginBottom: 8 },
    fila: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
    filaHead: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
    celda: { flex: 1, padding: 4, textAlign: "right" },
    celdaIzq: { flex: 2, padding: 4 },
    head: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#475569" },
    muted: { color: "#64748b", fontSize: 8.5 },
    chico: { fontSize: 7, color: "#64748b" },
    tarjeta: { flex: 1, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6, padding: 8 },
    kpiNum: { fontSize: 15, fontFamily: "Helvetica-Bold", color: marca.oscuro, lineHeight: 1.25, marginVertical: 2 },
    kpiTxt: { fontSize: 7.5, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
    encabezado: { position: "absolute", top: 18, left: 36, right: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 6 },
    encTxt: { fontSize: 7.5, color: "#94a3b8" },
    footer: { position: "absolute", top: 806, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 5 },
    footerTxt: { fontSize: 7.5, color: "#94a3b8" },
  });

  const parrafos = (xs: string[] = []) => xs.map((x, i) => h(Text, { key: i, style: s.p }, x));
  const vinetas = (xs: string[] = [], color = marca.principal) =>
    xs.map((x, i) => h(View, { key: i, style: s.li, wrap: false }, h(Text, { style: [s.bullet, { color }] }, `${i + 1}.`), h(Text, { style: s.liTxt }, x)));
  const leyenda = (color: string, texto: string, punteada = false) => h(View, { style: { flexDirection: "row", alignItems: "center", marginRight: 12 } },
    h(View, { style: { width: 12, height: punteada ? 0 : 6, borderTopWidth: punteada ? 1.5 : 0, borderStyle: punteada ? "dashed" : "solid", borderColor: color, backgroundColor: punteada ? undefined : color, marginRight: 4 } }),
    h(Text, { style: s.chico }, texto));

  // ── Gráficas ──────────────────────────────────────────────────────────────

  /** Ventas (barras) y EBITDA (línea) de los últimos 12 meses. */
  function graficaVentas(serie: FilaResultados[]) {
    const H = 120;
    const max = Math.max(1, ...serie.map(f => f.ventas));
    const min = Math.min(0, ...serie.map(f => f.ebitda));
    const y = (v: number) => H - ((v - min) / (max - min)) * H;
    const paso = W / serie.length;
    const ancho = paso * 0.62;
    const puntos = serie.map((f, i) => `${i * paso + paso / 2},${y(f.ebitda)}`).join(" ");
    return h(View, { wrap: false, style: { marginVertical: 6 } },
      h(View, { style: { flexDirection: "row", marginBottom: 4 } }, leyenda("#94a3b8", "Ventas"), leyenda(marca.principal, "EBITDA (línea)")),
      h(Svg, { width: W, height: H },
        h(Line, { x1: 0, y1: y(0), x2: W, y2: y(0), stroke: "#cbd5e1", strokeWidth: 0.6 }),
        ...serie.map((f, i) => h(Rect, { key: f.mes, x: i * paso + (paso - ancho) / 2, y: y(f.ventas), width: ancho, height: Math.max(0.5, y(0) - y(f.ventas)), fill: i === serie.length - 1 ? marca.claro : "#e2e8f0" })),
        h(Polyline, { points: puntos, stroke: marca.principal, strokeWidth: 2, fill: "none" }),
      ),
      h(View, { style: { flexDirection: "row" } }, ...serie.map(f => h(Text, { key: f.mes, style: [s.chico, { width: paso, textAlign: "center" }] }, mesCorto(f.mes)))),
      h(View, { style: { flexDirection: "row" } }, ...serie.map(f => h(Text, { key: f.mes, style: [s.chico, { width: paso, textAlign: "center", color: "#334155" }] }, `${Math.round(f.ventas / 1_000_000)}`))),
      h(Text, { style: [s.chico, { marginTop: 2 }] }, `Ventas en millones de pesos bajo cada ${anual ? "año" : "mes"}.`),
    );
  }

  /** Caja de 13 semanas: con el pipeline ponderado y sin negocios nuevos, con la línea de cero. */
  function graficaCaja(con: { inicio: string; saldo: number }[], sin: { inicio: string; saldo: number }[]) {
    const H = 130;
    const todos = [...con, ...sin].map(w => w.saldo);
    const max = Math.max(0, ...todos);
    const min = Math.min(0, ...todos);
    const rango = max - min || 1;
    const y = (v: number) => 6 + (H - 12) * (1 - (v - min) / rango);
    const x = (i: number, n: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
    const linea = (ws: { saldo: number }[]) => ws.map((w, i) => `${x(i, ws.length)},${y(w.saldo)}`).join(" ");
    return h(View, { wrap: false, style: { marginVertical: 6 } },
      h(View, { style: { flexDirection: "row", marginBottom: 4 } },
        leyenda(marca.principal, "Con los negocios del pipeline (ponderados)"), leyenda("#94a3b8", "Sin negocios nuevos", true), leyenda("#dc2626", "Cero")),
      h(Svg, { width: W, height: H },
        min < 0 ? h(Rect, { x: 0, y: y(0), width: W, height: H - y(0), fill: "#fef2f2" }) : null,
        h(Line, { x1: 0, y1: y(0), x2: W, y2: y(0), stroke: "#dc2626", strokeWidth: 0.8 }),
        sin.length ? h(Polyline, { points: linea(sin), stroke: "#94a3b8", strokeWidth: 1.5, strokeDasharray: "4 3", fill: "none" }) : null,
        h(Polyline, { points: linea(con), stroke: marca.principal, strokeWidth: 2.2, fill: "none" }),
      ),
      h(View, { style: { flexDirection: "row", justifyContent: "space-between" } },
        h(Text, { style: s.chico }, `Semana del ${formatoDia(con[0]?.inicio ?? c.generado, { day: "numeric", month: "short" })}`),
        h(Text, { style: s.chico }, `Máximo ${millones(max)} · mínimo ${millones(min)}`),
        h(Text, { style: s.chico }, `Semana del ${formatoDia(con[con.length - 1]?.inicio ?? c.generado, { day: "numeric", month: "short" })}`),
      ),
    );
  }

  /** Barra 100 %: a dónde se van cada $100 que vende la empresa. */
  function graficaComposicion(k: NonNullable<CifrasInforme["composicion"]>) {
    const partes: [string, number, string][] = [
      ["Costo de ventas", k.costo, "#94a3b8"], ["Administración", k.admin, "#64748b"], ["Ventas", k.ventas, "#a78bfa"],
      ["Depreciación", k.depreciacion, "#cbd5e1"], ["Intereses", k.intereses, "#f59e0b"],
      ["Gastos no operacionales", k.otrosGastos ?? 0, "#f97316"], [impuestoReal ? "Impuesto de renta" : "Impuesto (est.)", k.impuesto, "#fb7185"],
      ["Utilidad neta", Math.max(0, k.utilidad), "#059669"],
    ];
    const total = partes.reduce((a, p) => a + Math.max(0, p[1]), 0) || 1;
    let xAcum = 0;
    return h(View, { wrap: false, style: { marginVertical: 6 } },
      h(Svg, { width: W, height: 22 }, ...partes.filter(p => p[1] > 0).map(([n, v, col]) => {
        const w = (v / total) * W;
        const r = h(Rect, { key: n, x: xAcum, y: 0, width: w, height: 22, fill: col });
        xAcum += w;
        return r;
      })),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 } },
        ...partes.map(([n, v, col]) => h(View, { key: n, style: { flexDirection: "row", alignItems: "center", width: "33%", marginBottom: 3 } },
          h(View, { style: { width: 8, height: 8, backgroundColor: col, marginRight: 4 } }),
          h(Text, { style: { fontSize: 8 } }, `${n}: ${n === "Utilidad neta" && k.utilidad < 0 ? "–" : ""}$${(n === "Utilidad neta" ? Math.abs(k.utilidad) : v).toLocaleString("es-CO", { maximumFractionDigits: 1 })}`)))),
      (k.otrosIngresos ?? 0) > 0 ? h(Text, { style: s.muted }, `Además entraron $${(k.otrosIngresos ?? 0).toLocaleString("es-CO", { maximumFractionDigits: 1 })} de ingresos no operacionales por cada $100 vendidos.`) : null,
      k.utilidad < 0 ? h(Text, { style: [s.muted, { color: "#dc2626" }] }, `${anual ? "En el año" : "Este mes"} hubo pérdida: por cada $100 vendidos se perdieron $${Math.abs(k.utilidad).toLocaleString("es-CO", { maximumFractionDigits: 1 })}.`) : null,
    );
  }

  /** Utilidad neta de cada escenario, con la línea de cero. */
  function graficaEscenarios(lista: NonNullable<CifrasInforme["escenarios"]>["lista"]) {
    const H = 70;
    const vals = lista.map(e => e.utilidadNeta);
    const max = Math.max(1, ...vals);
    const min = Math.min(0, ...vals);
    const y = (v: number) => 4 + (H - 8) * (1 - (v - min) / (max - min));
    const paso = W / lista.length;
    return h(View, { wrap: false, style: { marginBottom: 6 } },
      h(Svg, { width: W, height: H },
        ...lista.map((e, i) => h(Rect, {
          key: e.nombre, x: i * paso + paso * 0.3, y: Math.min(y(e.utilidadNeta), y(0)), width: paso * 0.4,
          height: Math.max(0.8, Math.abs(y(e.utilidadNeta) - y(0))), fill: e.utilidadNeta < 0 ? "#dc2626" : e.nombre === "Base" ? marca.principal : "#94a3b8",
        })),
        h(Line, { x1: 0, y1: y(0), x2: W, y2: y(0), stroke: "#475569", strokeWidth: 0.8 }),
      ),
      h(View, { style: { flexDirection: "row" } }, ...lista.map(e => h(Text, { key: e.nombre, style: [s.chico, { width: paso, textAlign: "center" }] }, `${e.nombre}: ${millones(e.utilidadNeta)}`))),
    );
  }

  /** Últimos 6 meses reales y los próximos 3 proyectados. */
  function graficaProyeccion() {
    const reales = c.serie.slice(-6).map(f => ({ mes: f.mes, ventas: f.ventas, proyectado: false }));
    const futuros = (c.proyeccion?.proximos ?? []).map(m => ({ mes: m.mes, ventas: m.ventas, proyectado: true }));
    const todos = [...reales, ...futuros];
    const H = 110;
    const max = Math.max(1, ...todos.map(m => m.ventas));
    const paso = W / todos.length;
    const ancho = paso * 0.6;
    return h(View, { wrap: false, style: { marginVertical: 6 } },
      h(View, { style: { flexDirection: "row", marginBottom: 4 } }, leyenda("#cbd5e1", "Ventas reales"), leyenda(marca.principal, "Proyección (estimada)")),
      h(Svg, { width: W, height: H }, ...todos.map((m, i) => h(Rect, {
        key: m.mes, x: i * paso + (paso - ancho) / 2, y: H - (m.ventas / max) * H, width: ancho, height: (m.ventas / max) * H,
        fill: m.proyectado ? marca.principal : "#cbd5e1", fillOpacity: m.proyectado ? 0.55 : 1,
      }))),
      h(View, { style: { flexDirection: "row" } }, ...todos.map(m => h(Text, { key: m.mes, style: [s.chico, { width: paso, textAlign: "center", fontFamily: m.proyectado ? "Helvetica-Bold" : "Helvetica" }] }, mesCorto(m.mes)))),
      h(View, { style: { flexDirection: "row" } }, ...todos.map(m => h(Text, { key: m.mes, style: [s.chico, { width: paso, textAlign: "center", color: "#334155" }] }, `${Math.round(m.ventas / 1_000_000)}`))),
    );
  }

  /** Cierre anual: por año, barras agrupadas de ventas, gastos, EBITDA y utilidad neta (con la línea de cero). */
  function graficaAnual(serie: FilaResultados[]) {
    const H = 150;
    const series: [string, string, (f: FilaResultados) => number][] = [
      ["Ventas", "#94a3b8", f => f.ventas],
      ["Costos y gastos operativos", "#f59e0b", f => f.costoVentas + f.gastosAdmin + f.gastosVentas],
      ["EBITDA", marca.principal, f => f.ebitda],
      ["Utilidad neta", "#059669", f => f.utilidadNeta],
    ];
    const valores = serie.flatMap(f => series.map(([, , v]) => v(f)));
    const max = Math.max(1, ...valores);
    const min = Math.min(0, ...valores);
    const y = (v: number) => 4 + (H - 8) * (1 - (v - min) / (max - min));
    const grupo = W / serie.length;
    const ancho = (grupo * 0.72) / series.length;
    return h(View, { wrap: false, style: { marginVertical: 6 } },
      h(View, { style: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 } }, ...series.map(([n2, col]) => h(View, { key: n2 }, leyenda(col, n2)))),
      h(Svg, { width: W, height: H },
        ...serie.flatMap((f, i) => series.map(([n2, col, v], j) => {
          const val = v(f);
          const x = i * grupo + grupo * 0.14 + j * ancho;
          const top = Math.min(y(val), y(0));
          const alto = Math.max(0.8, Math.abs(y(val) - y(0)));
          return h(Rect, { key: `${f.mes}-${n2}`, x, y: top, width: ancho * 0.9, height: alto, fill: n2 === "Utilidad neta" && val < 0 ? "#dc2626" : col });
        })),
        h(Line, { x1: 0, y1: y(0), x2: W, y2: y(0), stroke: "#475569", strokeWidth: 0.8 }),
      ),
      h(View, { style: { flexDirection: "row" } }, ...serie.map(f => h(View, { key: f.mes, style: { width: grupo, alignItems: "center" } },
        h(Text, { style: [s.chico, { fontFamily: "Helvetica-Bold", color: "#334155" }] }, f.mes),
        h(Text, { style: s.chico }, `Utilidad ${millones(f.utilidadNeta)}`)))),
    );
  }

  /** Composición del balance en cada corte: qué tiene la empresa y cómo se financia. */
  function graficaBalance(cortes: BalanceInforme[]) {
    const activo = (b: BalanceInforme): [string, number, string][] => [
      ["Caja", b.caja, "#059669"], ["Cartera", b.cuentasPorCobrar, "#34d399"],
      ["Otros corrientes", Math.max(0, b.activoCorriente - b.caja - b.cuentasPorCobrar), "#a7f3d0"],
      ["Inversiones", b.inversiones ?? 0, "#6366f1"],
      ["Activos fijos y otros", Math.max(0, b.activoTotal - b.activoCorriente - (b.inversiones ?? 0)), "#94a3b8"],
    ];
    const financia = (b: BalanceInforme): [string, number, string][] => [
      ["Pasivo de corto plazo", b.pasivoCorriente, "#f59e0b"], ["Deuda de largo plazo", Math.max(0, b.pasivoTotal - b.pasivoCorriente), "#fb7185"],
      ["Patrimonio", Math.max(0, b.patrimonio), marca.principal],
    ];
    const maxTotal = Math.max(1, ...cortes.map(b => b.activoTotal));
    const ANCHO = W - 110;
    const barra = (partes: [string, number, string][]) => {
      let x = 0;
      return h(Svg, { width: ANCHO, height: 14 }, ...partes.filter(p => p[1] > 0).map(([n2, v, col]) => {
        const w = (v / maxTotal) * ANCHO;
        const r = h(Rect, { key: n2, x, y: 0, width: w, height: 14, fill: col });
        x += w;
        return r;
      }));
    };
    const fila = (titulo: string, b: BalanceInforme, partes: [string, number, string][]) => h(View, { style: { flexDirection: "row", alignItems: "center", marginBottom: 3 } },
      h(Text, { style: [s.chico, { width: 110, color: "#334155" }] }, titulo), barra(partes));
    const muestra = cortes[0];
    return h(View, { wrap: false, style: { marginVertical: 6 } },
      ...cortes.flatMap(b => [
        fila(`Activo ${formatoDia(b.corte, { month: "short", year: "numeric" })}`, b, activo(b)),
        fila(`Financiación ${formatoDia(b.corte, { month: "short", year: "numeric" })}`, b, financia(b)),
      ]),
      h(View, { style: { flexDirection: "row", flexWrap: "wrap", marginTop: 3 } },
        ...[...activo(muestra), ...financia(muestra)].map(([n2, , col]) => h(View, { key: n2 }, leyenda(col, n2)))),
      h(Text, { style: s.chico }, `Barras a la misma escala: el total es el activo (${cortes.map(b => `${formatoDia(b.corte, { month: "short", year: "numeric" })}: ${millones(b.activoTotal)}`).join(" · ")}).`),
    );
  }

  // ── Tablas ────────────────────────────────────────────────────────────────

  const filasResultados: [string, keyof FilaResultados][] = [
    ["Ventas", "ventas"], ["Costo de ventas", "costoVentas"], ["Utilidad bruta", "utilidadBruta"],
    ["Gastos de administración", "gastosAdmin"], ["Gastos de ventas", "gastosVentas"], ["EBITDA", "ebitda"],
    ...(conDetalle ? [
      ["Depreciación", "depreciacion"], ["Gastos financieros", "intereses"],
      ["Ingresos no operacionales", "otrosIngresos"], ["Gastos no operacionales", "otrosGastos"],
      ["Utilidad antes de impuestos", "antesDeImpuestos"], [impuestoReal ? "Impuesto de renta" : "Impuesto (est. 35 %)", "impuesto"],
    ] as [string, keyof FilaResultados][] : []),
    [impuestoReal ? "Utilidad neta" : "Utilidad neta (est.)", "utilidadNeta"],
  ];
  const num = (f: FilaResultados | null, k: keyof FilaResultados) => (f && typeof f[k] === "number" ? millones(f[k] as number) : "—");
  const tablaResultados = h(View, { style: s.tabla, wrap: false },
    h(View, { style: s.filaHead },
      h(Text, { style: [s.celdaIzq, s.head] }, "Concepto"),
      h(Text, { style: [s.celda, s.head] }, mesCorto(c.mes)),
      h(Text, { style: [s.celda, s.head] }, c.anterior ? mesCorto(c.anterior.mes) : anual ? "Año anterior" : "Mes anterior"),
      h(Text, { style: [s.celda, s.head] }, "Var."),
      anual ? null : h(Text, { style: [s.celda, s.head] }, c.anioAnterior ? mesCorto(c.anioAnterior.mes) : "Año anterior"),
      anual ? null : h(Text, { style: [s.celda, s.head] }, "Var."),
    ),
    ...filasResultados.map(([nombre, k]) => h(View, { key: k, style: s.fila },
      h(Text, { style: s.celdaIzq }, nombre),
      h(Text, { style: [s.celda, { fontFamily: "Helvetica-Bold" }] }, num(c.actual, k)),
      h(Text, { style: s.celda }, num(c.anterior, k)),
      h(Text, { style: s.celda }, c.anterior && typeof c.anterior[k] === "number" ? variacion(c.actual[k] as number, c.anterior[k] as number) : "—"),
      anual ? null : h(Text, { style: s.celda }, num(c.anioAnterior, k)),
      anual ? null : h(Text, { style: s.celda }, c.anioAnterior ? variacion(c.actual[k] as number, c.anioAnterior[k] as number) : "—"),
    )),
  );

  const tablaIndicadores = h(View, { style: s.tabla },
    h(View, { style: s.filaHead },
      h(Text, { style: [s.celdaIzq, s.head] }, "Indicador"),
      h(Text, { style: [s.celda, s.head] }, "Valor"),
      h(Text, { style: [s.celda, s.head] }, "Estado"),
      h(Text, { style: [{ flex: 4, padding: 4 }, s.head] }, "Qué significa"),
    ),
    ...c.indicadores.map((i, n) => h(View, { key: n, style: s.fila, wrap: false },
      h(View, { style: [s.celdaIzq, { flexDirection: "row", alignItems: "center" }] },
        h(View, { style: { width: 7, height: 7, borderRadius: 4, marginRight: 5, backgroundColor: i.semaforo ? SEMAFORO[i.semaforo].color : "#cbd5e1" } }),
        h(Text, null, i.nombre)),
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

  // ── Portada ───────────────────────────────────────────────────────────────

  const generado = formatoDia(informe.creadoEn, { day: "numeric", month: "long", year: "numeric" });
  const kpi = (etiqueta: string, valor: string, detalle?: string, color?: string) => h(View, { style: s.tarjeta },
    h(Text, { style: s.kpiTxt }, etiqueta),
    h(Text, { style: [s.kpiNum, color ? { color } : {}] }, valor),
    detalle ? h(Text, { style: [s.chico, { lineHeight: 1.3 }] }, detalle) : null);

  const salud = c.salud;
  const portada = h(Page, { size: "A4", style: s.portada },
    h(View, { style: s.banda },
      h(View, { style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
        h(View, { style: { flex: 1 } },
          h(Text, { style: { fontSize: 9, color: marca.sobreOscuroSuave, letterSpacing: 1.5, textTransform: "uppercase" } }, informe.tenant.nombre),
          h(Text, { style: { fontSize: 24, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 6, lineHeight: 1.15 } }, "Informe de análisis financiero"),
          h(Text, { style: { fontSize: 11, color: marca.sobreOscuro, marginTop: 6 } }, `${anual ? `Cierre anual ${c.mes}` : `Mes analizado: ${mesCorto(c.mes)}`} · ${generado}`),
        ),
        logoCliente ? h(View, { style: { backgroundColor: "#ffffff", borderRadius: 8, padding: 6, marginLeft: 12 } },
          h(Image, { src: logoCliente, style: { width: 80, height: 54, objectFit: "contain" } })) : null,
      ),
    ),
    h(View, { style: { paddingHorizontal: 36, paddingTop: 18 } },
      salud ? h(View, { style: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 8, padding: 12, marginBottom: 12 } },
        h(View, { style: { width: 86, height: 86, borderRadius: 43, borderWidth: 6, borderColor: colorSalud(salud.puntaje), alignItems: "center", justifyContent: "center", marginRight: 16 } },
          h(Text, { style: { fontSize: 26, fontFamily: "Helvetica-Bold", color: colorSalud(salud.puntaje) } }, String(salud.puntaje)),
          h(Text, { style: s.chico }, "de 100")),
        h(View, { style: { flex: 1 } },
          h(Text, { style: s.kpiTxt }, "Salud financiera"),
          h(Text, { style: { fontSize: 18, fontFamily: "Helvetica-Bold", color: colorSalud(salud.puntaje), marginTop: 2 } }, salud.etiqueta),
          h(Text, { style: [s.muted, { marginTop: 3 }] }, `${salud.bien} indicadores bien · ${salud.atencion} en atención · ${salud.riesgo} en riesgo`),
          h(Svg, { width: 360, height: 10, style: { marginTop: 6 } },
            h(Rect, { x: 0, y: 3, width: 360, height: 4, fill: "#e2e8f0" }),
            h(Rect, { x: 0, y: 3, width: (salud.puntaje / 100) * 360, height: 4, fill: colorSalud(salud.puntaje) }),
            h(Rect, { x: Math.max(0, (salud.puntaje / 100) * 360 - 1.5), y: 0, width: 3, height: 10, fill: "#0f172a" })),
        ),
      ) : null,
      h(View, { style: { flexDirection: "row", gap: 8, marginBottom: 12 } },
        kpi(`Ventas ${mesCorto(c.mes)}`, millones(c.actual.ventas), c.anterior ? `${variacion(c.actual.ventas, c.anterior.ventas)} vs. ${anual ? c.anterior.mes : "mes anterior"}` : undefined),
        kpi(impuestoReal ? "Utilidad neta" : "Utilidad neta (est.)", millones(c.actual.utilidadNeta), c.actual.ventas ? `${Math.round((c.actual.utilidadNeta / c.actual.ventas) * 100)}% de las ventas` : undefined, c.actual.utilidadNeta < 0 ? "#dc2626" : undefined),
        kpi("Caja", c.balance ? millones(c.balance.caja) : "—", c.balance ? `al ${formatoDia(c.balance.corte, { day: "numeric", month: "short" })}` : "sin balance"),
        kpi("Días de caja", c.caja?.diasCaja != null ? String(c.caja.diasCaja) : "—", c.caja ? c.caja.titulo : undefined, c.caja ? NIVEL_CAJA[c.caja.nivel] : undefined),
      ),
      h(View, { style: [s.caja, { padding: 14 }] },
        h(Text, { style: { fontSize: 8, color: marca.textoSobreClaro, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 } }, "Hallazgo principal"),
        h(Text, { style: { fontSize: 13, fontFamily: "Helvetica-Bold", color: marca.oscuro, lineHeight: 1.35 } }, t.hallazgoPrincipal || t.titulo),
      ),
      t.decisionesUrgentes.length ? h(View, { style: { marginTop: 6 } },
        h(Text, { style: [s.h3, { fontSize: 11, color: marca.oscuro }] }, "Las 3 decisiones más urgentes"),
        h(View, { style: { fontSize: 10.5, lineHeight: 1.4 } }, ...t.decisionesUrgentes.map((x, i) => h(View, { key: i, style: [s.li, { marginBottom: 5 }] },
          h(Text, { style: [s.bullet, { fontSize: 10.5 }] }, `${i + 1}.`), h(Text, { style: [s.liTxt, { fontSize: 10.5, lineHeight: 1.4 }] }, x))))) : null,
      c.escenarios ? (() => {
        const [cons, base, opt] = c.escenarios.lista;
        return h(View, { style: { flexDirection: "row", gap: 8, marginTop: 10 } },
          kpi(`Escenario base ${c.escenarios.anio}`, millones(base.utilidadNeta), `utilidad neta · ventas ${millones(base.ventas)}`, base.utilidadNeta < 0 ? "#dc2626" : undefined),
          kpi(`Rango ${c.escenarios.anio}`, `${millones(cons.utilidadNeta)} a ${millones(opt.utilidadNeta)}`, "de conservador a optimista (utilidad neta)"),
        );
      })() : null,
      c.proyeccion?.anio ? h(View, { style: { flexDirection: "row", gap: 8, marginTop: 10 } },
        kpi(`Cierre ${c.proyeccion.anio.anio} (estimado)`, millones(c.proyeccion.anio.ventasCierre), `ventas · ${c.proyeccion.anio.mesesReales} meses reales + proyección`),
        kpi(`Utilidad ${c.proyeccion.anio.anio} (estimada)`, millones(c.proyeccion.anio.utilidadCierre), "con impuesto de renta estimado del 35%", c.proyeccion.anio.utilidadCierre < 0 ? "#dc2626" : undefined),
      ) : null,
    ),
    h(View, { style: { position: "absolute", bottom: 26, left: 36, right: 36, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" } },
      h(View, null,
        h(Text, { style: s.chico }, "Preparado por"),
        h(Text, { style: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#334155" } }, "Felipe Gómez Jaramillo · Evoluteca CRM"),
        h(Text, { style: s.chico }, "Gerente Financiero con inteligencia artificial"),
      ),
      h(View, { style: { flexDirection: "row", alignItems: "center" } },
        logoEvoluteca ? h(Image, { src: logoEvoluteca, style: { height: 26, width: 104, objectFit: "contain", marginRight: 14 } }) : null,
        logoFgj ? h(Image, { src: logoFgj, style: { height: 30, width: 78, objectFit: "contain" } }) : null,
      ),
    ),
  );

  // ── Análisis ──────────────────────────────────────────────────────────────

  const encabezado = h(View, { style: s.encabezado, fixed: true },
    h(Text, { style: s.encTxt }, `${informe.tenant.nombre} · Informe de análisis financiero · ${mesCorto(c.mes)}`),
    h(View, { style: { flexDirection: "row", alignItems: "center" } },
      logoEvoluteca ? h(Image, { src: logoEvoluteca, style: { height: 14, width: 56, objectFit: "contain", marginRight: 8 } }) : null,
      logoFgj ? h(Image, { src: logoFgj, style: { height: 16, width: 42, objectFit: "contain" } }) : null,
    ),
  );
  const pie = h(View, { style: s.footer, fixed: true },
    h(Text, { style: s.footerTxt }, "Preparado por Felipe Gómez Jaramillo · Evoluteca CRM"),
    h(Text, { style: s.footerTxt, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Página ${pageNumber} de ${totalPages}` } as object),
  );

  const proy = c.proyeccion;
  const planPorPlazo = PLAZOS.map(plazo => ({ plazo, acciones: t.recomendaciones.filter(r => (r.plazo ?? "30 días") === plazo) })).filter(g => g.acciones.length);

  const analisis = h(Page, { size: "A4", style: s.page },
    encabezado,

    h(Text, { style: [s.h2, { marginTop: 0 }] }, "Resumen ejecutivo"),
    h(View, { style: s.caja }, h(Text, { style: { fontFamily: "Helvetica-Bold", color: marca.textoSobreClaro, marginBottom: 3 } }, t.titulo), h(Text, null, t.resumenEjecutivo)),
    h(View, { style: { borderLeftWidth: 2, borderLeftColor: "#94a3b8", paddingLeft: 6, marginBottom: 4 } },
      h(Text, { style: s.muted }, ACLARACION_MODO[anual ? "anual" : "mensual"])),
    c.mesesDesdeDato != null && c.mesesDesdeDato > 3
      ? h(Text, { style: [s.muted, { color: "#b45309" }] }, `Atención: el último dato cargado es de ${mesCorto(c.mes)}, hace ${c.mesesDesdeDato} meses. Las cifras y la caja de hoy pueden ser otras.`)
      : null,

    h(Text, { style: s.h2 }, `${n()}. ${anual ? `Resultados del año ${c.mes}` : "Resultados del mes"}`),
    tablaResultados,
    ...parrafos(t.resultados),
    c.serie.length > 1 ? h(View, { wrap: false }, h(Text, { style: s.h3 }, anual ? "Ventas, gastos, EBITDA y utilidad por año" : "Ventas y EBITDA, últimos meses"), anual ? graficaAnual(c.serie) : graficaVentas(c.serie)) : null,
    c.composicion ? h(View, { wrap: false }, h(Text, { style: s.h3 }, `A dónde se van cada $100 que vende (${mesCorto(c.mes)})`), graficaComposicion(c.composicion)) : null,
    c.queSiPasa?.length ? h(View, { wrap: false },
      h(Text, { style: s.h3 }, `Qué pasa si… (utilidad neta ${anual ? `de ${c.mes}` : "de los últimos 12 meses"}: ${millones(c.queSiPasa[0].utilidadNeta - c.queSiPasa[0].cambio)})`),
      h(View, { style: s.tabla },
        h(View, { style: s.filaHead },
          h(Text, { style: [{ flex: 4, padding: 4 }, s.head] }, "Palanca"),
          h(Text, { style: [s.celda, s.head] }, "Cambio en la utilidad"),
          h(Text, { style: [s.celda, s.head] }, "Utilidad neta resultante"),
        ),
        ...c.queSiPasa.map((q, i) => h(View, { key: i, style: s.fila },
          h(Text, { style: { flex: 4, padding: 4 } }, q.palanca),
          h(Text, { style: [s.celda, { color: "#047857", fontFamily: "Helvetica-Bold" }] }, `+${millones(q.cambio)}`),
          h(Text, { style: [s.celda, { color: q.utilidadNeta < 0 ? "#dc2626" : "#0f172a" }] }, millones(q.utilidadNeta)),
        )),
      ),
      h(Text, { style: s.chico }, "Calculado por el sistema con un impuesto de renta estimado del 35 % sobre el cambio. Cada palanca se mide por separado."),
    ) : null,
    c.escenarios ? h(View, null,
      // El título va dentro del bloque que no se parte: así no queda solo al final de una página.
      h(View, { wrap: false },
        h(Text, { style: s.h2 }, `${n()}. Escenarios ${c.escenarios.anio}`),
        h(View, { style: { flexDirection: "row", gap: 8, marginBottom: 6 } },
          ...c.escenarios.lista.map(e => h(View, { key: e.nombre, style: [s.tarjeta, e.nombre === "Base" ? { borderColor: marca.principal, borderWidth: 1.5 } : {}] },
            h(Text, { style: s.kpiTxt }, e.nombre),
            h(Text, { style: [s.kpiNum, { color: e.utilidadNeta < 0 ? "#dc2626" : marca.oscuro }] }, millones(e.utilidadNeta)),
            h(Text, { style: [s.chico, { lineHeight: 1.3 }] }, `utilidad neta · ventas ${millones(e.ventas)} · EBITDA ${millones(e.ebitda)}`),
            h(Text, { style: [s.chico, { lineHeight: 1.3, marginTop: 3, color: "#475569" }] }, e.supuesto),
          )),
        ),
        graficaEscenarios(c.escenarios.lista),
        h(Text, { style: [s.muted, { marginBottom: 6 }] }, `Estimación del sistema a partir del cierre ${c.mes}${c.anterior ? ` y del crecimiento contra ${c.anterior.mes} (${Math.round(c.escenarios.crecimiento * 100)} %)` : ""}; el impuesto de renta se estima al 35 %. No reemplaza un presupuesto.`),
      ),
      ...parrafos(t.proyeccion),
    ) : null,

    proy ? h(View, null,
      h(Text, { style: s.h2, minPresenceAhead: 160 }, `${n()}. Proyección`),
      graficaProyeccion(),
      h(View, { style: { flexDirection: "row", gap: 8, marginVertical: 6 } },
        ...proy.proximos.map(m => kpi(mesCorto(m.mes), millones(m.ventas), `utilidad est. ${millones(m.utilidadNeta)}`, m.utilidadNeta < 0 ? "#dc2626" : undefined)),
        proy.anio ? kpi(`Cierre ${proy.anio.anio}`, millones(proy.anio.ventasCierre), `utilidad est. ${millones(proy.anio.utilidadCierre)}`) : null,
      ),
      h(Text, { style: [s.muted, { marginBottom: 6 }] }, proy.metodo === "estacional"
        ? `Estimación del sistema: ventas del mismo mes del año pasado × el crecimiento de los últimos 3 meses (${Math.round(((proy.crecimiento ?? 1) - 1) * 100)}% contra el año pasado), con la estructura de costos de los últimos 3 meses.`
        : "Estimación del sistema: promedio de ventas de los últimos 3 meses (no hay suficiente historia del año pasado para usar la temporada), con la estructura de costos de los últimos 3 meses."),
      ...parrafos(t.proyeccion),
    ) : null,

    h(Text, { style: s.h2, minPresenceAhead: 140 }, `${n()}. Balance e indicadores`),
    c.balance
      ? h(Text, { style: s.muted }, `Balance al ${formatoDia(c.balance.corte)}: caja ${millones(c.balance.caja)} · cartera ${millones(c.balance.cuentasPorCobrar)} · activo total ${millones(c.balance.activoTotal)} · pasivo total ${millones(c.balance.pasivoTotal)} · patrimonio ${millones(c.balance.patrimonio)}.`)
      : h(Text, { style: s.muted }, "No hay balance cargado: los indicadores de liquidez y endeudamiento quedan sin calcular."),
    c.balance ? h(View, { wrap: false }, h(Text, { style: s.h3 }, c.balanceAnterior ? "Qué tiene la empresa y cómo se financia (dos cortes)" : "Qué tiene la empresa y cómo se financia"),
      graficaBalance([c.balance, ...(c.balanceAnterior ? [c.balanceAnterior] : [])])) : null,
    h(View, { style: { marginTop: 6 } }, tablaIndicadores),
    ...parrafos(t.balanceIndicadores),

    h(Text, { style: s.h2, minPresenceAhead: 160 }, `${n()}. Caja de las próximas 13 semanas`),
    anual ? h(Text, { style: s.muted }, "Con un cierre anual, la caja usa los gastos e ingresos promedio del año (año ÷ 12).") : null,
    c.caja ? h(View, { wrap: false, style: [s.caja, { backgroundColor: "#f8fafc", borderLeftWidth: 3, borderLeftColor: NIVEL_CAJA[c.caja.nivel] }] },
      h(Text, { style: { fontFamily: "Helvetica-Bold", color: NIVEL_CAJA[c.caja.nivel] } }, c.caja.titulo),
      h(Text, null, c.caja.detalle),
      h(Text, { style: s.muted }, `Punto más bajo: ${millones(c.caja.minimo.saldo)} el ${formatoDia(c.caja.minimo.dia)}${c.caja.diasCaja !== null ? ` · Días de caja: ${c.caja.diasCaja}` : ""}`),
    ) : h(Text, { style: s.muted }, "Sin balance cargado no se puede proyectar la caja."),
    c.caja?.semanasCon?.length ? graficaCaja(c.caja.semanasCon, c.caja.semanasSin ?? []) : null,
    ...parrafos(t.caja),
    c.equilibrio ? h(Text, { style: s.muted }, `Punto de equilibrio: se necesitan ventas de ${millones(c.equilibrio.ventasNecesarias)} al mes para cubrir gastos fijos de ${millones(c.equilibrio.gastosFijos)} (margen de contribución ${Math.round(c.equilibrio.margenContribucion * 100)}%).`) : null,

    tablaClientes || t.clientes.length ? h(View, null, h(Text, { style: s.h2, minPresenceAhead: 120 }, `${n()}. Rentabilidad por cliente`), tablaClientes, ...parrafos(t.clientes)) : null,

    (t.riesgos?.length || t.oportunidades?.length) ? h(View, { wrap: false },
      h(Text, { style: s.h2 }, "Riesgos y oportunidades"),
      h(View, { style: { flexDirection: "row", gap: 10 } },
        h(View, { style: [s.tarjeta, { borderColor: "#fecaca", backgroundColor: "#fef2f2" }] },
          h(Text, { style: [s.h3, { marginTop: 0, color: "#b91c1c" }] }, "Riesgos"), ...vinetas(t.riesgos, "#b91c1c")),
        h(View, { style: [s.tarjeta, { borderColor: "#a7f3d0", backgroundColor: "#ecfdf5" }] },
          h(Text, { style: [s.h3, { marginTop: 0, color: "#047857" }] }, "Oportunidades"), ...vinetas(t.oportunidades, "#047857")),
      ),
    ) : null,

    h(Text, { style: s.h2, break: true }, "Plan de acción 30 · 60 · 90 días"),
    ...planPorPlazo.map(g => h(View, { key: g.plazo },
      h(Text, { style: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#ffffff", backgroundColor: marca.oscuro, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3, marginTop: 8, marginBottom: 5, alignSelf: "flex-start" } }, `Próximos ${g.plazo}`),
      ...g.acciones.map((r, i) => h(View, { key: i, wrap: false, style: { borderLeftWidth: 3, borderLeftColor: marca.principal, paddingLeft: 8, marginBottom: 8 } },
        h(Text, { style: { fontFamily: "Helvetica-Bold" } }, r.accion),
        h(View, { style: { flexDirection: "row", gap: 6, marginVertical: 2 } },
          r.responsable ? h(Text, { style: { fontSize: 7.5, color: marca.textoSobreClaro, backgroundColor: marca.claro, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 } }, `Responsable: ${r.responsable}`) : null,
          r.indicador ? h(Text, { style: { fontSize: 7.5, color: "#047857", backgroundColor: "#ecfdf5", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2 } }, `Meta: ${r.indicador}`) : null),
        h(Text, null, `Por qué: ${r.porque}`),
        h(Text, { style: s.muted }, `Impacto esperado: ${r.impacto}`),
      )),
    )),

    t.metasProximoMes?.length ? h(View, { wrap: false },
      h(Text, { style: s.h2 }, anual ? "Metas para el próximo reporte" : "Metas para el próximo mes"),
      h(View, { style: s.tabla },
        h(View, { style: s.filaHead },
          h(Text, { style: [{ flex: 3, padding: 4 }, s.head] }, "Indicador"),
          h(Text, { style: [{ flex: 2, padding: 4, textAlign: "right" }, s.head] }, "Hoy"),
          h(Text, { style: [{ flex: 3, padding: 4, textAlign: "right" }, s.head] }, "Meta"),
        ),
        ...t.metasProximoMes.map((m, i) => h(View, { key: i, style: s.fila },
          h(Text, { style: { flex: 3, padding: 4 } }, m.indicador),
          h(Text, { style: { flex: 2, padding: 4, textAlign: "right" } }, m.actual),
          h(Text, { style: { flex: 3, padding: 4, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#047857" } }, m.meta),
        )),
      ),
      h(Text, { style: s.muted }, "En el próximo informe se revisa si se cumplieron."),
    ) : null,

    t.preguntasContador.length ? h(View, null, h(Text, { style: s.h2 }, "Preguntas para el contador"), ...vinetas(t.preguntasContador)) : null,

    h(Text, { style: [s.muted, { marginTop: 14 }] },
      `Cifras calculadas por el sistema a partir de los estados financieros cargados (${impuestoReal ? "utilidad neta con el impuesto de renta que reportó el contador" : "utilidad neta con impuesto de renta estimado del 35%"}); las proyecciones son estimaciones. `
      + "El análisis lo redacta un asistente con inteligencia artificial sobre esas cifras: no reemplaza la revisión del contador ni constituye asesoría tributaria o legal."),
    pie,
  );

  const doc = h(Document, { title: `Informe financiero ${c.mes} - ${informe.tenant.nombre}`, author: "Felipe Gómez Jaramillo · Evoluteca CRM" }, portada, analisis);
  const buffer = await renderToBuffer(doc);
  const nombre = `informe-financiero-${c.mes}-${informe.tenant.nombre.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "")}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${nombre}"` },
  });
}
