"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Detalle = {
  id: string;
  nombre: string;
  sector: string | null;
  sitioWeb: string | null;
  telefono: string | null;
  notas: string | null;
  contactos: { id: string; nombre: string; cargo: string | null }[];
  oportunidades: { id: string; titulo: string; etapa: string; valor: string | null }[];
  actividades: { id: string; titulo: string; fecha: string; completada: boolean }[];
  cotizaciones: { id: string; numero: number; estado: string; items: { cantidad: number; precioUnit: string }[] }[];
};

export default function FichaEmpresaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [empresa, setEmpresa] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", sector: "", sitioWeb: "", telefono: "", notas: "" });

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/empresas/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEmpresa(data);
      setForm({
        nombre: data.nombre,
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
    if (!confirm("¿Eliminar esta cuenta? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/empresas/${id}`, { method: "DELETE" });
    router.push("/dashboard/cuentas");
  }

  function formatoMoneda(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "USD" }).format(Number(valor));
  }

  if (cargando) return <p className="text-sm text-neutral-400">Cargando...</p>;
  if (!empresa) return <p className="text-sm text-neutral-400">No encontrada.</p>;

  return (
    <div>
      <Link href="/dashboard/cuentas" className="mb-4 inline-block text-xs text-neutral-500 hover:underline">
        ← Volver a Cuentas
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">{empresa.nombre}</h1>
          <p className="text-sm text-neutral-500">{empresa.sector ?? "Sin sector"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditando(!editando)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            {editando ? "Cancelar" : "Editar"}
          </button>
          <button
            onClick={handleEliminar}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {editando ? (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
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
            <div className="col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 p-4 text-sm">
          <div><span className="text-neutral-500">Teléfono:</span> {empresa.telefono ?? "—"}</div>
          <div><span className="text-neutral-500">Sitio web:</span> {empresa.sitioWeb ?? "—"}</div>
          <div className="col-span-2"><span className="text-neutral-500">Notas:</span> {empresa.notas ?? "—"}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Contactos ({empresa.contactos.length})
          </h2>
          {empresa.contactos.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin contactos vinculados.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.contactos.map((c) => (
                <li key={c.id} className="text-neutral-700">
                  {c.nombre} {c.cargo && <span className="text-neutral-400">· {c.cargo}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Oportunidades ({empresa.oportunidades.length})
          </h2>
          {empresa.oportunidades.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin oportunidades.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.oportunidades.map((o) => (
                <li key={o.id} className="text-neutral-700">
                  {o.titulo} <span className="text-neutral-400">· {o.etapa}</span>
                  {o.valor && <span className="text-green-700"> · {formatoMoneda(o.valor)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Actividades ({empresa.actividades.length})
          </h2>
          {empresa.actividades.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin actividades.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.actividades.map((a) => (
                <li key={a.id} className={a.completada ? "text-neutral-400 line-through" : "text-neutral-700"}>
                  {a.titulo} <span className="text-neutral-400">· {new Date(a.fecha).toLocaleDateString("es-ES")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Cotizaciones ({empresa.cotizaciones.length})
          </h2>
          {empresa.cotizaciones.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin cotizaciones.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.cotizaciones.map((c) => {
                const total = c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
                return (
                  <li key={c.id} className="text-neutral-700">
                    #{c.numero} <span className="text-neutral-400">· {c.estado}</span>
                    {" · "}{formatoMoneda(String(total))}
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
