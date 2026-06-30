"use client";

import { useEffect, useState } from "react";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
};

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string };

const ETAPAS = [
  { key: "PROSPECTO", label: "Prospecto" },
  { key: "CALIFICADO", label: "Calificado" },
  { key: "PROPUESTA", label: "Propuesta" },
  { key: "NEGOCIACION", label: "Negociación" },
  { key: "GANADA", label: "Ganada" },
  { key: "PERDIDA", label: "Perdida" },
];

export default function PipelinePage() {
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    titulo: "", valor: "", etapa: "PROSPECTO", notas: "", empresaId: "", contactoId: "",
  });

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/oportunidades");
    const data = await res.json();
    setOportunidades(data);
    setCargando(false);
  }

  async function cargarRelaciones() {
    const [resEmp, resCon] = await Promise.all([
      fetch("/api/empresas"),
      fetch("/api/contactos"),
    ]);
    setEmpresas(await resEmp.json());
    setContactos(await resCon.json());
  }

  useEffect(() => { cargar(); cargarRelaciones(); }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/oportunidades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", valor: "", etapa: "PROSPECTO", notas: "", empresaId: "", contactoId: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEtapa(id: string, etapa: string) {
    setOportunidades((prev) => prev.map((o) => (o.id === id ? { ...o, etapa } : o)));
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });
  }

  async function eliminarOportunidad(id: string) {
    if (!confirm("¿Eliminar esta oportunidad?")) return;
    setOportunidades((prev) => prev.filter((o) => o.id !== id));
    await fetch(`/api/oportunidades/${id}`, { method: "DELETE" });
  }

  function formatoMoneda(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(Number(valor));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Pipeline</h1>
          <p className="text-sm text-neutral-500">Oportunidades de venta por etapa</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva oportunidad
        </button>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nueva oportunidad</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Título *</label>
              <input
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Valor estimado (USD)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Etapa</label>
              <select
                value={form.etapa}
                onChange={(e) => setForm({ ...form, etapa: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {ETAPAS.map((et) => (
                  <option key={et.key} value={et.key}>{et.label}</option>
                ))}
              </select>
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
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Contacto</label>
              <select
                value={form.contactoId}
                onChange={(e) => setForm({ ...form, contactoId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin contacto</option>
                {contactos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
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
      ) : (
        <div className="grid grid-cols-6 gap-3">
          {ETAPAS.map((etapa) => {
            const items = oportunidades.filter((o) => o.etapa === etapa.key);
            return (
              <div key={etapa.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-medium text-neutral-700">{etapa.label}</h3>
                  <span className="text-xs text-neutral-400">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((o) => (
                    <div key={o.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-xs">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-neutral-900">{o.titulo}</p>
                        <button
                          onClick={() => eliminarOportunidad(o.id)}
                          className="text-neutral-300 hover:text-red-600"
                          title="Eliminar"
                        >
                          ×
                        </button>
                      </div>
                      {o.empresa && <p className="mt-1 text-neutral-500">{o.empresa.nombre}</p>}
                      {o.valor && (
                        <p className="mt-1 font-medium text-green-700">{formatoMoneda(o.valor)}</p>
                      )}
                      <select
                        value={o.etapa}
                        onChange={(e) => cambiarEtapa(o.id, e.target.value)}
                        className="mt-2 w-full rounded border border-neutral-200 px-1 py-1 text-xs outline-none"
                      >
                        {ETAPAS.map((et) => (
                          <option key={et.key} value={et.key}>{et.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
