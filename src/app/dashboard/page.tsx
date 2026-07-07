import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import { fechaEfectiva } from "@/lib/fecha-efectiva";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? "";
  const ownerFiltro = filtroOwner(session?.user?.rol, session?.user?.id ?? "");

  const hoy = new Date();
  const inicioHoy   = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finHoy      = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const inicioMes   = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnio  = new Date(hoy.getFullYear(), 0, 1);
  const fin7dias    = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7);
  const hace60dias  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 60);
  const hace14dias  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 14);
  const hace3dias   = new Date(hoy.getTime() - 3 * 86_400_000);

  const [
    empresas,
    contactos,
    oportunidades,
    actividadesPendientes,
    actividadesHoy,
    actividadesVencidas,
    actividadesSemana,
    actividadesCompletadasHoy,
    totalActividadesHoy,
    cotizacionesSinMovimiento,
    cotizacionesSinRespuesta,
    cotizacionesVencidas,
    metaMes,
    metaAnio,
    usuarios,
    topOportunidades,
    ultimasGanadas,
    cierranEstaSemana,
    opActivasConActividad,
  ] = await Promise.all([
    prisma.empresa.count({ where: { tenantId, ...ownerFiltro } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.findMany({
      where: { tenantId, ...ownerFiltro },
      select: { etapa: true, valor: true, creadoEn: true, fechaCierre: true, fechaEvento: true, extras: true, creadoBy: true },
    }),
    prisma.actividad.count({ where: { tenantId, completada: false, ...ownerFiltro } }),
    prisma.actividad.findMany({
      where: { tenantId, completada: false, fecha: { gte: inicioHoy, lt: finHoy }, ...ownerFiltro },
      orderBy: { fecha: "asc" },
      take: 6,
      include: {
        empresa:     { select: { id: true, nombre: true } },
        contacto:    { select: { id: true, nombre: true } },
        oportunidad: { select: { id: true, titulo: true } },
      },
    }),
    prisma.actividad.findMany({
      where: { tenantId, completada: false, fecha: { lt: inicioHoy }, ...ownerFiltro },
      orderBy: { fecha: "asc" },
      take: 6,
      include: { empresa: { select: { id: true, nombre: true } } },
    }),
    prisma.actividad.findMany({
      where: { tenantId, completada: false, fecha: { gte: finHoy, lt: fin7dias }, ...ownerFiltro },
      orderBy: { fecha: "asc" },
      take: 5,
      include: { empresa: { select: { nombre: true } } },
    }),
    prisma.actividad.count({ where: { tenantId, completada: true, fecha: { gte: inicioHoy, lt: finHoy }, ...ownerFiltro } }),
    prisma.actividad.count({ where: { tenantId, fecha: { gte: inicioHoy, lt: finHoy }, ...ownerFiltro } }),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] }, creadoEn: { lt: hace60dias }, ...ownerFiltro },
      select: { id: true, titulo: true, etapa: true, empresa: { select: { nombre: true } } },
      take: 5,
    }),
    prisma.cotizacion.findMany({
      where: { tenantId, estado: "ENVIADA", creadoEn: { lt: hace3dias } },
      select: { id: true, numero: true, creadoEn: true, empresa: { select: { nombre: true } } },
      orderBy: { creadoEn: "asc" },
      take: 5,
    }),
    prisma.cotizacion.findMany({
      where: { tenantId, estado: { in: ["BORRADOR","ENVIADA"] }, fechaValidez: { lte: new Date(Date.now() + 7 * 86_400_000) } },
      select: { id: true, numero: true, fechaValidez: true, empresa: { select: { nombre: true } } },
      orderBy: { fechaValidez: "asc" },
      take: 5,
    }),
    prisma.metaVenta.findFirst({
      where: { tenantId, anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 },
    }),
    prisma.metaVenta.findFirst({
      where: { tenantId, anio: hoy.getFullYear(), mes: null },
    }),
    prisma.usuario.findMany({
      where: { tenantId, rol: "COMERCIAL" },
      select: { id: true, nombre: true },
    }),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: { in: ["PROPUESTA","NEGOCIACION","CALIFICADO"] }, ...ownerFiltro },
      orderBy: { valor: "desc" },
      take: 5,
      select: { id: true, titulo: true, valor: true, etapa: true, probabilidad: true, empresa: { select: { nombre: true } }, fechaCierre: true },
    }),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: "GANADA", fechaCierre: { gte: inicioMes }, ...ownerFiltro },
      orderBy: { fechaCierre: "desc" },
      take: 5,
      select: { id: true, titulo: true, valor: true, creadoBy: true, empresa: { select: { nombre: true } } },
    }),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] }, fechaCierre: { gte: hoy, lte: fin7dias }, ...ownerFiltro },
      select: { id: true, titulo: true, fechaCierre: true, empresa: { select: { nombre: true } } },
      orderBy: { fechaCierre: "asc" },
      take: 5,
    }),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] }, ...ownerFiltro },
      select: { id: true, titulo: true, etapa: true, empresa: { select: { nombre: true } }, creadoBy: true, actividades: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } } },
    }),
  ]);

  const negociosEstancados = opActivasConActividad
    .filter(o => o.actividades.length === 0 || new Date(o.actividades[0].fecha) < hace14dias)
    .slice(0, 5);

  // ── Métricas principales ──────────────────────────────────────────────────
  const opActivas = oportunidades.filter(o => !["PERDIDA","GANADA"].includes(o.etapa));
  const valorPipeline = opActivas.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  const ganadasMes  = oportunidades.filter(o => o.etapa === "GANADA" && fechaEfectiva(o) >= inicioMes);
  const ganadasAnio = oportunidades.filter(o => o.etapa === "GANADA" && fechaEfectiva(o) >= inicioAnio);
  const valorGanadoMes  = ganadasMes.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  const valorGanadoAnio = ganadasAnio.reduce((a, o) => a + Number(o.valor ?? 0), 0);
  const ganadas         = oportunidades.filter(o => o.etapa === "GANADA").length;
  const perdidas        = oportunidades.filter(o => o.etapa === "PERDIDA").length;
  const totalCerradas   = ganadas + perdidas;
  const tasaCierre      = totalCerradas > 0 ? Math.round((ganadas / totalCerradas) * 100) : 0;
  const progresoDia     = totalActividadesHoy > 0 ? Math.round((actividadesCompletadasHoy / totalActividadesHoy) * 100) : 0;

  // Meta del mes
  const metaValor   = metaMes ? Number(metaMes.valorObjetivo) : 0;
  const metaPct     = metaValor > 0 ? Math.min(Math.round((valorGanadoMes / metaValor) * 100), 100) : 0;
  const metaColor   = metaPct >= 100 ? "#10b981" : metaPct >= 60 ? "#f59e0b" : "#ef4444";
  const metaColorBg = metaPct >= 100 ? "bg-emerald-500" : metaPct >= 60 ? "bg-amber-500" : "bg-red-500";
  const metaColorText = metaPct >= 100 ? "text-emerald-600" : metaPct >= 60 ? "text-amber-600" : "text-red-500";

  // Meta del año
  const metaAnioValor = metaAnio ? Number(metaAnio.valorObjetivo) : 0;
  const metaAnioPct   = metaAnioValor > 0 ? Math.min(Math.round((valorGanadoAnio / metaAnioValor) * 100), 100) : 0;
  const metaAnioColor = metaAnioPct >= 100 ? "#10b981" : metaAnioPct >= 60 ? "#f59e0b" : "#ef4444";
  const metaAnioColorText = metaAnioPct >= 100 ? "text-emerald-600" : metaAnioPct >= 60 ? "text-amber-600" : "text-red-500";

  // Ranking vendedores
  const rankingVendedores = usuarios.map(u => {
    const misOps = oportunidades.filter(o => o.creadoBy === u.id);
    const pipeline = misOps.filter(o => !["GANADA","PERDIDA"].includes(o.etapa)).reduce((a, o) => a + Number(o.valor ?? 0), 0);
    const ganadoMes = ganadasMes.filter(o => o.creadoBy === u.id).reduce((a, o) => a + Number(o.valor ?? 0), 0);
    const cerradas  = misOps.filter(o => ["GANADA","PERDIDA"].includes(o.etapa)).length;
    const ganadasU  = misOps.filter(o => o.etapa === "GANADA").length;
    const tasa      = cerradas > 0 ? Math.round((ganadasU / cerradas) * 100) : 0;
    return { ...u, pipeline, ganadoMes, tasa, activas: misOps.filter(o => !["GANADA","PERDIDA"].includes(o.etapa)).length };
  }).sort((a, b) => b.ganadoMes - a.ganadoMes);

  // Salud comercial
  const ultimoContacto = await prisma.actividad.findFirst({ where: { tenantId, completada: true, ...ownerFiltro }, orderBy: { fecha: "desc" }, select: { fecha: true } });
  const diasSinContacto = ultimoContacto ? Math.floor((hoy.getTime() - new Date(ultimoContacto.fecha).getTime()) / 86400000) : null;
  const puntosContacto    = diasSinContacto === null ? 15 : diasSinContacto <= 7 ? 25 : diasSinContacto <= 15 ? 18 : diasSinContacto <= 30 ? 10 : 0;
  const puntosConversion  = tasaCierre >= 40 ? 25 : tasaCierre >= 25 ? 18 : tasaCierre >= 10 ? 10 : 5;
  const puntosActividades = actividadesVencidas.length === 0 ? 25 : actividadesVencidas.length <= 3 ? 15 : actividadesVencidas.length <= 7 ? 8 : 0;
  const puntosPipeline    = valorPipeline > 0 ? (cotizacionesSinMovimiento.length === 0 ? 25 : cotizacionesSinMovimiento.length <= 3 ? 18 : 10) : 5;
  const saludScore = puntosContacto + puntosConversion + puntosActividades + puntosPipeline;
  const saludBg    = saludScore >= 75 ? "bg-emerald-500" : saludScore >= 50 ? "bg-amber-500" : "bg-red-500";
  const saludColor = saludScore >= 75 ? "text-emerald-600" : saludScore >= 50 ? "text-amber-600" : "text-red-500";

  const hayAlertas = actividadesVencidas.length > 0 || cotizacionesSinMovimiento.length > 0 || negociosEstancados.length > 0 || cierranEstaSemana.length > 0 || cotizacionesVencidas.length > 0 || cotizacionesSinRespuesta.length > 0;

  // Helpers
  function fmt(v: number) {
    if (v >= 1_000_000_000) return `$${(v/1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000)     return `$${(v/1_000_000).toFixed(1)}M`;
    if (v >= 1_000)         return `$${Math.round(v/1_000)}K`;
    return `$${v.toLocaleString("es-CO")}`;
  }
  function fmtFull(v: number) {
    return new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", maximumFractionDigits:0 }).format(v);
  }

  const TIPO_ICON: Record<string,string> = { LLAMADA:"📞", REUNION:"🤝", TAREA:"✅", EMAIL:"✉️" };
  const ETAPA_LABEL: Record<string,string> = { PROSPECTO:"Prospecto", CALIFICADO:"Calificado", PROPUESTA:"Cotización", NEGOCIACION:"Negociación", GANADA:"Ganada", PERDIDA:"Perdida" };
  const ETAPA_COLOR: Record<string,string> = { PROSPECTO:"bg-slate-400", CALIFICADO:"bg-blue-500", PROPUESTA:"bg-violet-500", NEGOCIACION:"bg-amber-500", GANADA:"bg-emerald-500", PERDIDA:"bg-red-400" };
  const ETAPA_TEXT: Record<string,string>  = { PROSPECTO:"text-slate-600", CALIFICADO:"text-blue-700", PROPUESTA:"text-violet-700", NEGOCIACION:"text-amber-700", GANADA:"text-emerald-700", PERDIDA:"text-red-600" };
  const ETAPAS_PIPELINE = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION","GANADA","PERDIDA"];

  const nombre = session?.user?.name?.split(" ")[0] ?? "";
  const horaColombia = new Date(hoy.toLocaleString("en-US",{timeZone:"America/Bogota"})).getHours();
  const saludo = horaColombia < 12 ? "Buenos días" : horaColombia < 19 ? "Buenas tardes" : "Buenas noches";
  const totalOp = oportunidades.length;
  const maxEtapa = Math.max(...ETAPAS_PIPELINE.map(e => oportunidades.filter(o => o.etapa === e).length), 1);

  // Gauge SVG helper
  const gaugeCircum = 2 * Math.PI * 40;
  const gaugeDash   = (pct: number) => (pct / 100) * gaugeCircum;

  return (
    <div className="space-y-5">

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 px-8 py-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-12 -right-12 w-56 h-56 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 right-40 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Saludo */}
          <div>
            <p className="text-blue-300 text-xs font-medium mb-1">
              {hoy.toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{saludo}, {nombre} 👋</h1>
            <p className="text-blue-300 mt-0.5 text-xs">{session?.user?.tenantNombre} · {session?.user?.rol ? session.user.rol.charAt(0)+session.user.rol.slice(1).toLowerCase() : ""}</p>
          </div>

          {/* Mega-KPIs del mes */}
          <div className="flex items-center gap-6">
            {metaValor > 0 && (
              <>
                <div className="text-center">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 100 100" className="w-16 h-16 -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={metaColor} strokeWidth="12"
                        strokeDasharray={`${gaugeDash(metaPct)} ${gaugeCircum}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-white">{metaPct}%</span>
                  </div>
                  <p className="text-blue-300 text-xs mt-1">Meta del mes</p>
                </div>
                <div className="w-px bg-white/20 self-stretch" />
              </>
            )}
            {metaAnioValor > 0 && (
              <>
                <div className="text-center">
                  <div className="relative w-16 h-16">
                    <svg viewBox="0 0 100 100" className="w-16 h-16 -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={metaAnioColor} strokeWidth="12"
                        strokeDasharray={`${gaugeDash(metaAnioPct)} ${gaugeCircum}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-white">{metaAnioPct}%</span>
                  </div>
                  <p className="text-blue-300 text-xs mt-1">Meta del año</p>
                </div>
                <div className="w-px bg-white/20 self-stretch" />
              </>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold">{fmt(valorGanadoMes)}</p>
              <p className="text-blue-300 text-xs mt-0.5">Ganado este mes</p>
            </div>
            <div className="w-px bg-white/20 self-stretch" />
            <div className="text-center">
              <p className="text-2xl font-bold">{fmt(valorPipeline)}</p>
              <p className="text-blue-300 text-xs mt-0.5">Pipeline activo</p>
            </div>
            <div className="w-px bg-white/20 self-stretch" />
            <div className="text-center">
              <p className="text-2xl font-bold">{tasaCierre}%</p>
              <p className="text-blue-300 text-xs mt-0.5">Tasa de cierre</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label:"Empresas",         valor: empresas,             sub: "clientes registrados",    href:"/dashboard/cuentas",                    icon:"🏢", grad:"from-blue-500 to-blue-600",     ibg:"bg-blue-50" },
          { label:"Contactos",        valor: contactos,            sub: "personas en tu red",      href:"/dashboard/contactos",                  icon:"👤", grad:"from-violet-500 to-violet-600", ibg:"bg-violet-50" },
          { label:"Oportunidades",    valor: opActivas.length,     sub: "en el pipeline",          href:"/dashboard/pipeline",                   icon:"◈",  grad:"from-emerald-500 to-emerald-600",ibg:"bg-emerald-50" },
          { label:"Tareas pendientes",valor: actividadesPendientes,sub: actividadesHoy.length>0?`${actividadesHoy.length} para hoy`:"sin actividades hoy", href:"/dashboard/agenda", icon:"📅", grad:"from-amber-500 to-orange-500", ibg:"bg-amber-50" },
          { label:"Salud comercial",  valor: `${saludScore}/100`,  sub: saludScore>=75?"Excelente":saludScore>=50?"En proceso":"Necesita atención", href:"/dashboard/reportes", icon:"❤️", grad: saludScore>=75?"from-emerald-400 to-emerald-500":saludScore>=50?"from-amber-400 to-amber-500":"from-red-400 to-red-500", ibg:"bg-slate-50" },
        ].map(k => (
          <Link key={k.href} href={k.href} className="group">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 ${k.ibg} rounded-xl flex items-center justify-center text-lg`}>{k.icon}</div>
                <span className="text-slate-300 text-xs group-hover:text-blue-400 transition-colors">→</span>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">{k.valor}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{k.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
              <div className={`h-1 bg-gradient-to-r ${k.grad} rounded-full mt-3`} />
            </div>
          </Link>
        ))}
      </div>

      {/* ══ FILA CENTRAL: Pipeline | Vendedores | Calientes ════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Pipeline funnel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Estado del pipeline</h2>
              <p className="text-xs text-slate-400 mt-0.5">{totalOp} oportunidades · {fmtFull(valorPipeline)} activos</p>
            </div>
            <Link href="/dashboard/pipeline" className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">Ver kanban →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {ETAPAS_PIPELINE.map(etapa => {
              const n   = oportunidades.filter(o => o.etapa === etapa).length;
              const val = oportunidades.filter(o => o.etapa === etapa).reduce((a,o) => a+Number(o.valor??0),0);
              const pct = maxEtapa > 0 ? (n/maxEtapa)*100 : 0;
              return (
                <div key={etapa} className="flex items-center gap-2">
                  <span className={`text-xs font-medium w-20 shrink-0 ${ETAPA_TEXT[etapa]}`}>{ETAPA_LABEL[etapa]}</span>
                  <div className="flex-1 h-5 rounded-lg bg-slate-50 overflow-hidden relative">
                    <div className={`h-full rounded-lg ${ETAPA_COLOR[etapa]} transition-all duration-500`} style={{width:`${Math.max(pct,n>0?5:0)}%`}} />
                    {n > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">{n}</span>}
                  </div>
                  {val > 0 && <span className="text-xs text-slate-400 font-mono w-16 text-right shrink-0">{fmt(val)}</span>}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-600">{ganadas}</p>
              <p className="text-xs text-slate-400">Ganadas</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-400">{perdidas}</p>
              <p className="text-xs text-slate-400">Perdidas</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-600">{tasaCierre}%</p>
              <p className="text-xs text-slate-400">Cierre</p>
            </div>
          </div>
        </div>

        {/* Ranking vendedores */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Rendimiento del equipo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Mes actual · {rankingVendedores.length} vendedores</p>
            </div>
          </div>
          {rankingVendedores.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No hay vendedores registrados.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rankingVendedores.map((v, i) => {
                const medallon = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                const maxGanado = Math.max(...rankingVendedores.map(x => x.ganadoMes), 1);
                const pct = maxGanado > 0 ? (v.ganadoMes/maxGanado)*100 : 0;
                const barColor = i === 0 ? "bg-amber-400" : i === 1 ? "bg-slate-300" : "bg-amber-700/50";
                return (
                  <div key={v.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{medallon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{v.nombre.split(" ")[0]} {v.nombre.split(" ")[1] ?? ""}</p>
                        <p className="text-xs text-slate-400">{v.activas} activas · {v.tasa}% cierre</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-extrabold text-emerald-600">{fmt(v.ganadoMes)}</p>
                        <p className="text-xs text-slate-400">ganado mes</p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                      <div className={`h-1.5 rounded-full ${barColor} transition-all duration-500`} style={{width:`${Math.max(pct,v.ganadoMes>0?4:0)}%`}} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Pipeline: {fmt(v.pipeline)}</p>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">Total ganado este mes</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{fmtFull(valorGanadoMes)}</p>
            {metaValor > 0 && <p className="text-xs text-slate-400 mt-0.5">de {fmtFull(metaValor)} meta · <span className={metaColorText}>{metaPct}% cumplido</span></p>}
          </div>
        </div>

        {/* Oportunidades calientes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Oportunidades calientes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Las 5 más valiosas en curso</p>
            </div>
            <Link href="/dashboard/pipeline" className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">Ver todo →</Link>
          </div>
          {topOportunidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-3xl mb-2">🎯</span>
              <p className="text-xs text-slate-500">Sin oportunidades activas</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {topOportunidades.map((o,i) => (
                <Link key={o.id} href={`/dashboard/pipeline/${o.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 px-3 py-2.5 transition-colors group">
                  <span className="text-xs font-bold text-slate-400 w-4 shrink-0">#{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">{o.empresa?.nombre ?? o.titulo}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${ETAPA_COLOR[o.etapa]}`} />
                      <span className="text-xs text-slate-400">{ETAPA_LABEL[o.etapa]} · {o.probabilidad ?? 50}%</span>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600 shrink-0">{fmt(Number(o.valor??0))}</span>
                </Link>
              ))}
            </div>
          )}
          {ultimasGanadas.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-emerald-700 mb-2">🏆 Ganadas este mes</p>
              <div className="flex flex-col gap-1">
                {ultimasGanadas.slice(0,3).map(o => (
                  <div key={o.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 truncate flex-1">{o.empresa?.nombre ?? o.titulo}</span>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">{fmt(Number(o.valor??0))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ FILA INFERIOR: Alertas | Actividades hoy | Semana ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Alertas */}
        <div className={`rounded-2xl border p-5 ${hayAlertas ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">{hayAlertas ? "⚠️" : "✅"}</span>
            <h2 className="text-sm font-bold text-slate-800">{hayAlertas ? "Requieren atención" : "Todo bajo control"}</h2>
          </div>
          {!hayAlertas ? (
            <p className="text-xs text-emerald-700 text-center py-6">Sin alertas activas. El equipo está al día.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {actividadesVencidas.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-700 mb-1.5">🔴 {actividadesVencidas.length} actividad{actividadesVencidas.length!==1?"es":""} vencida{actividadesVencidas.length!==1?"s":""}</p>
                  {actividadesVencidas.slice(0,3).map(a => (
                    <Link key={a.id} href="/dashboard/agenda" className="flex items-center gap-2 rounded-lg bg-white border border-red-100 px-2.5 py-1.5 mb-1 hover:border-red-300 transition-colors">
                      <span className="text-xs font-medium text-slate-800 truncate flex-1">{a.empresa?.nombre ?? a.titulo}</span>
                      <span className="text-xs text-red-500 shrink-0">{new Date(a.fecha).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}</span>
                    </Link>
                  ))}
                </div>
              )}
              {negociosEstancados.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-1.5">🧊 {negociosEstancados.length} negocio{negociosEstancados.length!==1?"s":""} sin actividad +14 días</p>
                  {negociosEstancados.slice(0,2).map(o => (
                    <Link key={o.id} href={`/dashboard/pipeline/${o.id}`} className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-2.5 py-1.5 mb-1 hover:border-amber-300 transition-colors">
                      <span className="text-xs font-medium text-slate-800 truncate flex-1">{o.empresa?.nombre ?? o.titulo}</span>
                      <span className="text-xs text-slate-400 shrink-0">{ETAPA_LABEL[o.etapa]}</span>
                    </Link>
                  ))}
                </div>
              )}
              {cierranEstaSemana.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-1.5">🎯 {cierranEstaSemana.length} cierre{cierranEstaSemana.length!==1?"s":""} esta semana</p>
                  {cierranEstaSemana.slice(0,2).map(o => (
                    <Link key={o.id} href={`/dashboard/pipeline/${o.id}`} className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-2.5 py-1.5 mb-1 hover:border-amber-300 transition-colors">
                      <span className="text-xs font-medium text-slate-800 truncate flex-1">{o.empresa?.nombre ?? o.titulo}</span>
                      <span className="text-xs text-amber-600 font-semibold shrink-0">{new Date(o.fechaCierre!).toLocaleDateString("es-CO",{day:"2-digit",month:"short"})}</span>
                    </Link>
                  ))}
                </div>
              )}
              {cotizacionesSinRespuesta.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-amber-700 mb-1.5">✉️ {cotizacionesSinRespuesta.length} cotización{cotizacionesSinRespuesta.length!==1?"es":""} sin respuesta</p>
                  {cotizacionesSinRespuesta.slice(0,2).map(c => {
                    const dias = Math.floor((hoy.getTime()-new Date(c.creadoEn).getTime())/86_400_000);
                    return (
                      <Link key={c.id} href={`/dashboard/cotizaciones-formales/${c.id}`} className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-2.5 py-1.5 mb-1 hover:border-amber-300 transition-colors">
                        <span className="text-xs font-medium text-slate-800 truncate flex-1">#{String(c.numero).padStart(4,"0")} {c.empresa?.nombre??""}</span>
                        <span className="text-xs text-amber-600 font-semibold shrink-0">{dias}d</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actividades de hoy */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Actividades de hoy</h2>
              <p className="text-xs text-slate-400 mt-0.5">{actividadesCompletadasHoy}/{totalActividadesHoy} completadas · {progresoDia}%</p>
            </div>
            <Link href="/dashboard/agenda" className="text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">Agenda →</Link>
          </div>
          {totalActividadesHoy > 0 && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full mb-3 overflow-hidden">
              <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-700" style={{width:`${progresoDia}%`}} />
            </div>
          )}
          {actividadesHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="text-3xl mb-2">🎉</span>
              <p className="text-xs font-semibold text-slate-700">¡Sin pendientes hoy!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {actividadesHoy.map(a => (
                <div key={a.id} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                  <span className="text-sm shrink-0">{TIPO_ICON[a.tipo]??"📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{a.titulo}</p>
                    <p className="text-xs text-slate-400 truncate">{a.empresa?.nombre ?? a.contacto?.nombre ?? ""}</p>
                  </div>
                  <p className="text-xs text-slate-400 font-mono shrink-0">{new Date(a.fecha).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Esta semana + resumen financiero */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Próximos 7 días</h2>
              <Link href="/dashboard/agenda" className="text-xs text-blue-600 hover:underline">Ver agenda →</Link>
            </div>
            {actividadesSemana.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Sin actividades programadas</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {actividadesSemana.map(a => (
                  <div key={a.id} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5">
                    <span className="text-sm shrink-0">{TIPO_ICON[a.tipo]??"📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.titulo}</p>
                      <p className="text-xs text-slate-400 truncate">{a.empresa?.nombre ?? ""}</p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">{new Date(a.fecha).toLocaleDateString("es-CO",{weekday:"short",day:"2-digit"})}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen año */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Resumen {hoy.getFullYear()}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Ganado en el año</span>
                <span className="text-sm font-bold text-emerald-600">{fmt(valorGanadoAnio)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pipeline activo</span>
                <span className="text-sm font-bold text-slate-700">{fmt(valorPipeline)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Tasa de cierre</span>
                <span className="text-sm font-bold text-slate-900">{tasaCierre}%</span>
              </div>
              {metaValor > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Meta del mes</span>
                  <span className={`text-sm font-bold ${metaColorText}`}>{metaPct}% ({fmt(valorGanadoMes)} / {fmt(metaValor)})</span>
                </div>
              )}
              {metaAnioValor > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Meta del año</span>
                  <span className={`text-sm font-bold ${metaAnioColorText}`}>{metaAnioPct}% ({fmt(valorGanadoAnio)} / {fmt(metaAnioValor)})</span>
                </div>
              )}
            </div>
            <Link href="/dashboard/reportes" className="mt-3 flex items-center justify-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white py-2 transition-colors">
              Ver reportes completos →
            </Link>
          </div>
        </div>
      </div>

      {/* ══ SALUD COMERCIAL ═════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-center shrink-0">
              <p className={`text-4xl font-extrabold ${saludColor}`}>{saludScore}</p>
              <p className="text-xs text-slate-400">/ 100</p>
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Salud comercial del equipo</h2>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div className={`h-2.5 rounded-full transition-all duration-700 ${saludBg}`} style={{width:`${saludScore}%`}} />
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { ok: diasSinContacto !== null && diasSinContacto <= 15, txt: diasSinContacto !== null && diasSinContacto <= 15 ? "Seguimiento activo" : "Sin actividad reciente" },
                  { ok: tasaCierre >= 25, txt: `Tasa de cierre ${tasaCierre}%` },
                  { ok: actividadesVencidas.length === 0, txt: actividadesVencidas.length === 0 ? "Sin tareas vencidas" : `${actividadesVencidas.length} tareas vencidas` },
                  { ok: negociosEstancados.length === 0, txt: negociosEstancados.length === 0 ? "Sin negocios estancados" : `${negociosEstancados.length} estancados` },
                  { ok: cotizacionesSinMovimiento.length <= 2, txt: cotizacionesSinMovimiento.length <= 2 ? "Pipeline en movimiento" : `${cotizacionesSinMovimiento.length} sin respuesta 60d` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className={`text-sm ${item.ok ? "text-emerald-500" : "text-amber-500"}`}>{item.ok ? "✔" : "⚠"}</span>
                    <span className={`text-xs ${item.ok ? "text-slate-600" : "text-amber-700"}`}>{item.txt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accesos rápidos */}
          <div className="flex flex-wrap sm:flex-col gap-2 sm:w-44 shrink-0">
            {[
              { label:"Nueva oportunidad", href:"/dashboard/pipeline",                   emoji:"◈"  },
              { label:"Nueva cotización",  href:"/dashboard/cotizaciones-formales/nueva", emoji:"📄" },
              { label:"Nueva actividad",   href:"/dashboard/agenda",                     emoji:"📅" },
              { label:"Ver reportes",      href:"/dashboard/reportes",                   emoji:"📊" },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 px-3 py-2 text-xs font-medium text-slate-700 transition-colors">
                <span>{l.emoji}</span>{l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
