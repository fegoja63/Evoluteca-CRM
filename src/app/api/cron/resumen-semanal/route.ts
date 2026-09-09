import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Resend } from "resend";
import { EtapaOportunidad } from "@prisma/client";

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
  return `<p style="margin-top:20px;font-size:11px;color:#94a3b8">Este resumen se envía automáticamente cada lunes. Puedes desactivar los correos automáticos en Configuración.</p>`;
}
// Tarjeta de un negocio dentro de una sección.
function fila(titulo: string, sub: string, color: string) {
  return `<div style="background:white;border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:8px;padding:10px 12px;margin-bottom:6px">
    <p style="margin:0 0 3px;font-weight:600;font-size:13px;color:#1e293b">${titulo}</p>
    <p style="margin:0;font-size:12px;color:#94a3b8">${sub}</p>
  </div>`;
}
// Bloque de una de las 3 preguntas del lunes.
function bloquePregunta(pregunta: string, cuerpoHtml: string, bg: string) {
  return `<div style="margin-top:18px">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#334155">${pregunta}</p>
    <div style="background:${bg};border-radius:10px;padding:12px">${cuerpoHtml}</div>
  </div>`;
}

type Usuario = { id: string; nombre: string; email: string; tenantId: string; rol: string };
type TenantInfo = { emailsActivos: boolean; logoUrl: string | null; diasEstancamiento: number };
type Fechas = { ahora: Date; hace7: Date; en7: Date };

const TIPO_LABEL: Record<string, string> = {
  LLAMADA: "llamadas", REUNION: "reuniones", VISITA: "visitas", EMAIL: "correos", TAREA: "tareas",
};

