import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { filtroOwner } from "@/lib/permisos";
import { fechaEfectiva } from "@/lib/fecha-efectiva";
import { seriesTendencias } from "@/lib/tendencias";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const fmt = (v: unknown) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v || 0));

const SYSTEM = `Eres un analista comercial que redacta el informe ejecutivo de cierre de mes para la gerencia o junta directiva de una empresa, a partir de datos reales de su CRM (ya calculados). El tono es profesional, claro y directo, orientado a decisiones.

Responde SOLO con el informe en español, sin preámbulos. Usa estas secciones con estos títulos exactos:

**Resumen ejecutivo** — 2 o 3 frases con lo esencial del mes: resultado vs. meta y el mensaje clave.
**Resultados del mes** — ventas ganadas, negocios cerrados, tasa de cierre y avance de meta, con cifras.
**Tendencia** — cómo se compara con meses anteriores (usa los % dados); qué mejora y qué se deteriora.
**Pipeline y proyección** — tamaño del pipeline abierto, valor ponderado y qué esperar el próximo mes.
**Destacados** — mejores clientes o negocios del mes.
**Riesgos** — pérdidas y sus motivos, caídas de actividad o pipeline nuevo.
**Recomendaciones** — 3 acciones concretas y priorizadas para el mes que empieza.

Apóyate SOLO en las cifras dadas; no inventes números ni nombres. Si falta información para una sección, dilo en una frase corta.`;

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." }, { status: 503 });
  }

  const permitido = await permitirYRegistrar(`ia-informe:${session.user.id}`, 10, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Espera un momento antes de generar otro informe." }, { status: 429 });

  const periodo = new Date().toISOString().slice(0, 7);
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { limiteResumenesIA: true } });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) return NextResponse.json({ error: "El informe mensual con IA no está incluido en tu plan." }, { status: 403 });
  if (limite != null) {
    const uso = await prisma.usoIA.findUnique({ where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } }, select: { cantidad: true } });
    if ((uso?.cantidad ?? 0) >= limite) {
      return NextResponse.json({ error: `Alcanzaste el límite de ${limite} acciones de IA este mes. Escríbenos para ampliar tu plan.` }, { status: 429 });
    }
  }

  const tenantId = session.user.tenantId;
  const esComercial = Object.keys(filtroOwner(session.user.rol, session.user.id)).length > 0;
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  const etapasTenant = await prisma.etapaPipeline.findMany({ where: { tenantId }, select: { key: true, nombre: true, orden: true }, orderBy: { orden: "asc" } });
  const etapasBase = etapasTenant.length ? etapasTenant : [
    { key: "PROSPECTO", nombre: "Prospecto", orden: 1 }, { key: "CALIFICADO", nombre: "Calificado", orden: 2 },
    { key: "PROPUESTA", nombre: "Propuesta", orden: 3 }, { key: "NEGOCIACION", nombre: "Negociación", orden: 4 },
  ];

  const ops = await prisma.oportunidad.findMany({
    where: { tenantId, eliminadoEn: null, ...ownerFiltro },
    select: {
      etapa: true, valor: true, probabilidad: true, creadoEn: true,
      fechaCierre: true, fechaEvento: true, extras: true, motivoPerdida: true,
      empresa: { select: { nombre: true } },
    },
  });

  // Mes reportado = mes calendario anterior (cierre de mes).
  const ahora = new Date();
  const rep = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const anioRep = rep.getFullYear(), mesRep = rep.getMonth() + 1;
  const labelRep = rep.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
  const enMesRep = (o: (typeof ops)[number]) => { const ef = fechaEfectiva(o); return ef.getFullYear() === anioRep && ef.getMonth() + 1 === mesRep; };

  const t = seriesTendencias(ops, etapasBase, ahora);
  const mesRepSerie = t.meses.find(m => m.anio === anioRep && m.mes === mesRep);

  // Meta del mes reportado.
  let metaMes: number | null = null;
  if (esComercial) {
    const mv = await prisma.metaVendedor.findUnique({ where: { tenantId_userId_anio_mes: { tenantId, userId: session.user.id, anio: anioRep, mes: mesRep } }, select: { meta: true } });
    metaMes = mv ? Number(mv.meta) : null;
  } else {
    const mm = await prisma.metaVenta.findUnique({ where: { tenantId_anio_mes: { tenantId, anio: anioRep, mes: mesRep } }, select: { valorObjetivo: true } });
    metaMes = mm ? Number(mm.valorObjetivo) : null;
  }

  // Top clientes por valor ganado en el mes reportado.
  const clienteMap = new Map<string, number>();
  for (const o of ops) {
    if (o.etapa !== "GANADA" || !enMesRep(o)) continue;
    const n = o.empresa?.nombre ?? "Sin cliente";
    clienteMap.set(n, (clienteMap.get(n) ?? 0) + Number(o.valor ?? 0));
  }
  const topClientes = Array.from(clienteMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Motivos de pérdida del mes reportado.
  const motivoMap = new Map<string, number>();
  for (const o of ops) {
    if (o.etapa !== "PERDIDA" || !enMesRep(o)) continue;
    const k = o.motivoPerdida?.trim() || "Sin especificar";
    motivoMap.set(k, (motivoMap.get(k) ?? 0) + 1);
  }
  const motivos = Array.from(motivoMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const pct = (a: number, b: number) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
  const ganadoRep = mesRepSerie?.ganado ?? 0;
  const mesPrevIdx = t.meses.findIndex(m => m.anio === anioRep && m.mes === mesRep) - 1;
  const ganadoPrev = mesPrevIdx >= 0 ? t.meses[mesPrevIdx].ganado : 0;

  const partes: string[] = [];
  partes.push(`INFORME DE CIERRE — ${labelRep.toUpperCase()}`);
  partes.push(`Alcance: ${esComercial ? `desempeño personal de ${session.user.name ?? "el vendedor"}` : "todo el equipo comercial"}.`);

  partes.push(`\nRESULTADOS DEL MES (${labelRep}):`);
  partes.push(`- Ventas ganadas: ${fmt(ganadoRep)}${metaMes != null ? ` de meta ${fmt(metaMes)} (${metaMes > 0 ? Math.round((ganadoRep / metaMes) * 100) : 0}%)` : " (sin meta definida)"}`);
  partes.push(`- Negocios cerrados: ${mesRepSerie?.ganadas ?? 0} ganados, ${mesRepSerie?.perdidas ?? 0} perdidos`);
  partes.push(`- Tasa de cierre: ${mesRepSerie?.tasa == null ? "s/d" : mesRepSerie.tasa + "%"}`);
  partes.push(`- Vs. mes anterior: ganado ${fmt(ganadoPrev)} → ${fmt(ganadoRep)} (${pct(ganadoRep, ganadoPrev) == null ? "s/d" : (pct(ganadoRep, ganadoPrev)! > 0 ? "+" : "") + pct(ganadoRep, ganadoPrev) + "%"})`);

  partes.push(`\nTENDENCIA (últimos meses, ganado):`);
  partes.push(t.meses.slice(-6).map(m => `${m.label}: ${fmt(m.ganado)}`).join(" · "));
  partes.push(`- Trimestre: ${fmt(t.trimestre.ganadoUlt3)} vs. anterior ${fmt(t.trimestre.ganadoPrev3)} (${pct(t.trimestre.ganadoUlt3, t.trimestre.ganadoPrev3) == null ? "s/d" : (pct(t.trimestre.ganadoUlt3, t.trimestre.ganadoPrev3)! > 0 ? "+" : "") + pct(t.trimestre.ganadoUlt3, t.trimestre.ganadoPrev3) + "%"}).`);
  partes.push(`- Pipeline nuevo (creado) últimos 3 meses: ${t.trimestre.creadasUlt3} vs. previos ${t.trimestre.creadasPrev3}.`);

  partes.push(`\nPIPELINE ABIERTO ACTUAL:`);
  partes.push(t.porEtapa.length ? t.porEtapa.map(e => `- ${e.nombre}: ${e.cantidad} · ${fmt(e.valor)}`).join("\n") : "- (sin oportunidades abiertas)");
  partes.push(`Total abierto: ${fmt(t.valorAbierto)} · ponderado por probabilidad: ${fmt(t.valorPonderado)}.`);

  partes.push(`\nMEJORES CLIENTES DEL MES (por valor ganado):`);
  partes.push(topClientes.length ? topClientes.map(([n, v]) => `- ${n}: ${fmt(v)}`).join("\n") : "- (sin negocios ganados en el mes)");

  partes.push(`\nMOTIVOS DE PÉRDIDA DEL MES:`);
  partes.push(motivos.length ? motivos.map(([m, n]) => `- ${m}: ${n}`).join("\n") : "- (ninguna pérdida registrada)");

  const contexto = partes.join("\n");
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const ms = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1600,
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: contexto }],
        });
        ms.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        const final = await ms.finalMessage();
        try {
          await prisma.usoIA.upsert({
            where: { tenantId_periodo: { tenantId, periodo } },
            create: { tenantId, periodo, cantidad: 1, tokensEntrada: final.usage.input_tokens, tokensSalida: final.usage.output_tokens },
            update: { cantidad: { increment: 1 }, tokensEntrada: { increment: final.usage.input_tokens }, tokensSalida: { increment: final.usage.output_tokens } },
          });
        } catch { /* el conteo no debe tumbar el informe */ }
      } catch {
        controller.enqueue(encoder.encode("\n\n_No se pudo generar el informe en este momento. Inténtalo de nuevo._"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
