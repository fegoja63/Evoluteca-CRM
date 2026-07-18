import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { permitirYRegistrar } from "@/lib/rate-limit";
import { filtroOwner } from "@/lib/permisos";
import { fechaEfectiva } from "@/lib/fecha-efectiva";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// "Pregúntale a tus datos": el usuario escribe una pregunta en lenguaje natural
// y la IA la traduce a una CONSULTA ESTRUCTURADA (métrica + agrupación + filtros)
// mediante tool-use. El código de abajo ejecuta esa consulta sobre los datos
// reales del tenant — la IA nunca produce las cifras, solo interpreta la
// pregunta. Así los números siempre son verídicos.

const METRICAS = ["conteo", "valor_total", "valor_ganado", "valor_ponderado"] as const;
const DIMENSIONES = ["mes", "etapa", "segmento", "sede", "cliente", "vendedor", "ninguna"] as const;
const ETAPAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"] as const;

type Spec = {
  metrica: (typeof METRICAS)[number];
  dimension: (typeof DIMENSIONES)[number];
  chart?: "barras" | "tabla" | "numero";
  titulo?: string;
  filtros?: {
    etapa?: string; segmento?: string; sede?: string; anio?: number;
    soloAbiertas?: boolean; vendedor?: string;
  };
};

const NOMBRE_ETAPA: Record<string, string> = {
  PROSPECTO: "Prospecto", CALIFICADO: "Calificado", PROPUESTA: "Propuesta",
  NEGOCIACION: "Negociación", GANADA: "Ganada", PERDIDA: "Perdida",
};

