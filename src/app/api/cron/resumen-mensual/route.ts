import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Resend } from "resend";
import { EtapaOportunidad } from "@prisma/client";
import { fechaEfectiva } from "@/lib/fecha-efectiva";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BASE_URL = process.env.NEXTAUTH_URL ?? "https://evoluteca-crm-six.vercel.app";
const LOGO_FGJ = "https://evoluteca-crm-six.vercel.app/Logo%20FGJ.jpg";

const ETAPAS_ACTIVAS: EtapaOportunidad[] = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"];

function fmt(v: number | null | undefined) {
  const n = Number(v ?? 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `$${Math.round(n / 1_000)}K`;
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function wrapper(inner: string) {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">${inner}</div>`;
}
function header(subtitulo: string, logoUrl?: string | null) {
  return `<div style="background:#1e3a8a;padding:20px 24px;border-radius:12px 12px 0 0;display:flex;align-items:center;justify-content:space-between">
    <div>
      <h2 style="color:white;margin:0;font-size:18px">Evoluteca CRM</h2>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:13px">${subtitulo}</p>
    </div>
    <img src="${logoUrl || LOGO_FGJ}" alt="Logo" style="height:48px;width:auto;border-radius:8px;object-fit:contain;background:white;padding:4px" />
  </div>`;
}
function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;background:#2563eb;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">${label} →</a>`;
}
function footer() {
  return `<p style="margin-top:20px;font-size:11px;color:#94a3b8">Este resumen mensual se envía automáticamente el primer día de cada mes a administradores y gerentes. Puedes desactivar los correos automáticos en Configuración.</p>`;
}
function seccion(titulo: string, cuerpoHtml: string, bg: string) {
  return `<div style="margin-top:18px">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#334155">${titulo}</p>
    <div style="background:${bg};border-radius:10px;padding:12px">${cuerpoHtml}</div>
  </div>`;
}
// Tarjeta compacta de KPI.
function kpi(valor: string, label: string, color = "#1e293b") {
  return `<div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center">
    <p style="margin:0;font-size:18px;font-weight:800;color:${color}">${valor}</p>
    <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">${label}</p>
  </div>`;
}
// Barra de cumplimiento (0–100+%).
function barraCumplimiento(pct: number | null, ganado: number, meta: number | null): string {
  if (meta == null || meta <= 0) {
    return `<p style="margin:0;font-size:12px;color:#94a3b8">Sin meta definida para este período.</p>`;
  }
  const p = pct ?? 0;
  const ancho = Math.max(2, Math.min(100, p));
  const color = p >= 100 ? "#10b981" : p >= 70 ? "#f59e0b" : "#ef4444";
  return `<div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
      <span style="font-size:20px;font-weight:800;color:${color}">${p}%</span>
      <span style="font-size:11px;color:#94a3b8">${fmt(ganado)} de ${fmt(meta)}</span>
    </div>
    <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden">
      <div style="height:8px;width:${ancho}%;background:${color};border-radius:99px"></div>
    </div>
  </div>`;
}

type TenantMin = { id: string; nombre: string; emailsActivos: boolean; logoUrl: string | null };

// Ventana del mes que acaba de cerrar (relativa a "ahora"), anclada a Bogotá
// (UTC-5). Al correr el día 1, resume el mes anterior completo.
function ventanaMesCerrado() {
  const ahora = new Date();
  // Componentes de Bogotá: se resta 5h para caer en el día/mes correcto.
  const bog = new Date(ahora.getTime() - 5 * 3_600_000);
  const anioAhora = bog.getUTCFullYear();
  const mesAhora = bog.getUTCMonth(); // 0-indexed, mes en curso
  const curMesStart = new Date(Date.UTC(anioAhora, mesAhora, 1, 5, 0, 0)); // fin de la ventana
  const prevStart = new Date(Date.UTC(anioAhora, mesAhora - 1, 1, 5, 0, 0)); // inicio del mes cerrado
  const cerrado = new Date(Date.UTC(anioAhora, mesAhora - 1, 1));
  const anioCerrado = cerrado.getUTCFullYear();
  const mesCerrado1 = cerrado.getUTCMonth() + 1; // 1-indexed (para MetaVenta)
  const inicioAnio = new Date(Date.UTC(anioCerrado, 0, 1, 5, 0, 0)); // acumulado del año del mes cerrado
  const label = prevStart.toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" });
  return { prevStart, curMesStart, inicioAnio, anioCerrado, mesCerrado1, label };
}

async function construirDatos(tenant: TenantMin) {
  const v = ventanaMesCerrado();
  const T = { tenantId: tenant.id, eliminadoEn: null };

  const [ganadas, perdidasCambios, activas, metaMesRow, metaAnioRow, metasMensuales, nuevosClientes, actividadMes] =
    await Promise.all([
      // Ganadas del tenant (se filtran por mes/año en JS con fechaEfectiva).
      prisma.oportunidad.findMany({
        where: { ...T, etapa: "GANADA" },
        select: { titulo: true, valor: true, fechaCierre: true, fechaEvento: true, creadoEn: true, extras: true, creadoBy: true, empresa: { select: { nombre: true } } },
      }),
      // Perdidas del mes: por el cambio de etapa real a PERDIDA dentro de la ventana.
      prisma.cambioEtapa.findMany({
        where: { etapaNueva: "PERDIDA", creadoEn: { gte: v.prevStart, lt: v.curMesStart }, oportunidad: { ...T } },
        select: { oportunidad: { select: { id: true, valor: true, motivoPerdida: true } } },
      }),
      // Pipeline activo actual (foto de hoy).
      prisma.oportunidad.findMany({ where: { ...T, etapa: { in: ETAPAS_ACTIVAS } }, select: { valor: true } }),
      prisma.metaVenta.findFirst({ where: { tenantId: tenant.id, anio: v.anioCerrado, mes: v.mesCerrado1 }, select: { valorObjetivo: true } }),
      prisma.metaVenta.findFirst({ where: { tenantId: tenant.id, anio: v.anioCerrado, mes: null }, select: { valorObjetivo: true } }),
      prisma.metaVenta.findMany({ where: { tenantId: tenant.id, anio: v.anioCerrado, mes: { not: null } }, select: { valorObjetivo: true } }),
      prisma.empresa.count({ where: { tenantId: tenant.id, eliminadoEn: null, creadoEn: { gte: v.prevStart, lt: v.curMesStart } } }),
      prisma.actividad.count({ where: { tenantId: tenant.id, fecha: { gte: v.prevStart, lt: v.curMesStart } } }),
    ]);

  // Ganadas del mes cerrado y acumuladas del año, por fecha efectiva.
  const enMes = (o: { fechaCierre: Date | null; fechaEvento: Date | null; creadoEn: Date; extras: unknown }) => {
    const f = fechaEfectiva(o);
    return f >= v.prevStart && f < v.curMesStart;
  };
  const enAnio = (o: { fechaCierre: Date | null; fechaEvento: Date | null; creadoEn: Date; extras: unknown }) => {
    const f = fechaEfectiva(o);
    return f >= v.inicioAnio && f < v.curMesStart;
  };
  const ganadasMes = ganadas.filter(enMes);
  const ganadasAnio = ganadas.filter(enAnio);
  const valorGanadoMes = ganadasMes.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  const valorGanadoAnio = ganadasAnio.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  // Lista de ganadas del mes con nombre de cliente y valor (mayor a menor).
  const ganadasLista = ganadasMes
    .map(o => ({ nombre: o.empresa?.nombre?.trim() || o.titulo || "Cliente", valor: Number(o.valor ?? 0) }))
    .sort((a, b) => b.valor - a.valor);

  // Perdidas del mes (oportunidades únicas).
  const perdidasMap = new Map<string, { valor: number; motivo: string | null }>();
  for (const c of perdidasCambios) {
    const o = c.oportunidad;
    if (o && !perdidasMap.has(o.id)) perdidasMap.set(o.id, { valor: Number(o.valor ?? 0), motivo: o.motivoPerdida });
  }
  const perdidas = Array.from(perdidasMap.values());
  const valorPerdidoMes = perdidas.reduce((a, o) => a + o.valor, 0);
  // Motivos con nº de casos y valor perdido, para graficarlos.
  const motivosMap = new Map<string, { count: number; valor: number }>();
  for (const o of perdidas) {
    const m = o.motivo?.trim() || "Sin motivo";
    const e = motivosMap.get(m) ?? { count: 0, valor: 0 };
    e.count++; e.valor += o.valor;
    motivosMap.set(m, e);
  }
  const motivos = Array.from(motivosMap.entries())
    .map(([motivo, x]) => ({ motivo, count: x.count, valor: x.valor }))
    .sort((a, b) => b.count - a.count || b.valor - a.valor);

  // Ticket promedio del mes (solo ganadas con valor).
  const ganadasConValor = ganadasMes.filter(o => Number(o.valor ?? 0) > 0);
  const ticketMes = ganadasConValor.length > 0 ? Math.round(valorGanadoMes / ganadasConValor.length) : 0;

  // Tasa de cierre del mes.
  const cerradas = ganadasMes.length + perdidas.length;
  const tasaCierre = cerradas > 0 ? Math.round((ganadasMes.length / cerradas) * 100) : 0;

  // Cumplimiento del mes y del año acumulado.
  const metaMes = metaMesRow ? Number(metaMesRow.valorObjetivo) : null;
  const cumpMes = metaMes && metaMes > 0 ? Math.round((valorGanadoMes / metaMes) * 100) : null;
  // Meta anual: la meta anual explícita, o la suma de las metas mensuales del año.
  const metaAnio = metaAnioRow ? Number(metaAnioRow.valorObjetivo)
    : (metasMensuales.length > 0 ? metasMensuales.reduce((a, m) => a + Number(m.valorObjetivo), 0) : null);
  const cumpAnio = metaAnio && metaAnio > 0 ? Math.round((valorGanadoAnio / metaAnio) * 100) : null;

  const pipelineValor = activas.reduce((a, o) => a + Number(o.valor ?? 0), 0);

  // Ganado del mes por vendedor.
  const porVendedorMap = new Map<string, number>();
  for (const o of ganadasMes) {
    const k = o.creadoBy ?? "sin";
    porVendedorMap.set(k, (porVendedorMap.get(k) ?? 0) + Number(o.valor ?? 0));
  }
  let porVendedor: { nombre: string; valor: number }[] = [];
  if (porVendedorMap.size > 0) {
    const ids = Array.from(porVendedorMap.keys()).filter(k => k !== "sin");
    const usuarios = ids.length ? await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } }) : [];
    const nombreDe = (id: string) => usuarios.find(u => u.id === id)?.nombre ?? "Sin asignar";
    porVendedor = Array.from(porVendedorMap.entries())
      .map(([id, valor]) => ({ nombre: id === "sin" ? "Sin asignar" : nombreDe(id), valor }))
      .sort((a, b) => b.valor - a.valor).slice(0, 6);
  }

  // Sin nada que reportar: ni ventas, ni pérdidas, ni pipeline, ni actividad.
  if (ganadasMes.length === 0 && perdidas.length === 0 && pipelineValor === 0 && actividadMes === 0) return null;

  return {
    label: v.label,
    ganadasMes: { count: ganadasMes.length, valor: valorGanadoMes, lista: ganadasLista },
    perdidas: { count: perdidas.length, valor: valorPerdidoMes, motivos },
    ticketMes, tasaCierre,
    metaMes, cumpMes, metaAnio, cumpAnio,
    valorGanadoAnio,
    pipeline: { valor: pipelineValor, count: activas.length },
    nuevosClientes, actividadMes, porVendedor,
  };
}

