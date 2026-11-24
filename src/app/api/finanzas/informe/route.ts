import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { exigirAccesoFinanzas } from "@/lib/finanzas/acceso";
import { cargarDatosCaja } from "@/lib/finanzas/datos";
import { contextoFinanciero } from "@/lib/finanzas/contexto-ia";
import { verificarCupoIA, registrarUsoIA } from "@/lib/finanzas/cupo-ia";
import { calcularCifras, informeTextoSchema, limpiarTexto, SYSTEM_INFORME, type CifrasInforme, type FilaResultados } from "@/lib/finanzas/informe";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Informe de análisis financiero del mes (ver lib/finanzas/informe.ts).
// GET: los informes guardados (el más reciente primero). POST: genera uno
// nuevo con las cifras de hoy y lo guarda. Una acción de IA por informe.

export async function GET() {
  const acceso = await exigirAccesoFinanzas("leer");
  if ("error" in acceso) return acceso.error;
  const informes = await prisma.informeFinanciero.findMany({
    where: { tenantId: acceso.tenantId }, orderBy: { creadoEn: "desc" }, take: 24,
    select: { id: true, mes: true, creadoEn: true, cifras: true, texto: true },
  });
  return NextResponse.json({ informes });
}

const mm = (v: number) => Math.round(v / 100_000) / 10;
const enMillones = (f: FilaResultados | null) => f && Object.fromEntries(Object.entries(f).map(([k, v]) => [k, typeof v === "number" ? mm(v) : v]));

/** Lo que se le agrega al resumen del Gerente IA: la comparación del mes (o del año). */
function comparativo(c: CifrasInforme) {
  if (c.modo === "anual") {
    return {
      anioDelInforme: c.mes,
      anioActual: enMillones(c.actual),
      anioAnterior: enMillones(c.anterior) ?? "no cargado",
      aniosCargados: c.serie.map(enMillones),
      salud: c.salud ?? null,
      composicion: c.composicion ? { cadaCienPesosVendidos: c.composicion } : null,
      escenarios: c.escenarios ? {
        anio: c.escenarios.anio,
        crecimientoDelUltimoAnio: `${Math.round(c.escenarios.crecimiento * 100)} %`,
        lista: c.escenarios.lista.map(e => ({ nombre: e.nombre, supuesto: e.supuesto, ventas: mm(e.ventas), ebitda: mm(e.ebitda), utilidadNeta: mm(e.utilidadNeta) })),
      } : null,
      queSiPasa: (c.queSiPasa ?? []).map(q => ({ palanca: q.palanca, cambioEnUtilidad: mm(q.cambio), utilidadNetaResultante: mm(q.utilidadNeta) })),
      balanceAnterior: c.balanceAnterior ? Object.fromEntries(Object.entries(c.balanceAnterior).map(([k, v]) => [k, typeof v === "number" ? mm(v) : v])) : null,
    };
  }
  return {
    mesDelInforme: c.mes,
    cierreAnualDelContador: c.cierreAnual ? enMillones(c.cierreAnual) : null,
    mesActual: enMillones(c.actual),
    mesAnterior: enMillones(c.anterior) ?? "no cargado",
    mismoMesDelAnioPasado: enMillones(c.anioAnterior) ?? "no cargado",
    ultimos12Meses: c.ultimos12 ? { ...enMillones(c.ultimos12), meses: c.ultimos12.meses } : null,
    // Ya calculados por el sistema: la IA los lee y los explica, no los recalcula.
    salud: c.salud ?? null,
    composicion: c.composicion ? { cadaCienPesosVendidos: c.composicion } : null,
    queSiPasa12Meses: (c.queSiPasa ?? []).map(q => ({ palanca: q.palanca, cambioEnUtilidad: mm(q.cambio), utilidadNetaResultante: mm(q.utilidadNeta) })),
    proyeccion: c.proyeccion ? {
      metodo: c.proyeccion.metodo === "estacional"
        ? "mismo mes del año pasado × crecimiento de los últimos 3 meses contra el año pasado"
        : "promedio de los últimos 3 meses",
      crecimientoContraAnioPasado: c.proyeccion.crecimiento,
      proximosMeses: c.proyeccion.proximos.map(m => ({ mes: m.mes, ventas: mm(m.ventas), utilidadNeta: mm(m.utilidadNeta) })),
      cierreDelAnio: c.proyeccion.anio ? {
        anio: c.proyeccion.anio.anio, mesesReales: c.proyeccion.anio.mesesReales,
        ventasReales: mm(c.proyeccion.anio.ventasReales), utilidadReal: mm(c.proyeccion.anio.utilidadReal),
        ventasCierre: mm(c.proyeccion.anio.ventasCierre), utilidadCierre: mm(c.proyeccion.anio.utilidadCierre),
      } : null,
    } : null,
  };
}

export async function POST() {
  const acceso = await exigirAccesoFinanzas("editar");
  if ("error" in acceso) return acceso.error;
  const { tenantId } = acceso;
  const session = await auth();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." }, { status: 503 });
  }

  const [datos, tenant, rentabilidad] = await Promise.all([
    cargarDatosCaja(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { nombre: true } }),
    prisma.rentabilidadCliente.findMany({ where: { tenantId } }),
  ]);
  const rentabilidadClientes = rentabilidad.map(f => ({ cliente: f.cliente, ventas: Number(f.ventas), costo: Number(f.costo), diasPago: f.diasPago }));
  const cifras = calcularCifras({ empresa: tenant?.nombre ?? "", ...datos, rentabilidadClientes });
  if (!cifras) {
    return NextResponse.json({ error: "Primero suba sus estados financieros (pestaña Subir estados): un cierre anual o al menos un mes." }, { status: 400 });
  }

  const permitido = await permitirYRegistrar(`ia-informe:${session?.user?.id ?? tenantId}`, 3, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Ya se está generando un informe. Espere un momento." }, { status: 429 });
  const sinCupo = await verificarCupoIA(tenantId);
  if (sinCupo) return sinCupo;

  const resumen = { ...contextoFinanciero({ empresa: tenant?.nombre ?? "", ...datos, rentabilidadClientes }), comparativoDelMes: comparativo(cifras) };

  const client = new Anthropic();
  let response;
  try {
    response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      output_config: { effort: "high", format: betaZodOutputFormat(informeTextoSchema) },
      system: SYSTEM_INFORME,
      messages: [{ role: "user", content: `<datos>\n${JSON.stringify(resumen)}\n</datos>\n\nEscriba el informe de análisis financiero de ${cifras.mes}.` }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "La IA está muy ocupada en este momento. Intente de nuevo en un minuto." }, { status: 503 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[finanzas/informe] error de la API:", error.status, error.message);
      return NextResponse.json({ error: "No se pudo generar el informe en este momento. Inténtelo de nuevo." }, { status: 502 });
    }
    throw error;
  }
  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens" || !response.parsed_output) {
    return NextResponse.json({ error: "La IA no pudo terminar el informe. Inténtelo de nuevo." }, { status: 502 });
  }
  await registrarUsoIA(tenantId, response.usage);

  const informe = await prisma.informeFinanciero.create({
    data: { tenantId, mes: cifras.mes, cifras, texto: limpiarTexto(response.parsed_output), creadoBy: session?.user?.id ?? null },
    select: { id: true, mes: true, creadoEn: true, cifras: true, texto: true },
  });
  return NextResponse.json({ informe }, { status: 201 });
}
