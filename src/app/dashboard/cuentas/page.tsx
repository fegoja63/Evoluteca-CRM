"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";

type Empresa = {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  telefono: string | null;
  sitioWeb: string | null;
  creadoEn: string;
  etiquetas: string[];
  _count: { contactos: number };
};

const SECTORES = [
  "Arte y Cultura", "Educación", "Entretenimiento", "Eventos corporativos",
  "Gobierno", "Hospitalidad y Turismo", "Medios y Comunicación", "Música",
  "Religioso", "Salud", "Teatro y Artes escénicas", "Tecnología",
  "Otro",
];

export default function ClientesPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEtiqueta, setFiltroEtiqueta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", sector: "", sitioWeb: "", telefono: "", notas: "" });
  const [todasEmpresas, setTodasEmpresas] = useState<Empresa[]>([]);

  // Duplicados: busca por nombre similar o email exacto
  const duplicados = todasEmpresas.filter(e => {
    const nombreMatch = form.nombre.trim().length >= 3 &&
      e.nombre.toLowerCase().includes(form.nombre.trim().toLowerCase());
    const emailMatch = form.email.trim() && e.email &&
      e.email.toLowerCase() === form.email.trim().toLowerCase();
    return nombreMatch || emailMatch;
  });

  async function cargar(q = "") {
    setCargando(true);
    const res = await fetch(`/api/empresas?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setEmpresas(data);
    if (!q) setTodasEmpresas(data);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ nombre: "", email: "", sector: "", sitioWeb: "", telefono: "", notas: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar(busqueda);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-slate-500 text-sm mt-1">Empresas, organizaciones y personas naturales</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total clientes" valor={empresas.length} emoji="🏢" color="bg-blue-500" />
        <KpiCard label="Con contactos" valor={empresas.filter(e => e._count.contactos > 0).length} emoji="👤" color="bg-violet-500" />
        <KpiCard label="Sin contactos" valor={empresas.filter(e => e._count.contactos === 0).length} emoji="⚠️" color="bg-amber-500" sub="Requieren seguimiento" />
        <KpiCard label="Contactos vinculados" valor={empresas.reduce((acc, e) => acc + e._count.contactos, 0)} emoji="🔗" color="bg-emerald-500" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-72 rounded-xl border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-lg leading-none">
              ×
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <a href="/api/exportar/clientes"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5">
            ↓ Exportar Excel
          </a>
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* Filtros de etiqueta */}
      {(() => {
        const todasEtiquetas = Array.from(new Set(empresas.flatMap(e => e.etiquetas ?? [])));
        if (todasEtiquetas.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {todasEtiquetas.map(tag => (
              <button key={tag} onClick={() => setFiltroEtiqueta(filtroEtiqueta === tag ? "" : tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${filtroEtiqueta === tag ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {tag}
              </button>
            ))}
            {filtroEtiqueta && (
              <button onClick={() => setFiltroEtiqueta("")}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                × Limpiar filtro
              </button>
            )}
          </div>
        );
      })()}

      {mostrarForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Nuevo cliente</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sector</label>
              <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                <option value="">Sin sector</option>
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sitio web</label>
              <input value={form.sitioWeb} onChange={e => setForm({ ...form, sitioWeb: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            {duplicados.length > 0 && (
              <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold mb-1">⚠️ Posible duplicado detectado:</p>
                <ul className="space-y-0.5">
                  {duplicados.map(d => (
                    <li key={d.id}>
                      <Link href={`/dashboard/cuentas/${d.id}`} className="font-medium hover:underline text-amber-900">
                        {d.nombre}
                      </Link>
                      {d.email && <span className="text-amber-700"> · {d.email}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar de todas formas"}
              </button>
              <button type="button" onClick={() => setMostrarForm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : empresas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">
            {busqueda ? "No se encontraron resultados." : "Aún no tienes clientes. Crea el primero."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Email</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Teléfono</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Sector</th>
                <th className="px-4 py-1 font-semibold uppercase tracking-wide">Contactos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {empresas.filter(e => !filtroEtiqueta || (e.etiquetas ?? []).includes(filtroEtiqueta)).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-1 font-medium text-slate-900">
                    <Link href={`/dashboard/cuentas/${e.id}`} className="hover:text-blue-600 hover:underline">
                      {e.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-500">{e.email ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500 whitespace-nowrap">{e.telefono ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e.sector ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e._count.contactos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


