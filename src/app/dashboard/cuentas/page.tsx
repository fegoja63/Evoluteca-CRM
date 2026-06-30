"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Empresa = {
  id: string;
  nombre: string;
  sector: string | null;
  telefono: string | null;
  sitioWeb: string | null;
  creadoEn: string;
  _count: { contactos: number };
};

export default function CuentasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", sector: "", sitioWeb: "", telefono: "", notas: "" });

  async function cargar(q = "") {
    setCargando(true);
    const res = await fetch(`/api/empresas?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setEmpresas(data);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => cargar(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ nombre: "", sector: "", sitioWeb: "", telefono: "", notas: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar(busqueda);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Cuentas</h1>
          <p className="text-sm text-neutral-500">Empresas y organizaciones</p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva cuenta
        </button>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-4 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
      />

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nueva cuenta</h2>
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
              <label className="mb-1 block text-xs text-neutral-500">Sector</label>
              <input
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
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
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Sitio web</label>
              <input
                value={form.sitioWeb}
                onChange={(e) => setForm({ ...form, sitioWeb: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
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
      ) : empresas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {busqueda ? "No se encontraron resultados." : "Aún no tienes cuentas. Crea la primera."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Sector</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Contactos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {empresas.map((e) => (
                <tr key={e.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{e.nombre}</td>
                  <td className="px-4 py-3 text-neutral-500">{e.sector ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{e.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{e._count.contactos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
