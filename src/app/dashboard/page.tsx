import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner } from "@/lib/permisos";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? "";
  const ownerFiltro = filtroOwner(session?.user?.rol, session?.user?.id ?? "");

  const hoy = new Date();
  const inicioHoy  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finHoy     = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const inicioMes  = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);

  const fin7dias   = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 7);
  const hace60dias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 60);
  const hace30dias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 30);
  const hace14dias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 14);

  const [
    empresas, contactos, oportunidades,
    actividadesPendientes, actividadesHoy,
    actividadesVencidas,
    proximasFunciones,
    ganadas30d,
    cotizacionesSinMovimiento,
    actividadesSemana,
    actividadesCompletadasHoy,
    totalActividadesHoy,
    ultimoContacto,
  ] = await Promise.all([
    prisma.empresa.count({ where: { tenantId, ...ownerFiltro } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.findMany({ where: { tenantId, ...ownerFiltro }, select: { etapa: true, valor: true, creadoEn: true } }),
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
      take: 5,
      include: { empresa: { select: { id: true, nombre: true } }, oportunidad: { select: { id: true, titulo: true } } },
    }),
    prisma.funcion.findMany({
      where: { tenantId, fecha: { gte: hoy } },
      orderBy: { fecha: "asc" },
      take: 4,
    }).catch(() => []),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: "GANADA", creadoEn: { gte: inicioMes }, ...ownerFiltro },
      select: { valor: true },
    }).catch(() => []),
    prisma.oportunidad.findMany({
      where: { tenantId, etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] }, creadoEn: { lt: hace60dias }, ...ownerFiltro },
      select: { id: true, titulo: true, etapa: true, empresa: { select: { nombre: true } } },
      take: 5,
    }),
    prisma.actividad.findMany({
      where: { tenantId, completada: false, fecha: { gte: finHoy, lt: fin7dias }, ...ownerFiltro },
      orderBy: { fecha: "asc" },
      take: 5,
      include: { empresa: { select: { nombre: true } }, oportunidad: { select: { titulo: true } } },
    }),
    prisma.actividad.count({ where: { tenantId, completada: true, fecha: { gte: inicioHoy, lt: finHoy }, ...ownerFiltro } }),
    prisma.actividad.count({ where: { tenantId, fecha: { gte: inicioHoy, lt: finHoy }, ...ownerFiltro } }),
    prisma.actividad.findFirst({ where: { tenantId, completada: true, ...ownerFiltro }, orderBy: { fecha: "desc" }, select: { fecha: true } }),
  ]);

  // ── Oportunidades que cierran esta semana ──
  const cierranEstaSemana = await prisma.oportunidad.findMany({
    where: {
      tenantId,
      etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] },
      fechaCierre: { gte: hoy, lte: fin7dias },
      ...ownerFiltro,
    },
    select: { id: true, titulo: true, fechaCierre: true, empresa: { select: { nombre: true } } },
    orderBy: { fechaCierre: "asc" },
    take: 5,
  });

  // ── Negocios estancados: activos sin actividad en 14+ días ──
  const opActivasConActividad = await prisma.oportunidad.findMany({
    where: { tenantId, etapa: { in: ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"] }, ...ownerFiltro },
    select: {
      id: true, titulo: true, etapa: true,
      empresa: { select: { nombre: true } },
      actividades: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
    },
  });
  const negociosEstancados = opActivasConActividad
    .filter(o => o.actividades.length === 0 || new Date(o.actividades[0].fecha) < hace14dias)
    .slice(0, 5);

  // ── Cotizaciones ENVIADAS sin respuesta en +3 días ──
  const hace3dias = new Date(hoy.getTime() - 3 * 86_400_000);
  const cotizacionesSinRespuesta = await prisma.cotizacion.findMany({
    where: { tenantId, estado: "ENVIADA", creadoEn: { lt: hace3dias } },
    select: { id: true, numero: true, creadoEn: true, empresa: { select: { nombre: true } } },
    orderBy: { creadoEn: "asc" },
    take: 5,
  });

  // ── Cotizaciones formales con validez vencida o próxima a vencer (≤7 días) ──
  const cotizacionesVencidas = await prisma.cotizacion.findMany({
    where: {
      tenantId,
      estado: { in: ["BORRADOR", "ENVIADA"] },
      fechaValidez: { lte: new Date(Date.now() + 7 * 86_400_000) },
    },
    select: { id: true, numero: true, fechaValidez: true, empresa: { select: { nombre: true } } },
    orderBy: { fechaValidez: "asc" },
    take: 5,
  });

  const valorPipeline = oportunidades
    .filter((o) => !["PERDIDA", "GANADA"].includes(o.etapa))
    .reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const valorGanadoAnio = oportunidades
    .filter((o) => o.etapa === "GANADA" && new Date(o.creadoEn) >= inicioAnio)
    .reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const valorGanadoMes = ganadas30d.reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const ganadas  = oportunidades.filter((o) => o.etapa === "GANADA").length;
  const perdidas = oportunidades.filter((o) => o.etapa === "PERDIDA").length;
  const totalCerradas = ganadas + perdidas;
  const tasaCierre = totalCerradas > 0 ? Math.round((ganadas / totalCerradas) * 100) : 0;

  // ── Salud comercial ──
  const diasSinContacto = ultimoContacto
    ? Math.floor((hoy.getTime() - new Date(ultimoContacto.fecha).getTime()) / 86400000)
    : null;

  const puntosContacto    = diasSinContacto === null ? 15 : diasSinContacto <= 7 ? 25 : diasSinContacto <= 15 ? 18 : diasSinContacto <= 30 ? 10 : 0;
  const puntosConversion  = tasaCierre >= 40 ? 25 : tasaCierre >= 25 ? 18 : tasaCierre >= 10 ? 10 : 5;
  const puntosActividades = actividadesVencidas.length === 0 ? 25 : actividadesVencidas.length <= 3 ? 15 : actividadesVencidas.length <= 7 ? 8 : 0;
  const puntosPipeline    = valorPipeline > 0 ? (cotizacionesSinMovimiento.length === 0 ? 25 : cotizacionesSinMovimiento.length <= 3 ? 18 : 10) : 5;

  const saludScore = puntosContacto + puntosConversion + puntosActividades + puntosPipeline;
  const saludColor = saludScore >= 75 ? "text-emerald-600" : saludScore >= 50 ? "text-amber-600" : "text-red-500";
  const saludBg    = saludScore >= 75 ? "bg-emerald-500" : saludScore >= 50 ? "bg-amber-500" : "bg-red-500";

  const textoContacto = diasSinContacto === null
    ? "Registra tu primera actividad completada"
    : diasSinContacto <= 15
      ? `Seguimiento reciente (hace ${diasSinContacto} días)`
      : `Sin actividad hace ${diasSinContacto} días`;

  const saludItems = [
    { ok: diasSinContacto !== null && diasSinContacto <= 15, texto: textoContacto },
    { ok: tasaCierre >= 25,      texto: tasaCierre >= 25 ? `Buena tasa de cierre (${tasaCierre}%)` : `Tasa de cierre baja (${tasaCierre}%)` },
    { ok: actividadesVencidas.length === 0, texto: actividadesVencidas.length === 0 ? "Sin actividades vencidas" : `${actividadesVencidas.length} actividad${actividadesVencidas.length !== 1 ? "es" : ""} vencida${actividadesVencidas.length !== 1 ? "s" : ""}` },
    { ok: cotizacionesSinMovimiento.length <= 2, texto: cotizacionesSinMovimiento.length <= 2 ? "Pipeline activo" : `${cotizacionesSinMovimiento.length} cotizaciones sin respuesta` },
    { ok: negociosEstancados.length === 0, texto: negociosEstancados.length === 0 ? "Sin negocios estancados" : `${negociosEstancados.length} negocio${negociosEstancados.length !== 1 ? "s" : ""} sin actividad +14 días` },
  ];

  // ── Productividad del día ──
  const progresoDia = totalActividadesHoy > 0 ? Math.round((actividadesCompletadasHoy / totalActividadesHoy) * 100) : 0;

  function fmt(valor: number) {
    if (valor >= 1_000_000_000) return `$${(valor / 1_000_000_000).toFixed(1)}B`;
    if (valor >= 1_000_000)     return `$${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000)         return `$${Math.round(valor / 1_000)}K`;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
  }

  function fmtFull(valor: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
  }

  const TIPO_ICON: Record<string, string> = {
    LLAMADA: "📞", REUNION: "🤝", TAREA: "✅", EMAIL: "✉️",
  };

  const ETAPAS_PIPELINE = [
    { key: "PROSPECTO",   label: "Prospecto",   color: "bg-slate-400",    light: "bg-slate-50",   text: "text-slate-600" },
    { key: "CALIFICADO",  label: "Calificado",  color: "bg-blue-500",     light: "bg-blue-50",    text: "text-blue-700" },
    { key: "PROPUESTA",   label: "Cotización",  color: "bg-violet-500",   light: "bg-violet-50",  text: "text-violet-700" },
    { key: "NEGOCIACION", label: "Negociación", color: "bg-amber-500",    light: "bg-amber-50",   text: "text-amber-700" },
    { key: "GANADA",      label: "Ganada",      color: "bg-emerald-500",  light: "bg-emerald-50", text: "text-emerald-700" },
    { key: "PERDIDA",     label: "Perdida",     color: "bg-red-400",      light: "bg-red-50",     text: "text-red-600" },
  ];

  const totalOp = oportunidades.length;
  const maxEtapa = Math.max(...ETAPAS_PIPELINE.map(e => oportunidades.filter(o => o.etapa === e.key).length), 1);

  const nombre = session?.user?.name?.split(" ")[0] ?? "";
  const horaColombia = new Date(hoy.toLocaleString("en-US", { timeZone: "America/Bogota" })).getHours();
  const saludo = horaColombia < 12 ? "Buenos días" : horaColombia < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="space-y-6">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-4 text-white shadow-lg">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 right-32 w-32 h-32 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-4 right-20 w-20 h-20 rounded-full bg-white/5" />

        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">
              {hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">
              {saludo}, {nombre} 👋
            </h1>
            <p className="text-blue-200 mt-0.5 text-xs">
              {session?.user?.tenantNombre} · {session?.user?.rol ? session.user.rol.charAt(0) + session.user.rol.slice(1).toLowerCase() : ""}
            </p>
          </div>
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
            <img src="/Logo FGJ.jpg" alt="Felipe Gómez Jaramillo" className="h-14 w-auto object-contain rounded-xl opacity-95" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-right">
            <div>
              <p className="text-2xl font-bold">{fmt(valorGanadoMes)}</p>
              <p className="text-blue-200 text-xs mt-0.5">Ganado este mes</p>
            </div>
            <div className="w-px bg-white/20 self-stretch" />
            <div>
              <p className="text-2xl font-bold">{tasaCierre}%</p>
              <p className="text-blue-200 text-xs mt-0.5">Tasa de cierre</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALERTAS ── */}
      {(actividadesVencidas.length > 0 || cotizacionesSinMovimiento.length > 0 || negociosEstancados.length > 0 || cierranEstaSemana.length > 0 || cotizacionesVencidas.length > 0 || cotizacionesSinRespuesta.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚠️</span>
            <h2 className="text-sm font-bold text-amber-800">Requieren atención</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {actividadesVencidas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  🔴 {actividadesVencidas.length} actividad{actividadesVencidas.length !== 1 ? "es" : ""} vencida{actividadesVencidas.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-1">
                  {actividadesVencidas.map(a => (
                    <Link key={a.id} href="/dashboard/agenda"
                      className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-3 py-1.5 hover:border-amber-300 transition-colors">
                      <span className="text-xs font-medium text-slate-800 truncate">{a.titulo}</span>
                      <span className="text-xs text-slate-400 ml-auto shrink-0">
                        {new Date(a.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {cotizacionesSinMovimiento.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  🟡 {cotizacionesSinMovimiento.length} cotización{cotizacionesSinMovimiento.length !== 1 ? "es" : ""} sin respuesta +60 días
                </p>
                <div className="flex flex-col gap-1">
                  {cotizacionesSinMovimiento.map(o => (
                    <Link key={o.id} href={`/dashboard/pipeline/${o.id}`}
                      className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-3 py-1.5 hover:border-amber-300 transition-colors">
                      <span className="text-xs font-medium text-slate-800 truncate">{o.empresa?.nombre ?? o.titulo}</span>
                      <span className="text-xs text-slate-400 ml-auto shrink-0">{o.etapa.charAt(0) + o.etapa.slice(1).toLowerCase()}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {cierranEstaSemana.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  🎯 {cierranEstaSemana.length} negocio{cierranEstaSemana.length !== 1 ? "s" : ""} que cierran esta semana
                </p>
                <div className="flex flex-col gap-1">
                  {cierranEstaSemana.map(o => (
                    <Link key={o.id} href={`/dashboard/pipeline/${o.id}`}
                      className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-3 py-1.5 hover:border-amber-300 transition-colors">
                      <span className="text-xs font-medium text-slate-800 truncate">{o.empresa?.nombre ?? o.titulo}</span>
                      <span className="text-xs text-slate-400 ml-auto shrink-0">
                        {new Date(o.fechaCierre!).toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {cotizacionesSinRespuesta.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  ✉️ {cotizacionesSinRespuesta.length} cotización{cotizacionesSinRespuesta.length !== 1 ? "es" : ""} enviada{cotizacionesSinRespuesta.length !== 1 ? "s" : ""} sin respuesta +3 días
                </p>
                <div className="flex flex-col gap-1">
                  {cotizacionesSinRespuesta.map(c => {
                    const dias = Math.floor((hoy.getTime() - new Date(c.creadoEn).getTime()) / 86_400_000);
                    return (
                      <Link key={c.id} href={`/dashboard/cotizaciones-formales/${c.id}`}
                        className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-3 py-1.5 hover:border-amber-300 transition-colors">
                        <span className="text-xs font-medium text-slate-800 truncate">
                          #{String(c.numero).padStart(4,"0")} {c.empresa?.nombre ?? ""}
                        </span>
                        <span className="text-xs ml-auto shrink-0 font-semibold text-amber-600">{dias}d sin respuesta</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {cotizacionesVencidas.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  📄 {cotizacionesVencidas.length} cotización{cotizacionesVencidas.length !== 1 ? "es" : ""} formal{cotizacionesVencidas.length !== 1 ? "es" : ""} vencida{cotizacionesVencidas.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-col gap-1">
                  {cotizacionesVencidas.map(c => {
                    const dias = Math.ceil((new Date(c.fechaValidez!).getTime() - hoy.getTime()) / 86_400_000);
                    return (
                      <Link key={c.id} href={`/dashboard/cotizaciones-formales/${c.id}`}
                        className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-3 py-1.5 hover:border-amber-300 transition-colors">
                        <span className="text-xs font-medium text-slate-800 truncate">
                          #{String(c.numero).padStart(4,"0")} {c.empresa?.nombre ?? ""}
                        </span>
                        <span className={`text-xs ml-auto shrink-0 font-semibold ${dias < 0 ? "text-red-600" : "text-amber-600"}`}>
                          {dias < 0 ? `Vencida ${Math.abs(dias)}d` : dias === 0 ? "Hoy" : `${dias}d`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {negociosEstancados.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-2">
                  🧊 {negociosEstancados.length} negocio{negociosEstancados.length !== 1 ? "s" : ""} estancado{negociosEstancados.length !== 1 ? "s" : ""} +14 días sin actividad
                </p>
                <div className="flex flex-col gap-1">
                  {negociosEstancados.map(o => {
                    const diasSin = o.actividades.length === 0
                      ? null
                      : Math.floor((hoy.getTime() - new Date(o.actividades[0].fecha).getTime()) / 86400000);
                    return (
                      <Link key={o.id} href={`/dashboard/pipeline/${o.id}`}
                        className="flex items-center gap-2 rounded-lg bg-white border border-amber-100 px-3 py-1.5 hover:border-amber-300 transition-colors">
                        <span className="text-xs font-medium text-slate-800 truncate">{o.empresa?.nombre ?? o.titulo}</span>
                        <span className="text-xs text-slate-400 ml-auto shrink-0">
                          {diasSin === null ? "sin actividad" : `${diasSin}d sin actividad`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VISTA DE HOY ── */}
      {(actividadesHoy.length > 0 || actividadesSemana.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {actividadesHoy.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📌</span>
                  <h2 className="text-sm font-bold text-blue-800">Hoy</h2>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{actividadesHoy.length}</span>
                </div>
                <Link href="/dashboard/agenda" className="text-xs text-blue-600 hover:underline">Ver agenda →</Link>
              </div>
              <div className="flex flex-col gap-1.5">
                {actividadesHoy.map(a => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg bg-white border border-blue-100 px-3 py-1.5">
                    <span className="text-sm">{TIPO_ICON[a.tipo] ?? "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.titulo}</p>
                      <p className="text-xs text-slate-400 truncate">{a.empresa?.nombre ?? a.contacto?.nombre ?? a.oportunidad?.titulo ?? ""}</p>
                    </div>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      {new Date(a.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {actividadesSemana.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <h2 className="text-sm font-bold text-slate-800">Esta semana</h2>
                  <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">{actividadesSemana.length}</span>
                </div>
                <Link href="/dashboard/agenda" className="text-xs text-blue-600 hover:underline">Ver agenda →</Link>
              </div>
              <div className="flex flex-col gap-1.5">
                {actividadesSemana.map(a => (
                  <div key={a.id} className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-1.5">
                    <span className="text-sm">{TIPO_ICON[a.tipo] ?? "📌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{a.titulo}</p>
                      <p className="text-xs text-slate-400 truncate">{a.empresa?.nombre ?? a.oportunidad?.titulo ?? ""}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(a.fecha).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Clientes activos",
            valor: empresas,
            sub: "empresas registradas",
            href: "/dashboard/cuentas",
            gradient: "from-blue-500 to-blue-600",
            icon: "🏢",
            iconBg: "bg-blue-100",
          },
          {
            label: "Contactos",
            valor: contactos,
            sub: "personas en tu red",
            href: "/dashboard/contactos",
            gradient: "from-violet-500 to-violet-600",
            icon: "👤",
            iconBg: "bg-violet-100",
          },
          {
            label: "Pipeline activo",
            valor: fmt(valorPipeline),
            sub: fmtFull(valorPipeline),
            href: "/dashboard/pipeline",
            gradient: "from-emerald-500 to-emerald-600",
            icon: "💰",
            iconBg: "bg-emerald-100",
          },
          {
            label: "Tareas pendientes",
            valor: actividadesPendientes,
            sub: actividadesHoy.length > 0 ? `${actividadesHoy.length} para hoy` : "sin actividades hoy",
            href: "/dashboard/agenda",
            gradient: "from-amber-500 to-orange-500",
            icon: "📅",
            iconBg: "bg-amber-100",
          },
        ].map((kpi) => (
          <Link key={kpi.href} href={kpi.href} className="group">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 ${kpi.iconBg} rounded-xl flex items-center justify-center text-xl`}>
                  {kpi.icon}
                </div>
                <span className="text-slate-300 text-xs group-hover:text-blue-400 transition-colors">→</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{kpi.valor}</p>
              <p className="text-sm font-semibold text-slate-700 mt-1">{kpi.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
              <div className={`h-1 bg-gradient-to-r ${kpi.gradient} rounded-full mt-4`} />
            </div>
          </Link>
        ))}
      </div>

      {/* ── FILA PRINCIPAL ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Pipeline funnel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pipeline de ventas</h2>
              <p className="text-xs text-slate-400 mt-0.5">{totalOp} oportunidades totales</p>
            </div>
            <Link href="/dashboard/pipeline"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">
              Ver kanban →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {ETAPAS_PIPELINE.map((etapa) => {
              const n = oportunidades.filter((o) => o.etapa === etapa.key).length;
              const pct = maxEtapa > 0 ? (n / maxEtapa) * 100 : 0;
              return (
                <div key={etapa.key} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-20 shrink-0 ${etapa.text}`}>{etapa.label}</span>
                  <div className="flex-1 h-5 rounded-lg bg-slate-50 overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg ${etapa.color} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, n > 0 ? 6 : 0)}%` }}
                    />
                    {n > 0 && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">{n}</span>
                    )}
                  </div>
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

        {/* Actividades de hoy */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Actividades de hoy
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {actividadesHoy.length === 0 ? "Sin pendientes" : `${actividadesHoy.length} pendiente${actividadesHoy.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {actividadesHoy.length > 0 && (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  {actividadesHoy.length}
                </span>
              )}
              <Link href="/dashboard/agenda"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">
                Agenda →
              </Link>
            </div>
          </div>
          {actividadesHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl mb-3">🎉</div>
              <p className="text-sm font-semibold text-slate-700">¡Todo al día!</p>
              <p className="text-xs text-slate-400 mt-1">No tienes pendientes para hoy</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {actividadesHoy.map((a) => (
                <div key={a.id}
                  className="flex gap-2.5 items-center rounded-xl bg-slate-50 hover:bg-slate-100 px-3 py-2 transition-colors">
                  <span className="text-base shrink-0">{TIPO_ICON[a.tipo] ?? "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{a.titulo}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {a.empresa?.nombre ?? a.contacto?.nombre ?? a.oportunidad?.titulo ?? "Sin vínculo"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0 font-mono">
                    {new Date(a.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho */}
        <div className="flex flex-col gap-4">

          {/* Resumen financiero del año */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-3">Resumen {hoy.getFullYear()}</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Ganado en el año</span>
                <span className="text-sm font-bold text-emerald-600">{fmt(valorGanadoAnio)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pipeline activo</span>
                <span className="text-sm font-bold text-slate-700">{fmt(valorPipeline)}</span>
              </div>
              <div className="h-px bg-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Tasa de cierre</span>
                <span className="text-sm font-bold text-slate-900">{tasaCierre}%</span>
              </div>
            </div>
            <Link href="/dashboard/reportes"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-medium text-white py-2 transition-colors">
              Ver reportes completos →
            </Link>
          </div>

          {/* Próximas funciones */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Próximas funciones</h2>
              <Link href="/dashboard/funciones"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-colors">
                Ver todo →
              </Link>
            </div>
            {proximasFunciones.length === 0 ? (
              <p className="text-xs text-slate-400">No hay funciones próximas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {proximasFunciones.map((f) => {
                  const ocp = f.sillasTotales > 0 ? Math.round((f.sillasVendidas / f.sillasTotales) * 100) : 0;
                  const color = ocp >= 70 ? "bg-emerald-500" : ocp >= 40 ? "bg-amber-500" : "bg-red-400";
                  return (
                    <Link key={f.id} href={`/dashboard/funciones/${f.id}`}
                      className="rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 px-3 py-2 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">{f.titulo}</p>
                        <span className="text-xs font-bold text-slate-600">{ocp}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200">
                        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${ocp}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(f.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                        {" · "}{f.sillasVendidas}/{f.sillasTotales} sillas
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── SALUD COMERCIAL + PRODUCTIVIDAD ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Salud comercial */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Salud comercial</h2>
              <p className="text-xs text-slate-400 mt-0.5">Basado en actividad, seguimiento y conversión</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-extrabold ${saludColor}`}>{saludScore}</p>
              <p className="text-xs text-slate-400">/ 100</p>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-700 ${saludBg}`} style={{ width: `${saludScore}%` }} />
          </div>
          <div className="flex flex-col gap-2">
            {saludItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-sm ${item.ok ? "text-emerald-500" : "text-amber-500"}`}>
                  {item.ok ? "✔" : "⚠"}
                </span>
                <span className={`text-xs ${item.ok ? "text-slate-600" : "text-amber-700"}`}>{item.texto}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Centro de productividad */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Mi día de hoy</h2>
              <p className="text-xs text-slate-400 mt-0.5">Progreso de actividades</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-blue-600">{progresoDia}%</p>
              <p className="text-xs text-slate-400">{actividadesCompletadasHoy}/{totalActividadesHoy} completadas</p>
            </div>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full mb-4 overflow-hidden">
            <div className="h-3 rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${progresoDia}%` }} />
          </div>
          <div className="flex flex-col gap-2">
            {actividadesVencidas.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <span className="text-sm">🔴</span>
                <span className="text-xs font-medium text-red-700">{actividadesVencidas.length} actividad{actividadesVencidas.length !== 1 ? "es" : ""} vencida{actividadesVencidas.length !== 1 ? "s" : ""} sin completar</span>
                <Link href="/dashboard/agenda" className="ml-auto text-xs text-red-600 hover:underline shrink-0">Ver →</Link>
              </div>
            )}
            {actividadesHoy.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <span className="text-sm">📌</span>
                <span className="text-xs font-medium text-blue-700">{actividadesHoy.length} pendiente{actividadesHoy.length !== 1 ? "s" : ""} para hoy</span>
                <Link href="/dashboard/agenda" className="ml-auto text-xs text-blue-600 hover:underline shrink-0">Ver →</Link>
              </div>
            )}
            {cotizacionesSinMovimiento.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <span className="text-sm">📄</span>
                <span className="text-xs font-medium text-amber-700">{cotizacionesSinMovimiento.length} cotización{cotizacionesSinMovimiento.length !== 1 ? "es" : ""} sin respuesta +60 días</span>
                <Link href="/dashboard/cotizaciones" className="ml-auto text-xs text-amber-600 hover:underline shrink-0">Ver →</Link>
              </div>
            )}
            {actividadesVencidas.length === 0 && actividadesHoy.length === 0 && cotizacionesSinMovimiento.length === 0 && (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <span className="text-2xl mb-1">🎉</span>
                <p className="text-xs font-semibold text-slate-700">¡Todo al día!</p>
                <p className="text-xs text-slate-400">No tienes pendientes urgentes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Nuevo cliente",     href: "/dashboard/cuentas",                    emoji: "🏢",  color: "hover:border-blue-300 hover:bg-blue-50" },
          { label: "Nueva cotización",  href: "/dashboard/cotizaciones-formales/nueva", emoji: "📄",  color: "hover:border-violet-300 hover:bg-violet-50" },
          { label: "Nueva actividad",   href: "/dashboard/agenda",                     emoji: "📅",  color: "hover:border-amber-300 hover:bg-amber-50" },
          { label: "Ver pipeline",      href: "/dashboard/pipeline",                   emoji: "◈",   color: "hover:border-emerald-300 hover:bg-emerald-50" },
          { label: "Ver reportes",      href: "/dashboard/reportes",                   emoji: "📊",  color: "hover:border-slate-300 hover:bg-slate-50" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className={`flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-all hover:shadow-sm ${link.color}`}>
            <span className="text-xl">{link.emoji}</span>
            <span className="text-sm font-medium text-slate-700">{link.label}</span>
          </Link>
        ))}
      </div>

    </div>
  );
}
