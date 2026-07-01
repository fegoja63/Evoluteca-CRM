"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";

type Contacto = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  creadoEn: string;
  empresa: { id: string; nombre: string } | null;
};

type Empresa = { id: string; nombre: string };

export default function ContactosPage() {
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", cargo: "", notas: "", empresaId: "" });

  async function cargar(q = "") {
    setCargando(true);
    const res = await fetch(`/api/contactos?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setContactos(data);
    setCargando(false);
  }

  async function cargarEmpresas() {
    const res = await fetch("/api/empresas");
    const data = await res.json();
    setEmpresas(data);
  }

  useEffect(() => { cargar(); cargarEmpresas(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/contactos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ nombre: "", email: "", telefono: "", cargo: "", notas: "", empresaId: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar(busqueda);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Contactos</h1>
        <p className="text-slate-500 text-sm mt-1">Personas de tus cuentas</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total contactos" valor={contactos.length} emoji="👤" color="bg-violet-500" />
        <KpiCard label="Con empresa" valor={contactos.filter(c => c.empresa).length} emoji="🏢" color="bg-blue-500" />
        <KpiCard label="Sin empresa" valor={contactos.filter(c => !c.empresa).length} emoji="⚠️" color="bg-amber-500" sub="Sin vincular" />
        <KpiCard label="Con email" valor={contactos.filter(c => c.email).length} emoji="✉️" color="bg-emerald-500" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div></div>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo contacto
        </button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-500"
        />
        {busqueda && (
          <button onClick={() => setBusqueda("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 text-lg leading-none">
            ×
          </button>
        )}
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nuevo contacto</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Cargo</label>
              <input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Empresa</label>
              <select
                value={form.empresaId}
                onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-neutral-400">Cargando...</p>
      ) : contactos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {busqueda ? "No se encontraron resultados." : "Aún no tienes contactos. Crea el primero."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Cargo</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {contactos.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    <Link href={`/dashboard/contactos/${c.id}`} className="hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{c.cargo ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.email ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{c.empresa?.nombre ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
