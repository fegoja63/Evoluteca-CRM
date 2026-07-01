import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? "";

  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);

  const [empresas, contactos, oportunidades, actividadesPendientes, actividadesHoy, proximasFunciones] = await Promise.all([
    prisma.empresa.count({ where: { tenantId } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.findMany({ where: { tenantId }, select: { etapa: true, valor: true } }),
    prisma.actividad.count({ where: { tenantId, completada: false } }),
    prisma.actividad.findMany({
      where: { tenantId, completada: false, fecha: { gte: inicioHoy, lt: finHoy } },
      orderBy: { fecha: "asc" },
      take: 8,
      include: {
        empresa:  { select: { id: true, nombre: true } },
        contacto: { select: { id: true, nombre: true } },
        oportunidad: { select: { id: true, titulo: true } },
      },
    }),
    prisma.funcion.findMany({
      where: { tenantId, fecha: { gte: hoy } },
      orderBy: { fecha: "asc" },
      take: 5,
    }).catch(() => []),
  ]);

  const valorPipeline = oportunidades
    .filter((o) => o.etapa !== "PERDIDA")
    .reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const ganadas = oportunidades.filter((o) => o.etapa === "GANADA").length;
  const totalOp = oportunidades.length;

  function fmt(valor: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
  }

  const TIPO_ICON: Record<string, string> = {
    LLAMADA: "📞", REUNION: "🤝", TAREA: "✅", EMAIL: "✉️",
  };

  const kpis = [
    { label: "Clientes", valor: empresas, href: "/dashboard/cuentas", color: "bg-blue-500", iconBg: "bg-blue-50", emoji: "🏢" },
    { label: "Contactos", valor: contactos, href: "/dashboard/contactos", color: "bg-violet-500", iconBg: "bg-violet-50", emoji: "👤" },
    { label: "Valor en pipeline", valor: fmt(valorPipeline), href: "/dashboard/pipeline", color: "bg-emerald-500", iconBg: "bg-emerald-50", emoji: "💰" },
    { label: "Tareas pendientes", valor: actividadesPendientes, href: "/dashboard/agenda", color: "bg-amber-500", iconBg: "bg-amber-50", emoji: "📅" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Hola, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {session?.user?.tenantNombre} · {session?.user?.rol ? session.user.rol.charAt(0) + session.user.rol.slice(1).toLowerCase() : ""}
          {" · "}{hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Link key={kpi.href} href={kpi.href}>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-3xl font-bold text-slate-900">{kpi.valor}</p>
                  <p className="text-sm text-slate-500 mt-1">{kpi.label}</p>
                </div>
                <div className={`w-11 h-11 ${kpi.iconBg} rounded-xl flex items-center justify-center text-xl`}>
                  {kpi.emoji}
                </div>
              </div>
              <div className={`h-1 ${kpi.color} rounded-full mt-2`} />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Pipeline */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Estado del pipeline</h2>
            <Link href="/dashboard/pipeline" className="text-xs text-blue-600 hover:underline">Ver todo →</Link>
          </div>
          {totalOp === 0 ? (
            <p className="text-sm text-slate-400">Aún no tienes oportunidades.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: "Prospecto",   key: "PROSPECTO",   color: "bg-slate-400" },
                { label: "Calificado",  key: "CALIFICADO",  color: "bg-blue-400" },
                { label: "Cotización",  key: "PROPUESTA",   color: "bg-violet-400" },
                { label: "Negociación", key: "NEGOCIACION", color: "bg-amber-400" },
                { label: "Ganada",      key: "GANADA",      color: "bg-emerald-500" },
                { label: "Perdida",     key: "PERDIDA",     color: "bg-red-400" },
              ].map((etapa) => {
                const n = oportunidades.filter((o) => o.etapa === etapa.key).length;
                const pct = totalOp ? (n / totalOp) * 100 : 0;
                return (
                  <div key={etapa.key}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{etapa.label}</span>
                      <span className="font-medium">{n}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${etapa.color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-slate-400 pt-1">
                {ganadas} ganadas de {totalOp} · Tasa {totalOp > 0 ? Math.round((ganadas / totalOp) * 100) : 0}%
              </p>
            </div>
          )}
        </div>

        {/* Actividades de hoy */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Actividades de hoy
              {actividadesHoy.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                  {actividadesHoy.length}
                </span>
              )}
            </h2>
            <Link href="/dashboard/agenda" className="text-xs text-blue-600 hover:underline">Ver agenda →</Link>
          </div>
          {actividadesHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="text-sm font-medium text-slate-600">Sin actividades pendientes hoy</p>
              <p className="text-xs text-slate-400 mt-1">Tienes el día libre o todo al día</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {actividadesHoy.map((a) => (
                <div key={a.id} className="flex gap-3 items-start rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50">
                  <span className="text-base mt-0.5 shrink-0">{TIPO_ICON[a.tipo] ?? "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.titulo}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {a.empresa?.nombre ?? a.contacto?.nombre ?? a.oportunidad?.titulo ?? "Sin vínculo"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {new Date(a.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas funciones + accesos rápidos */}
        <div className="flex flex-col gap-4">
          {/* Próximas funciones */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Próximas funciones</h2>
              <Link href="/dashboard/funciones" className="text-xs text-blue-600 hover:underline">Ver todo →</Link>
            </div>
            {proximasFunciones.length === 0 ? (
              <p className="text-xs text-slate-400">No hay funciones próximas.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {proximasFunciones.map((f) => {
                  const ocp = f.sillasTotales > 0 ? Math.round((f.sillasVendidas / f.sillasTotales) * 100) : 0;
                  return (
                    <Link key={f.id} href={`/dashboard/funciones/${f.id}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{f.titulo}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(f.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${ocp >= 70 ? "text-emerald-700" : ocp >= 40 ? "text-amber-600" : "text-red-600"}`}>
                          {ocp}%
                        </p>
                        <p className="text-xs text-slate-400">{f.sillasVendidas}/{f.sillasTotales}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accesos rápidos */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Accesos rápidos</h2>
            <div className="flex flex-col gap-1.5">
              {[
                { label: "Nuevo cliente",      href: "/dashboard/cuentas",      emoji: "🏢" },
                { label: "Nueva cotización",   href: "/dashboard/cotizaciones",  emoji: "📋" },
                { label: "Nueva actividad",    href: "/dashboard/agenda",        emoji: "📅" },
                { label: "Ver reportes",       href: "/dashboard/reportes",      emoji: "📊" },
              ].map((link) => (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-slate-50 border border-slate-100 transition-colors text-sm text-slate-700 font-medium">
                  <span>{link.emoji}</span>
                  {link.label}
                  <span className="text-slate-300 ml-auto">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
