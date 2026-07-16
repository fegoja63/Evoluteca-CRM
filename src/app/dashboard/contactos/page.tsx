"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pager } from "@/components/pager";
import {
  IconUsers, IconBuilding, IconAlertTriangle, IconMail, IconUserCircle, IconX,
  IconPencil, IconTrash,
  type Icon,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { puedeEliminar } from "@/lib/permisos";
import { toast } from "@/lib/toast";

const TAKE = 30;

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
  const [todosContactos, setTodosContactos] = useState<Contacto[]>([]);
  const [modoEmpresa, setModoEmpresa] = useState<"existente" | "nueva">("existente");
  const [nuevaEmpresaForm, setNuevaEmpresaForm] = useState({ nombre: "", email: "", telefono: "" });
  const [creandoEmpresaLoading, setCreandoEmpresaLoading] = useState(false);
  const [creandoEmpresaError, setCreandoEmpresaError] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, conEmpresa: 0, sinEmpresa: 0, conEmail: 0 });
  const [editando, setEditando] = useState<Contacto | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", email: "", telefono: "", cargo: "", empresaId: "" });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const { data: session } = useSession();
  const puedeBorrar = puedeEliminar(session?.user?.rol);

  const duplicados = todosContactos.filter(c => {
    const nombreMatch = form.nombre.trim().length >= 3 &&
      c.nombre.toLowerCase().includes(form.nombre.trim().toLowerCase());
    const emailMatch = form.email.trim() && c.email &&
      c.email.toLowerCase() === form.email.trim().toLowerCase();
    return nombreMatch || emailMatch;
  });

  const busquedaRef = useRef("");
  async function cargar(q = "", p = 1) {
    busquedaRef.current = q;
    setCargando(true);
    const res = await fetch(`/api/contactos?q=${encodeURIComponent(q)}&page=${p}&take=${TAKE}`);
    const data = await res.json();
    if (busquedaRef.current !== q) return; // respuesta obsoleta — ya se lanzó una búsqueda más reciente
    setContactos(data);
    setTotalCount(Number(res.headers.get("X-Total-Count") ?? data.length));
    setCargando(false);
  }

  async function cargarStats(q = "") {
    const res = await fetch(`/api/contactos/stats?q=${encodeURIComponent(q)}`);
    setStats(await res.json());
  }

  function cambiarPagina(p: number) {
    setPage(p);
    cargar(busqueda, p);
  }

  async function crearEmpresaInline() {
    if (!nuevaEmpresaForm.nombre.trim()) return;
    setCreandoEmpresaLoading(true);
    setCreandoEmpresaError("");
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevaEmpresaForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setCreandoEmpresaError(data.error ?? "No se pudo crear el cliente");
      setCreandoEmpresaLoading(false);
      return;
    }
    const nueva = await res.json();
    setEmpresas(prev => [{ id: nueva.id, nombre: nueva.nombre }, ...prev]);
    setForm(f => ({ ...f, empresaId: nueva.id }));
    setModoEmpresa("existente");
    setNuevaEmpresaForm({ nombre: "", email: "", telefono: "" });
    setCreandoEmpresaLoading(false);
  }

  async function cargarEmpresas() {
    const res = await fetch("/api/empresas");
    const data = await res.json();
    setEmpresas(data);
  }

  useEffect(() => { cargar("", 1); cargarEmpresas(); cargarStats(""); }, []);

  // Lista completa (sin paginar) solo para detección de duplicados al crear —
  // independiente de la tabla paginada.
  useEffect(() => {
    fetch("/api/contactos").then(res => res.json()).then(setTodosContactos);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); cargar(busqueda, 1); cargarStats(busqueda); }, 300);
    return () => clearTimeout(timer);
  }, [busqueda]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (modoEmpresa === "nueva" && !form.empresaId && nuevaEmpresaForm.nombre.trim()) {
      setCreandoEmpresaError("Tienes datos de un cliente nuevo sin crear. Haz clic en \"Crear cliente\" o cambia a \"Existente\".");
      return;
    }
    setGuardando(true);
    await fetch("/api/contactos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ nombre: "", email: "", telefono: "", cargo: "", notas: "", empresaId: "" });
    setModoEmpresa("existente");
    setNuevaEmpresaForm({ nombre: "", email: "", telefono: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar(busqueda, page);
    cargarStats(busqueda);
    fetch("/api/contactos").then(res => res.json()).then(setTodosContactos);
  }

  function abrirEdicion(c: Contacto) {
    setEditando(c);
    setFormEdit({
      nombre: c.nombre,
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      cargo: c.cargo ?? "",
      empresaId: c.empresa?.id ?? "",
    });
  }

  async function handleGuardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    try {
      const res = await fetch(`/api/contactos/${editando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEdit),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
        setGuardandoEdit(false);
        return;
      }
    } catch {
      toast.error("No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
      setGuardandoEdit(false);
      return;
    }
    setEditando(null);
    setGuardandoEdit(false);
    cargar(busqueda, page);
    cargarStats(busqueda);
    fetch("/api/contactos").then(res => res.json()).then(setTodosContactos);
  }

  async function handleEliminar(c: Contacto) {
    if (!confirm(`¿Eliminar el contacto "${c.nombre}"? Se moverá a la Papelera y podrás restaurarlo desde ahí.`)) return;
    try {
      const res = await fetch(`/api/contactos/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
        return;
      }
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    cargar(busqueda, page);
    cargarStats(busqueda);
    fetch("/api/contactos").then(res => res.json()).then(setTodosContactos);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Contactos</h1>
        <p className="text-slate-500 text-sm mt-1">Personas de tus cuentas</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {([
          { label: "Total contactos", valor: stats.total, icon: IconUsers, semantic: false },
          { label: "Con empresa", valor: stats.conEmpresa, icon: IconBuilding, semantic: false },
          { label: "Sin empresa", valor: stats.sinEmpresa, sub: "Sin vincular", icon: IconAlertTriangle, semantic: true },
          { label: "Con email", valor: stats.conEmail, icon: IconMail, semantic: false },
        ] as { label: string; valor: number; sub?: string; icon: Icon; semantic: boolean }[]).map(k => {
          const Icono = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.semantic ? "bg-amber-50" : "bg-brand-50"}`}>
                  <Icono size={18} stroke={1.75} className={k.semantic ? "text-amber-600" : "text-brand-600"} />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 leading-none">{k.valor}</p>
              <p className="text-xs font-semibold text-slate-700 mt-1">{k.label}</p>
              {k.sub && <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-8 text-sm outline-none focus:border-brand-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/exportar/contactos"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5">
            ↓ Exportar Excel
          </a>
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 inline-flex items-center gap-1.5"
          >
            <IconUserCircle size={16} stroke={1.75} />
            Nuevo contacto
          </button>
        </div>
      </div>

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Nuevo contacto</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Cargo</label>
              <input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-neutral-500">Empresa</label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setModoEmpresa("existente")}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${modoEmpresa === "existente" ? "bg-accent-600 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
                    Existente
                  </button>
                  <button type="button" onClick={() => setModoEmpresa("nueva")}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${modoEmpresa === "nueva" ? "bg-accent-600 text-white" : "bg-neutral-300 text-neutral-800 hover:bg-neutral-400"}`}>
                    + Nueva
                  </button>
                </div>
              </div>
              {modoEmpresa === "existente" ? (
                <select
                  value={form.empresaId}
                  onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">Sin empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              ) : (
                <div className="rounded-md border border-brand-200 bg-brand-50 p-2.5">
                  <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Nombre de la empresa *" value={nuevaEmpresaForm.nombre}
                      onChange={e => setNuevaEmpresaForm(f => ({ ...f, nombre: e.target.value }))}
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    <input type="email" placeholder="Email (opcional)" value={nuevaEmpresaForm.email}
                      onChange={e => setNuevaEmpresaForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    <input type="text" placeholder="Teléfono (opcional)" value={nuevaEmpresaForm.telefono}
                      onChange={e => setNuevaEmpresaForm(f => ({ ...f, telefono: e.target.value }))}
                      className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500" />
                    {creandoEmpresaError && <p className="text-xs text-red-600">{creandoEmpresaError}</p>}
                    <button type="button" onClick={crearEmpresaInline} disabled={creandoEmpresaLoading || !nuevaEmpresaForm.nombre.trim()}
                      className="self-start rounded-md bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                      {creandoEmpresaLoading ? "Creando..." : "Crear empresa"}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            {duplicados.length > 0 && (
              <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold mb-1 flex items-center gap-1.5"><IconAlertTriangle size={13} stroke={1.75} />Posible duplicado detectado:</p>
                <ul className="space-y-0.5">
                  {duplicados.map(d => (
                    <li key={d.id}>
                      <Link href={`/dashboard/contactos/${d.id}`} className="font-medium hover:underline text-amber-900">
                        {d.nombre}
                      </Link>
                      {d.empresa && <span className="text-amber-700"> · {d.empresa.nombre}</span>}
                      {d.email && <span className="text-amber-700"> · {d.email}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : duplicados.length > 0 ? "Guardar de todas formas" : "Guardar"}
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
                <th className="px-4 py-1 font-medium">Nombre</th>
                <th className="px-4 py-1 font-medium">Cargo</th>
                <th className="px-4 py-1 font-medium">Email</th>
                <th className="px-4 py-1 font-medium">Empresa</th>
                <th className="px-4 py-1 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {contactos.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-1 font-medium text-neutral-900">
                    <Link href={`/dashboard/contactos/${c.id}`} className="hover:underline">
                      {c.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-neutral-500">{c.cargo ?? "—"}</td>
                  <td className="px-4 py-1 text-neutral-500">{c.email ?? "—"}</td>
                  <td className="px-4 py-1 text-neutral-500">{c.empresa?.nombre ?? "—"}</td>
                  <td className="px-4 py-1 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => abrirEdicion(c)} title="Editar"
                        className="text-neutral-300 hover:text-brand-600 inline-flex">
                        <IconPencil size={15} stroke={1.75} />
                      </button>
                      {puedeBorrar && (
                        <button onClick={() => handleEliminar(c)} title="Eliminar"
                          className="text-neutral-300 hover:text-red-600 inline-flex">
                          <IconTrash size={15} stroke={1.75} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager page={page} take={TAKE} total={totalCount} onChange={cambiarPagina} />
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditando(null)}>
          <div className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-900">Editar contacto</h2>
              <button onClick={() => setEditando(null)} className="text-neutral-400 hover:text-neutral-700">
                <IconX size={18} stroke={1.75} />
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-neutral-500">Nombre *</label>
                <input required value={formEdit.nombre}
                  onChange={(e) => setFormEdit({ ...formEdit, nombre: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Email</label>
                <input type="email" value={formEdit.email}
                  onChange={(e) => setFormEdit({ ...formEdit, email: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Teléfono</label>
                <input value={formEdit.telefono}
                  onChange={(e) => setFormEdit({ ...formEdit, telefono: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Cargo</label>
                <input value={formEdit.cargo}
                  onChange={(e) => setFormEdit({ ...formEdit, cargo: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">Empresa</label>
                <select value={formEdit.empresaId}
                  onChange={(e) => setFormEdit({ ...formEdit, empresaId: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500">
                  <option value="">Sin empresa</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 flex gap-2 pt-1">
                <button type="submit" disabled={guardandoEdit}
                  className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                </button>
                <button type="button" onClick={() => setEditando(null)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