// Construye el correo "Resumen del Lunes" de un usuario. Devuelve null si no hay
// nada que contar (sin pipeline activo ni actividad) para no enviar ruido.
async function construirResumen(u: Usuario, tenantInfo: TenantInfo, f: Fechas): Promise<{ subject: string; html: string } | null> {
  const { ahora, hace7, en7 } = f;
  const esComercial = u.rol === "COMERCIAL";
  const ownerWhere = esComercial ? { creadoBy: u.id } : {};
  const ownerWhereAct = esComercial ? { OR: [{ creadoBy: u.id }, { responsableId: u.id }] } : {};
  const corteEstancamiento = new Date(ahora.getTime() - tenantInfo.diasEstancamiento * 86_400_000);

  const [opActivas, ganadas, perdidas, actividades7d, proximas7d] = await Promise.all([
    prisma.oportunidad.findMany({
      where: { tenantId: u.tenantId, eliminadoEn: null, etapa: { in: ETAPAS_ACTIVAS }, ...ownerWhere },
      select: {
        titulo: true, valor: true, etapa: true, fechaCierre: true, creadoEn: true,
        empresa: { select: { nombre: true } },
        actividades: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
        cambiosEtapa: { orderBy: { creadoEn: "desc" }, take: 1, select: { creadoEn: true } },
      },
    }),
    prisma.oportunidad.count({ where: { tenantId: u.tenantId, eliminadoEn: null, etapa: "GANADA", ...ownerWhere } }),
    prisma.oportunidad.count({ where: { tenantId: u.tenantId, eliminadoEn: null, etapa: "PERDIDA", ...ownerWhere } }),
    prisma.actividad.findMany({
      where: { tenantId: u.tenantId, fecha: { gte: hace7, lte: ahora }, ...ownerWhereAct },
      select: { tipo: true },
    }),
    prisma.actividad.count({
      where: { tenantId: u.tenantId, completada: false, fecha: { gt: ahora, lte: en7 }, ...ownerWhereAct },
    }),
  ]);

  // Nada que contar: ni pipeline activo, ni actividad reciente, ni próxima.
  if (opActivas.length === 0 && actividades7d.length === 0 && proximas7d === 0) return null;

  const ultimoMovimiento = (o: (typeof opActivas)[number]): Date => {
    const ds = [o.creadoEn, o.actividades[0]?.fecha, o.cambiosEtapa[0]?.creadoEn].filter((d): d is Date => !!d);
    return ds.reduce((a, b) => (b > a ? b : a), o.creadoEn);
  };

  const pipelineValor = opActivas.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  const cerradas = ganadas + perdidas;
  const tasaCierre = cerradas > 0 ? Math.round((ganadas / cerradas) * 100) : 0;

  // ── Q1: ¿Qué puedo cerrar? — cierres de la semana + más valiosas ──
  const cierranSemana = opActivas
    .filter(o => o.fechaCierre && o.fechaCierre >= ahora && o.fechaCierre <= en7)
    .sort((a, b) => a.fechaCierre!.getTime() - b.fechaCierre!.getTime())
    .slice(0, 5);
  const valiosas = [...opActivas].sort((a, b) => Number(b.valor ?? 0) - Number(a.valor ?? 0)).slice(0, 3);

  let q1 = "";
  if (cierranSemana.length > 0) {
    q1 += `<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#1d4ed8">Con cierre esta semana</p>`;
    q1 += cierranSemana.map(o => {
      const dias = Math.ceil((o.fechaCierre!.getTime() - ahora.getTime()) / 86_400_000);
      return fila(o.titulo, `${o.empresa?.nombre ?? ""} · ${fmt(o.valor as unknown as number)} · ${dias <= 0 ? "hoy" : dias === 1 ? "mañana" : `en ${dias} días`}`, "#2563eb");
    }).join("");
  }
  if (valiosas.length > 0) {
    q1 += `<p style="margin:${cierranSemana.length ? "10" : "0"}px 0 6px;font-size:12px;font-weight:600;color:#334155">Las más valiosas en curso</p>`;
    q1 += valiosas.map(o => fila(o.titulo, `${o.empresa?.nombre ?? ""} · ${o.etapa} · ${fmt(o.valor as unknown as number)}`, "#10b981")).join("");
  }
  if (!q1) q1 = `<p style="margin:0;font-size:12px;color:#94a3b8">No tienes oportunidades activas por ahora.</p>`;

  // ── Q2: ¿Qué está bloqueado? — negocios estancados ──
  const estancados = opActivas
    .filter(o => ultimoMovimiento(o) < corteEstancamiento)
    .sort((a, b) => ultimoMovimiento(a).getTime() - ultimoMovimiento(b).getTime())
    .slice(0, 5);
  let q2 = "";
  if (estancados.length > 0) {
    q2 = estancados.map(o => {
      const dias = Math.floor((ahora.getTime() - ultimoMovimiento(o).getTime()) / 86_400_000);
      return fila(o.titulo, `${o.empresa?.nombre ?? ""} · ${o.etapa} · ${dias} días sin movimiento`, "#f59e0b");
    }).join("");
  } else {
    q2 = `<p style="margin:0;font-size:12px;color:#94a3b8">Nada estancado — todos tus negocios se han movido en los últimos ${tenantInfo.diasEstancamiento} días. 👏</p>`;
  }

  // ── Q3: ¿Qué generará ventas futuras? — actividad de la semana + agenda ──
  const porTipo: Record<string, number> = {};
  for (const a of actividades7d) {
    const key = a.tipo === "VISITA_COMERCIAL" || a.tipo === "VISITA_TECNICA" ? "VISITA" : a.tipo;
    porTipo[key] = (porTipo[key] ?? 0) + 1;
  }
  const resumenTipos = ["LLAMADA", "REUNION", "VISITA", "EMAIL"]
    .filter(k => (porTipo[k] ?? 0) > 0)
    .map(k => `<strong>${porTipo[k]}</strong> ${TIPO_LABEL[k]}`)
    .join(" · ");
  const q3 = `<p style="margin:0 0 6px;font-size:13px;color:#334155">Actividad de los últimos 7 días: ${
    actividades7d.length > 0 ? `${resumenTipos || `<strong>${actividades7d.length}</strong> actividades`} (${actividades7d.length} en total)` : "<strong>sin registrar</strong> — el pipeline no se mueve solo."
  }</p>
  <p style="margin:0;font-size:13px;color:#334155">Tienes <strong>${proximas7d}</strong> actividad(es) agendada(s) para los próximos 7 días.</p>`;

  // ── KPIs de cabecera ──
  const kpis = `<div style="display:flex;gap:8px;margin-top:4px">
    <div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center">
      <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b">${fmt(pipelineValor)}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">Pipeline activo</p>
    </div>
    <div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center">
      <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b">${opActivas.length}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">Oportunidades</p>
    </div>
    <div style="flex:1;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center">
      <p style="margin:0;font-size:18px;font-weight:800;color:#1e293b">${tasaCierre}%</p>
      <p style="margin:2px 0 0;font-size:11px;color:#94a3b8">Tasa de cierre</p>
    </div>
  </div>`;

  const html = wrapper(`${header("Tu resumen del lunes", tenantInfo.logoUrl)}
    <div style="background:#f8fafc;padding:22px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
      <p style="font-size:14px;color:#64748b;margin:0 0 14px">Hola <strong>${u.nombre}</strong>, así arranca tu semana:</p>
      ${kpis}
      ${bloquePregunta("① ¿Qué oportunidades puedo cerrar?", q1, "#eff6ff")}
      ${bloquePregunta("② ¿Qué operaciones están bloqueadas?", q2, "#fffbeb")}
      ${bloquePregunta("③ ¿Qué acción generará ventas futuras?", q3, "#f0fdf4")}
      <div style="margin-top:18px">${btn(`${BASE_URL}/dashboard/reportes`, "Abrir el Panel del Lunes")}</div>
      ${footer()}
    </div>`);

  return { subject: "🗓️ Tu resumen del lunes — Evoluteca CRM", html };
}

