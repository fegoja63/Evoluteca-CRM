"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExtrasPanel } from "@/components/extras-panel";

type Detalle = {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  extras: Record<string, string> | null;
  sitioWeb: string | null;
  telefono: string | null;
  notas: string | null;
  contactos: { id: string; nombre: string; cargo: string | null }[];
  oportunidades: { id: string; titulo: string; etapa: string; valor: string | null }[];
  actividades: { id: string; titulo: string; fecha: string; completada: boolean }[];
  cotizaciones: { id: string; numero: number; estado: string; items: { cantidad: number; precioUnit: string }[] }[];
};

const ETAPA_COLOR: Record<string, string> = {
  GANADA: "text-emerald-700",
  PERDIDA: "text-red-500",
  PROPUESTA: "text-violet-600",
  NEGOCIACION: "text-amber-600",
  CALIFICADO: "text-blue-600",
  PROSPECTO: "text-slate-500",
};

export default function FichaClientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [empresa, setEmpresa] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", sector: "", sitioWeb: "", telefono: "", notas: "" });

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/empresas/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEmpresa(data);
      setForm({
        nombre: data.nombre,
        email: data.email ?? "",
        sector: data.sector ?? "",
        sitioWeb: data.sitioWeb ?? "",
        telefono: data.telefono ?? "",
        notas: data.notas ?? "",
      });
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/empresas/${id}`, { method: "DELETE" });
    router.push("/dashboard/cuentas");
  }

  function fmt(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  if (cargando) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!empresa) return <p className="text-sm text-slate-400">No encontrado.</p>;

  return (
    <div>
      <Link href="/dashboard/cuentas" className="mb-4 inline-block text-xs text-slate-500 hover:underline">
        ← Volver a Clientes
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{empresa.nombre}</h1>
          <p className="text-sm text-slate-500">{empresa.sector ?? "Sin sector"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditando(!editando)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            {editando ? "Cancelar" : "Editar"}
          </button>
          <button onClick={handleEliminar}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>

      {editando ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
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
              <input value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sitio web</label>
              <input value={form.sitioWeb} onChange={e => setForm({ ...form, sitioWeb: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 rounded-2xl border border-slate-200 p-5 text-sm">
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Email</span><span className="text-slate-800">{empresa.email ?? "—"}</span></div>
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Teléfono</span><span className="text-slate-800">{empresa.telefono ?? "—"}</span></div>
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Sitio web</span><span className="text-slate-800">{empresa.sitioWeb ?? "—"}</span></div>
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Sector</span><span className="text-slate-800">{empresa.sector ?? "—"}</span></div>
          {empresa.notas && (
            <div className="col-span-2 flex gap-2"><span className="text-slate-400 w-20 shrink-0">Notas</span><span className="text-slate-800">{empresa.notas}</span></div>
          )}
        </div>
      )}

      <ExtrasPanel extras={empresa.extras} />

      <div className="grid grid-cols-2 gap-4 mt-4">
        {/* Contactos */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Contactos ({empresa.contactos.length})</h2>
          {empresa.contactos.length === 0 ? (
            <p className="text-xs text-slate-400">Sin contactos vinculados.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.contactos.map((c) => (
                <li key={c.id} className="text-slate-700">
                  {c.nombre}{c.cargo && <span className="text-slate-400"> · {c.cargo}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Oportunidades */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Oportunidades ({empresa.oportunidades.length})</h2>
          {empresa.oportunidades.length === 0 ? (
            <p className="text-xs text-slate-400">Sin oportunidades.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {empresa.oportunidades.map((o) => (
                <li key={o.id} className="text-slate-700">
                  {o.titulo}
                  <span className={`ml-1.5 text-xs font-medium ${ETAPA_COLOR[o.etapa] ?? "text-slate-400"}`}>· {o.etapa}</span>
                  {o.valor && <span className="ml-1.5 text-xs font-semibold text-emerald-700">{fmt(o.valor)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actividades */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Actividades ({empresa.actividades.length})</h2>
          {empresa.actividades.length === 0 ? (
            <p className="text-xs text-slate-400">Sin actividades.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.actividades.map((a) => (
                <li key={a.id} className={a.completada ? "text-slate-400 line-through" : "text-slate-700"}>
                  {a.titulo}
                  <span className="text-slate-400 text-xs ml-1">· {new Date(a.fecha).toLocaleDateString("es-CO")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cotizaciones */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Cotizaciones ({empresa.cotizaciones.length})</h2>
          {empresa.cotizaciones.length === 0 ? (
            <p className="text-xs text-slate-400">Sin cotizaciones.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.cotizaciones.map((c) => {
                const total = c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
                return (
                  <li key={c.id} className="text-slate-700">
                    #{c.numero}
                    <span className="text-slate-400 text-xs ml-1">· {c.estado}</span>
                    <span className="text-xs font-semibold text-emerald-700 ml-1">· {fmt(String(total))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
