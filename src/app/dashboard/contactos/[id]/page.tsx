"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExtrasPanel } from "@/components/extras-panel";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";
import { NotasRapidas } from "@/components/notas-rapidas";

type Empresa = { id: string; nombre: string };

type Detalle = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  notas: string | null;
  extras: Record<string, string> | null;
  empresa: Empresa | null;
  oportunidades: { id: string; titulo: string; etapa: string; valor: string | null }[];
  actividades: { id: string; titulo: string; fecha: string; completada: boolean }[];
};

export default function FichaContactoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contacto, setContacto] = useState<Detalle | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", cargo: "", notas: "", empresaId: "" });

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/contactos/${id}`);
    if (res.ok) {
      const data = await res.json();
      setContacto(data);
      setForm({
        nombre: data.nombre,
        email: data.email ?? "",
        telefono: data.telefono ?? "",
        cargo: data.cargo ?? "",
        notas: data.notas ?? "",
        empresaId: data.empresa?.id ?? "",
      });
    }
    setCargando(false);
  }

  async function cargarEmpresas() {
    const res = await fetch("/api/empresas");
    setEmpresas(await res.json());
  }

  useEffect(() => { cargar(); cargarEmpresas(); }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/contactos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este contacto? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/contactos/${id}`, { method: "DELETE" });
    router.push("/dashboard/contactos");
  }

  function formatoMoneda(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  if (cargando) return <p className="text-sm text-neutral-400">Cargando...</p>;
  if (!contacto) return <p className="text-sm text-neutral-400">No encontrado.</p>;

  return (
    <div>
      <Link href="/dashboard/contactos" className="mb-4 inline-block text-xs text-neutral-500 hover:underline">
        ← Volver a Contactos
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">{contacto.nombre}</h1>
          <p className="text-sm text-neutral-500">
            {contacto.cargo ?? "Sin cargo"} {contacto.empresa && `· ${contacto.empresa.nombre}`}
          </p>
        </div>
        <div className="flex gap-2">
          {contacto.telefono && (
            <a href={`https://wa.me/${contacto.telefono.replace(/\D/g, "")}`}
              target="_blank" rel="noopener noreferrer"
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
              💬 WhatsApp
            </a>
          )}
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
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div><span className="text-neutral-500">Email:</span> {contacto.email ?? "—"}</div>
          <div><span className="text-neutral-500">Teléfono:</span> {contacto.telefono ?? "—"}</div>
          <div className="col-span-2"><span className="text-neutral-500">Notas:</span> {contacto.notas ?? "—"}</div>
        </div>
      )}

      <ExtrasPanel extras={contacto.extras} />

      <NotasRapidas
        valor={contacto.notas}
        onGuardar={async (notas) => {
          await fetch(`/api/contactos/${contacto.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notas }),
          });
          cargar();
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-neutral-200 p-4">
          <h2 className="mb-3 text-sm font-medium text-neutral-900">
            Oportunidades ({contacto.oportunidades.length})
          </h2>
          {contacto.oportunidades.length === 0 ? (
            <p className="text-xs text-neutral-400">Sin oportunidades.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {contacto.oportunidades.map((o) => (
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
            Actividades ({contacto.actividades.length})
          </h2>
          <div className="flex flex-col gap-1 text-sm mb-3">
            {contacto.actividades.length === 0 ? (
              <p className="text-xs text-neutral-400">Sin actividades.</p>
            ) : (
              contacto.actividades.map((a) => (
                <div key={a.id} className={`flex items-center gap-2 ${a.completada ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-50" />
                  {a.titulo}
                  <span className="text-neutral-400 text-xs ml-auto">{new Date(a.fecha).toLocaleDateString("es-CO")}</span>
                </div>
              ))
            )}
          </div>
          <NuevaActividadInline contactoId={contacto.id} empresaId={contacto.empresa?.id} onGuardado={cargar} />
        </div>
      </div>
    </div>
  );
}