async function obtenerTenantInfo(tenantId: string, cache: Record<string, TenantInfo>): Promise<TenantInfo> {
  if (cache[tenantId] === undefined) {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { emailsActivos: true, logoUrl: true, diasEstancamiento: true } });
    cache[tenantId] = { emailsActivos: t?.emailsActivos ?? true, logoUrl: t?.logoUrl ?? null, diasEstancamiento: t?.diasEstancamiento ?? 14 };
  }
  return cache[tenantId];
}

function fechasAhora(): Fechas {
  const ahora = new Date();
  return { ahora, hace7: new Date(ahora.getTime() - 7 * 86_400_000), en7: new Date(ahora.getTime() + 7 * 86_400_000) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dryRunParam = searchParams.get("dryRun") === "1" || searchParams.get("dryRun") === "true";

  // Doble vía de acceso:
  //  · Bearer CRON_SECRET  → el envío real de cada lunes (GitHub Action).
  //  · Sesión de ADMIN     → una vista previa (dryRun) del propio correo, útil
  //                          para revisar cómo se ve; nunca dispara envío masivo.
  const bearer = req.headers.get("authorization")?.replace("Bearer ", "");
  const esCron = !!process.env.CRON_SECRET && bearer === process.env.CRON_SECRET;

  let usuarioSesion: Usuario | null = null;
  if (!esCron) {
    const session = await auth();
    if (session?.user?.rol === "ADMINISTRADOR") {
      usuarioSesion = {
        id: session.user.id, nombre: session.user.name ?? "", email: session.user.email ?? "",
        tenantId: session.user.tenantId, rol: session.user.rol,
      };
    }
  }
  if (!esCron && !usuarioSesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const f = fechasAhora();
  const tenantCache: Record<string, TenantInfo> = {};

  // ── Vista previa por sesión de admin: solo su propio correo, nunca envía ──
  if (!esCron && usuarioSesion) {
    const tenantInfo = await obtenerTenantInfo(usuarioSesion.tenantId, tenantCache);
    const correo = await construirResumen(usuarioSesion, tenantInfo, f);
    if (!correo) {
      return NextResponse.json({ preview: true, vacio: true, mensaje: "No hay pipeline ni actividad para resumir esta semana." });
    }
    // Devuelve el HTML directamente para poder verlo en el navegador.
    return new NextResponse(correo.html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  // ── Vía cron: recorre todos los usuarios y envía (salvo dryRun) ──
  const dryRun = dryRunParam;
  let resend: Resend | null = null;
  if (!dryRun) {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY no configurada" }, { status: 503 });
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }

  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, email: true, tenantId: true, rol: true },
  });

  let enviados = 0, generados = 0, omitidos = 0;
  const errores: string[] = [];
  let muestraHtml: string | null = null;

  const CONCURRENCIA = 5;
  for (let i = 0; i < usuarios.length; i += CONCURRENCIA) {
    const lote = usuarios.slice(i, i + CONCURRENCIA);
    const resultados = await Promise.all(lote.map(async u => {
      try {
        const tenantInfo = await obtenerTenantInfo(u.tenantId, tenantCache);
        if (!tenantInfo.emailsActivos) return { estado: "omitido" as const };
        const correo = await construirResumen(u, tenantInfo, f);
        if (!correo) return { estado: "omitido" as const };
        if (dryRun) return { estado: "generado" as const, html: correo.html };
        const { error } = await resend!.emails.send({
          from: "Evoluteca CRM <noreply@evoluteca.com>",
          to: u.email,
          subject: `[${u.nombre}] ${correo.subject}`,
          html: correo.html,
        });
        if (error) return { estado: "error" as const, msg: `${u.email}: ${error.message}` };
        return { estado: "enviado" as const };
      } catch (e) {
        return { estado: "error" as const, msg: `${u.email}: ${e instanceof Error ? e.message : String(e)}` };
      }
    }));
    for (const r of resultados) {
      if (r.estado === "enviado") enviados++;
      else if (r.estado === "generado") { generados++; if (!muestraHtml && r.html) muestraHtml = r.html; }
      else if (r.estado === "omitido") omitidos++;
      else if (r.estado === "error") errores.push(r.msg);
    }
  }

  return NextResponse.json({
    dryRun, usuarios: usuarios.length, enviados, generados, omitidos, errores,
    ...(dryRun ? { muestraHtml } : {}),
  });
}