type Datos = NonNullable<Awaited<ReturnType<typeof construirDatos>>>;

function render(nombre: string, tenant: TenantMin, d: Datos): { subject: string; html: string } {
  const mesTitulo = d.label.charAt(0).toUpperCase() + d.label.slice(1);

  const kpis = `<div style="display:flex;gap:8px;margin-top:4px">
    ${kpi(fmt(d.ganadasMes.valor), "Ganado del mes", "#059669")}
    ${kpi(d.ticketMes > 0 ? fmt(d.ticketMes) : "—", "Ticket promedio")}
    ${kpi(`${d.tasaCierre}%`, "Tasa de cierre")}
  </div>`;

  const cumplimiento = `<div style="display:flex;gap:12px">
    <div style="flex:1">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#64748b">Cuota del mes</p>
      ${barraCumplimiento(d.cumpMes, d.ganadasMes.valor, d.metaMes)}
    </div>
    <div style="flex:1">
      <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#64748b">Año acumulado</p>
      ${barraCumplimiento(d.cumpAnio, d.valorGanadoAnio, d.metaAnio)}
    </div>
  </div>`;

  let ventas = `<p style="margin:0;font-size:13px;color:#334155"><strong>${d.ganadasMes.count}</strong> operación(es) ganada(s) por <strong>${fmt(d.ganadasMes.valor)}</strong>${
    d.ganadasMes.count === 0 ? " — sin ventas cerradas este mes." : ":"
  }</p>`;
  if (d.ganadasMes.lista.length > 0) {
    ventas += `<div style="margin-top:8px">` + d.ganadasMes.lista.slice(0, 8).map(g =>
      `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #dcfce7">
        <span style="font-size:12px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${g.nombre}</span>
        <span style="font-size:12px;font-weight:700;color:#059669;flex-shrink:0">${fmt(g.valor)}</span>
      </div>`).join("") + `</div>`;
    if (d.ganadasMes.lista.length > 8) {
      ventas += `<p style="margin:8px 0 0;font-size:11px;color:#94a3b8">+ ${d.ganadasMes.lista.length - 8} venta(s) más</p>`;
    }
  }

  let perdidasHtml = `<p style="margin:0;font-size:13px;color:#334155"><strong>${d.perdidas.count}</strong> oportunidad(es) perdida(s)${
    d.perdidas.count > 0 ? ` por <strong>${fmt(d.perdidas.valor)}</strong>. Razones:` : "."
  }</p>`;
  if (d.perdidas.motivos.length > 0) {
    const maxM = d.perdidas.motivos[0].count || 1;
    perdidasHtml += `<div style="margin-top:10px">` + d.perdidas.motivos.map(m => {
      const pct = Math.max(6, Math.round((m.count / maxM) * 100));
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:#334155;margin-bottom:3px">
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.motivo}</span>
          <span style="flex-shrink:0;color:#94a3b8"><strong style="color:#dc2626">${m.count}</strong> · ${fmt(m.valor)}</span>
        </div>
        <div style="height:8px;background:#fee2e2;border-radius:99px;overflow:hidden"><div style="height:8px;width:${pct}%;background:#ef4444;border-radius:99px"></div></div>
      </div>`;
    }).join("") + `</div>`;
  }

  const cartera = `<p style="margin:0;font-size:13px;color:#334155">Pipeline activo hoy: <strong>${fmt(d.pipeline.valor)}</strong> en <strong>${d.pipeline.count}</strong> oportunidad(es).</p>
    <p style="margin:6px 0 0;font-size:13px;color:#334155">Clientes nuevos en el mes: <strong>${d.nuevosClientes}</strong> · Actividad registrada: <strong>${d.actividadMes}</strong> toque(s).</p>`;

  let vendedores = "";
  if (d.porVendedor.length > 0) {
    const max = d.porVendedor[0].valor || 1;
    vendedores = d.porVendedor.map(x => {
      const pct = Math.max(4, Math.round((x.valor / max) * 100));
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:12px;color:#475569;width:120px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.nombre}</span>
        <div style="flex:1;height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden"><div style="height:8px;width:${pct}%;background:#3b82f6;border-radius:99px"></div></div>
        <span style="font-size:12px;font-weight:700;color:#1e293b;width:56px;text-align:right;flex-shrink:0">${fmt(x.valor)}</span>
      </div>`;
    }).join("");
  } else {
    vendedores = `<p style="margin:0;font-size:12px;color:#94a3b8">Sin ventas asignadas este mes.</p>`;
  }

  const html = wrapper(`${header(`Resumen mensual · ${mesTitulo}`, tenant.logoUrl)}
    <div style="background:#f8fafc;padding:22px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
      <p style="font-size:14px;color:#64748b;margin:0 0 14px">Hola <strong>${nombre}</strong>, este es el resumen de <strong>${tenant.nombre}</strong> en ${d.label}:</p>
      ${kpis}
      ${seccion("🎯 Cumplimiento de cuota", cumplimiento, "#eef2ff")}
      ${seccion("🏆 Ventas del mes", ventas, "#f0fdf4")}
      ${seccion("📉 Pérdidas del mes", perdidasHtml, "#fef2f2")}
      ${seccion("👥 Cartera y actividad", cartera, "#f8fafc")}
      ${seccion("🧑‍💼 Ganado por vendedor", vendedores, "#eff6ff")}
      <div style="margin-top:18px">${btn(`${BASE_URL}/dashboard/reportes`, "Ver Reportes")}</div>
      ${footer()}
    </div>`);

  return { subject: `📊 Resumen mensual (${mesTitulo}) — ${tenant.nombre}`, html };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "1" || searchParams.get("dryRun") === "true";

  // Doble vía: Bearer CRON_SECRET (envío real) o sesión ADMIN (vista previa HTML).
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const esCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;

  if (!esCron) {
    const session = await auth();
    if (session?.user?.rol !== "ADMINISTRADOR") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { id: true, nombre: true, emailsActivos: true, logoUrl: true },
    });
    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    const d = await construirDatos(tenant);
    if (!d) return NextResponse.json({ preview: true, vacio: true, mensaje: "No hay datos para resumir el mes cerrado." });
    const { html } = render(session.user.name ?? "", tenant, d);
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // ── Vía cron: un correo por tenant, a sus ADMINISTRADORES y GERENTES ──
  let resend: Resend | null = null;
  if (!dryRun) {
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  const tenants = await prisma.tenant.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, emailsActivos: true, logoUrl: true },
  });

  let enviados = 0, generados = 0, tenantsOmitidos = 0;
  const errores: string[] = [];
  let muestraHtml: string | null = null;

  for (const tenant of tenants) {
    try {
      if (!tenant.emailsActivos) { tenantsOmitidos++; continue; }
      const destinatarios = await prisma.usuario.findMany({
        where: { tenantId: tenant.id, activo: true, rol: { in: ["ADMINISTRADOR", "GERENTE"] } },
        select: { nombre: true, email: true },
      });
      const conCorreo = destinatarios.filter(u => !!u.email);
      if (conCorreo.length === 0) { tenantsOmitidos++; continue; }

      const d = await construirDatos(tenant);
      if (!d) { tenantsOmitidos++; continue; }

      for (const u of conCorreo) {
        const { subject, html } = render(u.nombre, tenant, d);
        if (dryRun) { generados++; if (!muestraHtml) muestraHtml = html; continue; }
        const { error } = await resend!.emails.send({
          from: "Evoluteca CRM <noreply@evoluteca.com>",
          to: u.email!,
          subject,
          html,
        });
        if (error) errores.push(`${u.email}: ${error.message}`);
        else enviados++;
      }
    } catch (e) {
      errores.push(`${tenant.nombre}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ dryRun, tenants: tenants.length, enviados, generados, tenantsOmitidos, errores, ...(dryRun ? { muestraHtml } : {}) });
}
