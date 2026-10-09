"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { IconScale, IconGavel, IconCircleCheck, IconX, IconPlus, IconSearch } from "@tabler/icons-react";
import { boton, campo } from "@/components/ui/estilos";
import { SkeletonTabla, EstadoVacio } from "@/components/ui/estados";

type Expediente = {
  id: string;
  numeroRadicado: string;
  juzgado: string | null;
  tipoProceso: string | null;
  contraparte: string;
  estado: "ACTIVO" | "ARCHIVADO" | "GANADO" | "PERDIDO";
  creadoEn: string;
  empresa: { id: string; nombre: string } | null;
  _count: { terminos: number };
};

const ESTADO_STYLE: Record<Expediente["estado"], string> = {
  ACTIVO: "bg-blue-100 text-blue-700",
  ARCHIVADO: "bg-slate-100 text-slate-600",
  GANADO: "bg-emerald-100 text-emerald-700",
  PERDIDO: "bg-red-100 text-red-700",
};

export default function ExpedientesPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/expedientes")
      .then((res) => res.json())
      .then((data) => setExpedientes(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false));
  }, []);

  const filtrados = expedientes.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      e.numeroRadicado.toLowerCase().includes(q) ||
      e.contraparte.toLowerCase().includes(q) ||
      (e.empresa?.nombre ?? "").toLowerCase().includes(q)
    );
  });

  const activos = expedientes.filter((e) => e.estado === "ACTIVO").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Expedientes</h1>
        <p className="text-slate-500 text-sm mt-1">Seguimiento de casos jurídicos</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total expedientes" valor={expedientes.length} icon={IconScale} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Activos" valor={activos} icon={IconGavel} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Ganados" valor={expedientes.filter(e => e.estado === "GANADO").length} icon={IconCircleCheck} color="bg-emerald-500" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard label="Perdidos" valor={expedientes.filter(e => e.estado === "PERDIDO").length} icon={IconX} color="bg-red-500" iconBg="bg-red-50" iconColor="text-red-500" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por radicado, contraparte o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={campo("md", "w-80 pr-8")}
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-lg leading-none">
              ×
            </button>
          )}
        </div>
        <Link
          href="/dashboard/expedientes/nuevo"
          className={boton("primario", "md", "flex")}
        >
          <IconPlus size={16} stroke={2} />Nuevo expediente
        </Link>
      </div>

      {cargando ? (
        <SkeletonTabla />
      ) : filtrados.length === 0 ? (
        busqueda ? <EstadoVacio icon={IconSearch} titulo="Sin resultados" descripcion={`Ningún expediente coincide con “${busqueda}”.`} /> : (
          <EstadoVacio icon={IconScale} titulo="Aún no tienes expedientes"
            accion={<Link href="/dashboard/expedientes/nuevo" className={boton("primario", "md")}><IconPlus size={16} stroke={1.75} />Nuevo expediente</Link>} />
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Radicado</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Cliente</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Contraparte</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Juzgado</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-1 font-medium text-slate-900">
                    <Link href={`/dashboard/expedientes/${e.id}`} className="hover:text-brand-600 hover:underline">
                      {e.numeroRadicado}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-500">{e.empresa?.nombre ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e.contraparte}</td>
                  <td className="px-4 py-1 text-slate-500">{e.juzgado ?? "—"}</td>
                  <td className="px-4 py-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTADO_STYLE[e.estado]}`}>
                      {e.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
