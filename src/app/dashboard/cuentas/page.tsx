"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pager } from "@/components/pager";
import {
  IconBuilding, IconUsers, IconAlertTriangle, IconLink, IconBuildingPlus, IconX, IconTrash, IconPencil,
  type Icon,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { puedeEliminar } from "@/lib/permisos";
import { toast } from "@/lib/toast";

const TAKE = 30;

type Empresa = {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  telefono: string | null;
  sitioWeb: string | null;
  notas: string | null;
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
  const [nuevoContactoForm, setNuevoContactoForm] = useState({ nombre: "", email: "", telefono: "", cargo: "" });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, conContactos: 0, sinContactos: 0, contactosVinculados: 0 });
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [formEdit, setFormEdit] = useState({ nombre: "", email: "", telefono: "", sector: "", sitioWeb: "", notas: "" });
  const [guardandoEdit, setGuardandoEdit] = useState(false);
  const { data: session } = useSession();
  const puedeBorrar = puedeEliminar(session?.user?.rol);

  // Duplicados: busca por nombre similar o email exacto
  const duplicados = todasEmpresas.filter(e => {
    const nombreMatch = form.nombre.trim().length >= 3 &&
      e.nombre.toLowerCase().includes(form.nombre.trim().toLowerCase());
    const emailMatch = form.email.trim() && e.email &&
      e.email.toLowerCase() === form.email.trim().toLowerCase();
    return nombreMatch || emailMatch;
  });

  const busquedaRef = useRef("");
  async function cargar(q = "", p = 1) {
    busquedaRef.current = q;
    setCargando(true);
    const res = await fetch(`/api/empresas?q=${encodeURIComponent(q)}&page=${p}&take=${TAKE}`);
    const data = await res.json();
    if (busquedaRef.current !== q) return; // respuesta obsoleta — ya se lanzó una búsqueda más reciente
    setEmpresas(data);
    setTotalCount(Number(res.headers.get("X-Total-Count") ?? data.length));
    setCargando(false);
  }

  async function cargarStats(q = "") {
    const res = await fetch(`/api/empresas/stats?q=${encodeURIComponent(q)}`);
    setStats(await res.json());
  }

  // Lista completa (sin paginar) solo para detección de duplicados al crear —
  // independiente de la tabla paginada.
  useEffect(() => {
    fetch("/api/empresas").then(res => res.json()).then(setTodasEmpresas);
  }, []);

  useEffect(() => { cargar("", 1); cargarStats(""); }, []);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); cargar(busqueda, 1); cargarStats(busqueda); }, 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  function cambiarPagina(p: number) {
    setPage(p);
    cargar(busqueda, p);
  }

  function abrirEdicion(e: Empresa) {
    setEditando(e);
    setFormEdit({
      nombre: e.nombre,
      email: e.email ?? "",
      telefono: e.telefono ?? "",
      sector: e.sector ?? "",
      sitioWeb: e.sitioWeb ?? "",
      notas: e.notas ?? "",
    });
  }

  async function handleGuardarEdicion(ev: React.FormEvent) {
    ev.preventDefault();
    if (!editando) return;
    setGuardandoEdit(true);
    try {
      const res = await fetch(`/api/empresas/${editando.id}`, {
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
    fetch("/api/empresas").then(res => res.json()).then(setTodasEmpresas);
  }

  async function handleEliminar(e: Empresa) {
    if (!confirm(`¿Eliminar el cliente "${e.nombre}"? Se moverá a la Papelera y podrás restaurarlo desde ahí.`)) return;
    try {
      const res = await fetch(`/api/empresas/${e.id}`, { method: "DELETE" });
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
    fetch("/api/empresas").then(res => res.json()).then(setTodasEmpresas);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const nuevaEmpresa = await res.json().catch(() => null);
    if (res.ok && nuevoContactoForm.nombre.trim() && nuevaEmpresa?.id) {
      await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nuevoContactoForm, empresaId: nuevaEmpresa.id }),
      });
    }
    setForm({ nombre: "", email: "", sector: "", sitioWeb: "", telefono: "", notas: "" });
    setNuevoContactoForm({ nombre: "", email: "", telefono: "", cargo: "" });
    setMostrarForm(false);
    setGuardando(false);
    cargar(busqueda, page);
    cargarStats(busqueda);
    fetch("/api/empresas").then(res => res.json()).then(setTodasEmpresas);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-slate-500 text-sm mt-1">Empresas, organizaciones y personas naturales</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {([
          { label: "Total clientes", valor: stats.total, icon: IconBuilding, semantic: false },
          { label: "Con contactos", valor: stats.conContactos, icon: IconUsers, semantic: false },
          { label: "Sin contactos", valor: stats.sinContactos, sub: "Requieren seguimiento", icon: IconAlertTriangle, semantic: true },
          { label: "Contactos vinculados", valor: stats.contactosVinculados, icon: IconLink, semantic: false },
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-brand-500"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <IconX size={14} stroke={2} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/exportar/clientes"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5">
            ↓ Exportar Excel
          </a>
          <button
            onClick={() => setMostrarForm(true)}
            className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 inline-flex items-center gap-1.5"
          >
            <IconBuildingPlus size={16} stroke={1.75} />
            Nuevo cliente
          </button>
        </div>
      </div>

      {/* Filtros de etiqueta */}
      {(() => {
        const todasEtiquetas = Array.from(new Set(todasEmpresas.flatMap(e => e.etiquetas ?? [])));
        if (todasEtiquetas.length === 0) return null;
        return (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {todasEtiquetas.map(tag => (
              <button key={tag} onClick={() => setFiltroEtiqueta(filtroEtiqueta === tag ? "" : tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${filtroEtiqueta === tag ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {tag}
              </button>
            ))}
            {filtroEtiqueta && (
              <button onClick={() => setFiltroEtiqueta("")}
                className="rounded-full bg-red-100 text-red-600 border border-red-200 px-3 py-1 text-xs font-semibold hover:bg-red-200 transition-colors inline-flex items-center gap-1">
                <IconX size={12} stroke={2.5} />
                Limpiar filtro
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
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sector</label>
              <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                <option value="">Sin sector</option>
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sitio web</label>
              <input value={form.sitioWeb} onChange={e => setForm({ ...form, sitioWeb: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>

            <div className="col-span-2 mt-1 rounded-lg border border-brand-200 bg-brand-50 p-3">
              <p className="text-xs font-semibold text-brand-800 mb-2">Contacto de este cliente (opcional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" placeholder="Nombre del contacto" value={nuevoContactoForm.nombre}
                  onChange={e => setNuevoContactoForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white" />
                <input type="text" placeholder="Cargo" value={nuevoContactoForm.cargo}
                  onChange={e => setNuevoContactoForm(f => ({ ...f, cargo: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white" />
                <input type="email" placeholder="Email" value={nuevoContactoForm.email}
                  onChange={e => setNuevoContactoForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white" />
                <input type="text" placeholder="Teléfono" value={nuevoContactoForm.telefono}
                  onChange={e => setNuevoContactoForm(f => ({ ...f, telefono: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-brand-500 bg-white" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Si escribes un nombre, se creará automáticamente vinculado a este cliente al guardar. Puedes dejarlo en blanco.</p>
            </div>

            {duplicados.length > 0 && (
              <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold mb-1 flex items-center gap-1.5"><IconAlertTriangle size={13} stroke={1.75} />Posible duplicado detectado:</p>
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
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Guardando..." : duplicados.length > 0 ? "Guardar de todas formas" : "Guardar"}
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
                <th className="px-4 py-1 font-semibold uppercase tracking-wide text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {empresas.filter(e => !filtroEtiqueta || (e.etiquetas ?? []).includes(filtroEtiqueta)).map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-1 font-medium text-slate-900">
                    <Link href={`/dashboard/cuentas/${e.id}`} className="hover:text-brand-600 hover:underline">
                      {e.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-1 text-slate-500">{e.email ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500 whitespace-nowrap">{e.telefono ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e.sector ?? "—"}</td>
                  <td className="px-4 py-1 text-slate-500">{e._count.contactos}</td>
                  <td className="px-4 py-1 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => abrirEdicion(e)} title="Editar"
                        className="text-slate-300 hover:text-brand-600 inline-flex">
                        <IconPencil size={15} stroke={1.75} />
                      </button>
                      {puedeBorrar && (
                        <button onClick={() => handleEliminar(e)} title="Eliminar cliente"
                          className="text-slate-300 hover:text-red-600 inline-flex">
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
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(ev) => ev.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800">Editar cliente</h2>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <IconX size={18} stroke={1.75} />
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
                <input required value={formEdit.nombre}
                  onChange={ev => setFormEdit({ ...formEdit, nombre: ev.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Email</label>
                <input type="email" value={formEdit.email}
                  onChange={ev => setFormEdit({ ...formEdit, email: ev.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
                <input value={formEdit.telefono}
                  onChange={ev => setFormEdit({ ...formEdit, telefono: ev.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Sector</label>
                <select value={formEdit.sector}
                  onChange={ev => setFormEdit({ ...formEdit, sector: ev.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                  <option value="">Sin sector</option>
                  {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Sitio web</label>
                <input value={formEdit.sitioWeb}
                  onChange={ev => setFormEdit({ ...formEdit, sitioWeb: ev.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Notas</label>
                <textarea value={formEdit.notas} rows={3}
                  onChange={ev => setFormEdit({ ...formEdit, notas: ev.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setEditando(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancelar
                </button>
                <button type="submit" disabled={guardandoEdit}
                  className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                  {guardandoEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