const fmtMoneda = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const fmtEntero = (v: number) => new Intl.NumberFormat("es-CO").format(Math.round(v));

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "La IA no está configurada. Falta la clave ANTHROPIC_API_KEY en el servidor." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const pregunta = String(body?.pregunta ?? "").trim();
  if (!pregunta) return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
  if (pregunta.length > 300) return NextResponse.json({ error: "La pregunta es muy larga." }, { status: 400 });

  const permitido = await permitirYRegistrar(`ia-preguntar:${session.user.id}`, 15, 60 * 1000);
  if (!permitido) return NextResponse.json({ error: "Demasiadas preguntas seguidas. Espera un momento." }, { status: 429 });

  // Cupo mensual de IA compartido.
  const periodo = new Date().toISOString().slice(0, 7);
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { limiteResumenesIA: true } });
  const limite = tenant?.limiteResumenesIA ?? null;
  if (limite === 0) return NextResponse.json({ error: "Las consultas con IA no están incluidas en tu plan." }, { status: 403 });
  if (limite != null) {
    const uso = await prisma.usoIA.findUnique({ where: { tenantId_periodo: { tenantId: session.user.tenantId, periodo } }, select: { cantidad: true } });
    if ((uso?.cantidad ?? 0) >= limite) {
      return NextResponse.json({ error: `Alcanzaste el límite de ${limite} acciones de IA este mes. Escríbenos para ampliar tu plan.` }, { status: 429 });
    }
  }

  const tenantId = session.user.tenantId;
  const ownerFiltro = filtroOwner(session.user.rol, session.user.id);

  // Traer las oportunidades una vez y derivar los valores disponibles para
  // filtros (segmentos, sedes, años), que se le pasan al modelo para que use
  // valores reales.
  const [ops, usuarios] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { tenantId, eliminadoEn: null, ...ownerFiltro },
      select: {
        etapa: true, valor: true, probabilidad: true, creadoEn: true,
        fechaCierre: true, fechaEvento: true, extras: true, segmento: true, sede: true,
        creadoBy: true, empresa: { select: { nombre: true } },
      },
    }),
    prisma.usuario.findMany({ where: { tenantId }, select: { id: true, nombre: true } }),
  ]);
  const nombreUsuario = (id: string | null) => usuarios.find(u => u.id === id)?.nombre ?? "Sin asignar";

  const segmentos = Array.from(new Set(ops.map(o => o.segmento?.trim()).filter(Boolean))) as string[];
  const sedes = Array.from(new Set(ops.map(o => o.sede?.trim()).filter(Boolean))) as string[];
  const anios = Array.from(new Set(ops.map(o => fechaEfectiva(o).getFullYear()))).sort();

  // ── La IA traduce la pregunta a una consulta estructurada (tool-use) ──
  const client = new Anthropic();
  const hoy = new Date();
  const SYSTEM = `Eres un traductor de preguntas comerciales a consultas estructuradas sobre una base de oportunidades de venta de un CRM. NO respondes con datos ni cifras: solo llamas a la herramienta "consultar" con los parámetros que mejor representen la pregunta del usuario.

Hoy es ${hoy.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}: "este año" = ${hoy.getFullYear()}, "el año pasado" = ${hoy.getFullYear() - 1}, "este mes" = el mes en curso.

Guía:
- metrica: "conteo" (número de oportunidades), "valor_total" (suma de su valor), "valor_ganado" (valor de las que están GANADA), "valor_ponderado" (valor × probabilidad).
- dimension: cómo agrupar el resultado. "ninguna" para un solo número total.
- filtros.etapa: una de ${ETAPAS.join(", ")} (solo si la pregunta menciona una etapa).
- filtros.soloAbiertas: true si pregunta por el pipeline abierto/activo (excluye ganadas y perdidas).
- filtros.segmento: uno de: ${segmentos.length ? segmentos.join(", ") : "(ninguno disponible)"}.
- filtros.sede: una de: ${sedes.length ? sedes.join(", ") : "(ninguna disponible)"}.
- filtros.anio: uno de: ${anios.length ? anios.join(", ") : "(ninguno)"}.
- filtros.vendedor: nombre aproximado de uno de: ${usuarios.map(u => u.nombre).join(", ") || "(ninguno)"}.
- titulo: un título corto y legible del resultado (ej. "Valor ganado por mes en 2026").
Elige valores solo de las listas dadas. Si la pregunta no encaja con estos datos, igual llama a la herramienta con tu mejor interpretación.`;

  let msg;
  try {
    msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 500,
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: [{
        name: "consultar",
        description: "Ejecuta una consulta agregada sobre las oportunidades del CRM.",
        input_schema: {
          type: "object",
          properties: {
            metrica: { type: "string", enum: METRICAS as unknown as string[] },
            dimension: { type: "string", enum: DIMENSIONES as unknown as string[] },
            chart: { type: "string", enum: ["barras", "tabla", "numero"] },
            titulo: { type: "string" },
            filtros: {
              type: "object",
              properties: {
                etapa: { type: "string", enum: ETAPAS as unknown as string[] },
                segmento: { type: "string" },
                sede: { type: "string" },
                anio: { type: "number" },
                soloAbiertas: { type: "boolean" },
                vendedor: { type: "string" },
              },
            },
          },
          required: ["metrica", "dimension"],
        },
      }],
      tool_choice: { type: "tool", name: "consultar" },
      messages: [{ role: "user", content: pregunta }],
    });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la pregunta en este momento. Inténtalo de nuevo." }, { status: 502 });
  }

  const toolUse = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  const spec = toolUse?.input as Spec | undefined;
  if (!spec || !METRICAS.includes(spec.metrica) || !DIMENSIONES.includes(spec.dimension)) {
    return NextResponse.json({ error: "No entendí bien la pregunta. Intenta ser más específico, por ejemplo: “valor ganado por mes este año”." }, { status: 422 });
  }

  // ── Ejecutar la consulta de forma determinista sobre los datos reales ──
  const f = spec.filtros ?? {};
  let filtradas = ops;
  if (f.etapa && (ETAPAS as readonly string[]).includes(f.etapa)) filtradas = filtradas.filter(o => o.etapa === f.etapa);
  if (f.soloAbiertas) filtradas = filtradas.filter(o => o.etapa !== "GANADA" && o.etapa !== "PERDIDA");
  if (f.segmento) filtradas = filtradas.filter(o => o.segmento?.trim().toLowerCase() === f.segmento!.toLowerCase());
  if (f.sede) filtradas = filtradas.filter(o => o.sede?.trim().toLowerCase() === f.sede!.toLowerCase());
  if (typeof f.anio === "number") filtradas = filtradas.filter(o => fechaEfectiva(o).getFullYear() === f.anio);
  if (f.vendedor) {
    const uid = usuarios.find(u => u.nombre.toLowerCase().includes(f.vendedor!.toLowerCase()))?.id;
    if (uid) filtradas = filtradas.filter(o => o.creadoBy === uid);
  }

  const metricVal = (arr: typeof ops): number => {
    if (spec.metrica === "conteo") return arr.length;
    if (spec.metrica === "valor_ganado") return arr.filter(o => o.etapa === "GANADA").reduce((a, o) => a + Number(o.valor ?? 0), 0);
    if (spec.metrica === "valor_ponderado") return arr.reduce((a, o) => a + Number(o.valor ?? 0) * ((o.probabilidad ?? 50) / 100), 0);
    return arr.reduce((a, o) => a + Number(o.valor ?? 0), 0); // valor_total
  };

  const mesLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
  };

  type Punto = { label: string; value: number };
  let datos: Punto[] = [];
  if (spec.dimension === "ninguna") {
    datos = [{ label: spec.titulo ?? "Total", value: metricVal(filtradas) }];
  } else {
    const grupos = new Map<string, typeof ops>();
    for (const o of filtradas) {
      let key: string;
      switch (spec.dimension) {
        case "mes": { const ef = fechaEfectiva(o); key = `${ef.getFullYear()}-${String(ef.getMonth() + 1).padStart(2, "0")}`; break; }
        case "etapa": key = NOMBRE_ETAPA[o.etapa] ?? o.etapa; break;
        case "segmento": key = o.segmento?.trim() || "Sin segmento"; break;
        case "sede": key = o.sede?.trim() || "Sin sede"; break;
        case "cliente": key = o.empresa?.nombre || "Sin cliente"; break;
        case "vendedor": key = nombreUsuario(o.creadoBy); break;
        default: key = "—";
      }
      const g = grupos.get(key) ?? [];
      g.push(o); grupos.set(key, g);
    }
    datos = Array.from(grupos.entries()).map(([label, arr]) => ({ label, value: metricVal(arr) }));
    if (spec.dimension === "mes") {
      datos.sort((a, b) => a.label.localeCompare(b.label));
      datos = datos.map(d => ({ label: mesLabel(d.label), value: d.value }));
    } else {
      datos.sort((a, b) => b.value - a.value);
      datos = datos.slice(0, 12);
    }
  }

  const esMoneda = spec.metrica !== "conteo";
  const total = datos.reduce((a, d) => a + d.value, 0);
  const fmtVal = (v: number) => (esMoneda ? fmtMoneda(v) : fmtEntero(v));

  let resumen: string;
  if (datos.length === 0) {
    resumen = "No hay datos que coincidan con esa pregunta.";
  } else if (spec.dimension === "ninguna" || datos.length === 1) {
    resumen = `${datos[0].label}: ${fmtVal(datos[0].value)}.`;
  } else {
    const top = [...datos].sort((a, b) => b.value - a.value)[0];
    resumen = `Total: ${fmtVal(total)} en ${datos.length} grupos. Más alto: ${top.label} (${fmtVal(top.value)}).`;
  }

  // Registrar consumo (best-effort).
  try {
    await prisma.usoIA.upsert({
      where: { tenantId_periodo: { tenantId, periodo } },
      create: { tenantId, periodo, cantidad: 1, tokensEntrada: msg.usage.input_tokens, tokensSalida: msg.usage.output_tokens },
      update: { cantidad: { increment: 1 }, tokensEntrada: { increment: msg.usage.input_tokens }, tokensSalida: { increment: msg.usage.output_tokens } },
    });
  } catch { /* el conteo no debe tumbar la respuesta */ }

  return NextResponse.json({
    titulo: spec.titulo ?? "Resultado",
    chart: spec.chart ?? (spec.dimension === "ninguna" ? "numero" : "barras"),
    formato: esMoneda ? "moneda" : "entero",
    datos,
    resumen,
  }, { headers: { "Cache-Control": "no-store" } });
}
