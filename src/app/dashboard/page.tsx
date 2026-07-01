import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? "";

  const [empresas, contactos, oportunidades, actividades] = await Promise.all([
    prisma.empresa.count({ where: { tenantId } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.findMany({ where: { tenantId }, select: { etapa: true, valor: true } }),
    prisma.actividad.count({ where: { tenantId, completada: false } }),
  ]);

  const valorPipeline = oportunidades
    .filter((o) => o.etapa !== "PERDIDA")
    .reduce((acc, o) => acc + Number(o.valor ?? 0), 0);

  const ganadas = oportunidades.filter((o) => o.etapa === "GANADA").length;
  const totalOp = oportunidades.length;

  function formatoMoneda(valor: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor);
  }

  const kpis = [
    { label: "Clientes", valor: empresas, href: "/dashboard/cuentas", color: "bg-blue-500", iconBg: "bg-blue-50", emoji: "🏢" },
    { label: "Contactos", valor: contactos, href: "/dashboard/contactos", color: "bg-violet-500", iconBg: "bg-violet-50", emoji: "👤" },
    { label: "Valor en pipeline", valor: formatoMoneda(valorPipeline), href: "/dashboard/pipeline", color: "bg-emerald-500", iconBg: "bg-emerald-50", emoji: "💰" },
    { label: "Tareas pendientes", valor: actividades, href: "/dashboard/agenda", color: "bg-amber-500", iconBg: "bg-amber-50", emoji: "📅" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Hola, {session?.user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          {session?.user?.tenantNombre} · {session?.user?.rol ? session.user.rol.charAt(0) + session.user.rol.slice(1).toLowerCase() : ""}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
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

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Estado del pipeline</h2>
          {totalOp === 0 ? (
            <p className="text-sm text-slate-400">Aún no tienes oportunidades.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {[
                { label: "Prospecto", key: "PROSPECTO", color: "bg-slate-400" },
                { label: "Calificado", key: "CALIFICADO", color: "bg-blue-400" },
                { label: "Propuesta", key: "PROPUESTA", color: "bg-violet-400" },
                { label: "Negociación", key: "NEGOCIACION", color: "bg-amber-400" },
                { label: "Ganada", key: "GANADA", color: "bg-emerald-500" },
                { label: "Perdida", key: "PERDIDA", color: "bg-red-400" },
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
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Accesos rápidos</h2>
          <div className="flex flex-col gap-2">
            {[
              { label: "Nueva cuenta", href: "/dashboard/cuentas", desc: "Registra una empresa" },
              { label: "Nuevo contacto", href: "/dashboard/contactos", desc: "Agrega una persona" },
              { label: "Nueva oportunidad", href: "/dashboard/pipeline", desc: "Abre un negocio" },
              { label: "Nueva actividad", href: "/dashboard/agenda", desc: "Agenda una tarea o llamada" },
              { label: "Nueva propuesta", href: "/dashboard/cotizaciones", desc: "Registra una propuesta activa" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-slate-50 border border-slate-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-800">{link.label}</p>
                  <p className="text-xs text-slate-400">{link.desc}</p>
                </div>
                <span className="text-slate-300 text-lg">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
