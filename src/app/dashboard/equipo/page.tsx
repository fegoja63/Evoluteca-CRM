"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { useSession } from "next-auth/react";
import { RendimientoEquipo } from "@/components/rendimiento-equipo";
import { IconDownload, IconUserPlus, IconEdit, IconCircleCheck } from "@tabler/icons-react";

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  creadoEn: string;
};

const ROLES = [
  { key: "ADMINISTRADOR", label: "Administrador" },
  { key: "GERENTE", label: "Gerente" },
  { key: "COMERCIAL", label: "Comercial" },
];

export default function EquipoPage() {
  const { data: session, update } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", rol: "COMERCIAL" });
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetNombre, setResetNombre] = useState("");
  const [resetPass, setResetPass] = useState("");
  const [reseteando, setReseteando] = useState(false);
  const [resetOk, setResetOk] = useState(false);

  const [editNombreId, setEditNombreId] = useState<string | null>(null);
  const [editNombreValor, setEditNombreValor] = useState("");
  const [guardandoNombre, setGuardandoNombre] = useState(false);

  const [reasignando, setReasignando] = useState(false);
  const [reasignarId, setReasignarId] = useState("");
  const [reasignarResultado, setReasignarResultado] = useState<{ empresas: number; oportunidades: number; actividades: number; expedientes: number; terminos: number } | null>(null);
  const [limiteUsuarios, setLimiteUsuarios] = useState<number | null>(null);

  async function exportarExcel() {
    setExportando(true);
    const res = await fetch("/api/exportar/equipo");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `equipo-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }

  const esAdmin  = session?.user?.rol === "ADMINISTRADOR";
  const esGerente = session?.user?.rol === "GERENTE";
  const puedeVerRendimiento = esAdmin || esGerente;

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/usuarios");
    const data = await res.json().catch(() => null);
    // Si la API devuelve un error (no un arreglo), no revienta el render:
    // se deja la lista vacía en vez de romper toda la página con .map.
    setUsuarios(Array.isArray(data) ? data : []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    fetch("/api/configuracion").then(r => r.json()).then(d => setLimiteUsuarios(d.limiteUsuarios ?? null));
  }, []);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo invitar al usuario");
      setGuardando(false);
      return;
    }
    setForm({ nombre: "", email: "", password: "", rol: "COMERCIAL" });
    setMostrarForm(false);
    setGuardando(false);
    cargar();
  }

  async function guardarNombre(id: string) {
    if (!editNombreValor.trim()) return;
    setGuardandoNombre(true);
    const nombreNuevo = editNombreValor.trim();
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombreNuevo }),
    });
    setGuardandoNombre(false);
    if (!res.ok) {
      toast.error("No se pudo guardar el nombre. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setUsuarios(prev => prev.map(u => (u.id === id ? { ...u, nombre: nombreNuevo } : u)));
    // Si edité mi propio nombre, refresco la sesión para que el sidebar y el
    // avatar muestren el nombre nuevo sin tener que volver a entrar.
    if (id === session?.user?.id) await update({ name: nombreNuevo });
    setEditNombreId(null);
  }

  async function cambiarRol(id: string, rol: string) {
    const anterior = usuarios.find(u => u.id === id)?.rol;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol }),
    });
    if (!res.ok) {
      setUsuarios((prev) => prev.map((u) => (u.id === id && anterior ? { ...u, rol: anterior } : u)));
      toast.error("No se pudo cambiar el rol. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function resetearPassword(id: string) {
    if (!resetPass || resetPass.length < 6) return;
    setReseteando(true);
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nuevaPassword: resetPass }),
    });
    setReseteando(false);
    if (!res.ok) {
      toast.error("No se pudo restablecer la contraseña. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setResetOk(true);
    setTimeout(() => { setResetId(null); setResetPass(""); setResetOk(false); }, 2000);
  }

  async function reasignarRegistros() {
    if (!reasignarId) return;
    setReasignando(true);
    setReasignarResultado(null);
    const res = await fetch("/api/usuarios/reasignar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: reasignarId, soloSinDueno: true }),
    });
    const data = await res.json();
    setReasignando(false);
    setReasignarResultado(data);
  }

  async function toggleActivo(id: string, activo: boolean) {
    const anterior = usuarios.find(u => u.id === id)?.activo;
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo } : u)));
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
    if (!res.ok) {
      // Revertir el cambio optimista si el backend lo rechazó (ej. límite de
      // usuarios del plan) y mostrar el motivo.
      const data = await res.json().catch(() => ({}));
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo: anterior ?? u.activo } : u)));
      toast.error(data.error ?? "No se pudo actualizar el estado del usuario.");
    }
  }

  const usuariosActivos = usuarios.filter(u => u.activo).length;
  const enLimite = limiteUsuarios !== null && usuariosActivos >= limiteUsuarios;

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Equipo</h1>
          <p className="text-sm text-neutral-500">
            Usuarios con acceso a este CRM
            {limiteUsuarios !== null && (
              <span className={enLimite ? "text-amber-600 font-medium" : ""}> · {usuariosActivos} de {limiteUsuarios} usuarios de tu plan</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarExcel} disabled={exportando}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <IconDownload size={15} stroke={1.75} /> {exportando ? "Exportando..." : "Excel"}
          </button>
          {esAdmin && (
            <button
              onClick={() => setMostrarForm(true)}
              disabled={enLimite}
              title={enLimite ? `Tu plan permite hasta ${limiteUsuarios} usuarios activos. Contacta a tu asesor Evoluteca para ampliar el límite.` : undefined}
              className="flex items-center gap-1.5 rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconUserPlus size={15} stroke={1.75} /> Invitar usuario
            </button>
          )}
        </div>
      </div>

      {esAdmin && enLimite && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Ya usas los <strong>{limiteUsuarios}</strong> usuarios activos incluidos en tu plan. Desactiva a alguien que ya no use el CRM para liberar un cupo, o contacta a tu asesor Evoluteca para ampliar el límite.
        </div>
      )}

      {!esAdmin && (
        <div className="mb-6 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-center">
          <p className="text-sm text-neutral-500">
            Solo un administrador puede invitar o gestionar usuarios.
          </p>
        </div>
      )}

      {mostrarForm && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">Invitar usuario</h2>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Correo *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Contraseña temporal *</label>
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
              <p className="mt-1 text-xs text-neutral-400">Mínimo 8 caracteres. Compártesela por un canal seguro.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              >
                {guardando ? "Invitando..." : "Invitar"}
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
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-1 font-medium">Nombre</th>
                <th className="px-4 py-1 font-medium">Correo</th>
                <th className="px-4 py-1 font-medium">Rol</th>
                <th className="px-4 py-1 font-medium">Estado</th>
                {esAdmin && <th className="px-4 py-1 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {usuarios.map((u) => {
                const esUnoMismo = u.id === session?.user?.id;
                return (
                  <tr key={u.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-1 font-medium text-neutral-900">
                      {esAdmin && editNombreId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={editNombreValor}
                            onChange={e => setEditNombreValor(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") guardarNombre(u.id); if (e.key === "Escape") setEditNombreId(null); }}
                            className="rounded border border-brand-300 px-2 py-0.5 text-sm outline-none focus:border-brand-500"
                          />
                          <button onClick={() => guardarNombre(u.id)} disabled={guardandoNombre || !editNombreValor.trim()}
                            className="text-xs text-brand-600 hover:underline disabled:opacity-50">
                            {guardandoNombre ? "..." : "Guardar"}
                          </button>
                          <button onClick={() => setEditNombreId(null)} className="text-xs text-neutral-400 hover:underline">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <span className="group inline-flex items-center gap-1.5">
                          {u.nombre} {esUnoMismo && <span className="text-xs text-neutral-400">(tú)</span>}
                          {esAdmin && (
                            <button onClick={() => { setEditNombreId(u.id); setEditNombreValor(u.nombre); }}
                              className="text-neutral-400 hover:text-brand-500 text-xs transition-colors"
                              title="Editar nombre">
                              <IconEdit size={13} stroke={1.75} />
                            </button>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-1 text-neutral-500">{u.email}</td>
                    <td className="px-4 py-1">
                      {esAdmin && !esUnoMismo ? (
                        <select
                          value={u.rol}
                          onChange={(e) => cambiarRol(u.id, e.target.value)}
                          className="rounded border border-neutral-200 px-2 py-1 text-xs outline-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r.key} value={r.key}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-neutral-500">
                          {ROLES.find((r) => r.key === u.rol)?.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-1">
                      {esAdmin && !esUnoMismo ? (
                        <button
                          onClick={() => toggleActivo(u.id, !u.activo)}
                          className={`rounded px-2 py-1 text-xs font-medium ${
                            u.activo ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {u.activo ? "Activo" : "Inactivo"}
                        </button>
                      ) : (
                        <span className={u.activo ? "text-green-700" : "text-neutral-400"}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      )}
                    </td>
                    {esAdmin && (
                      <td className="px-4 py-1">
                        {!esUnoMismo && (
                          <button
                            onClick={() => { setResetId(u.id); setResetNombre(u.nombre); setResetPass(""); setResetOk(false); }}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Resetear contraseña
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Rendimiento del equipo — siempre visible, sin necesidad de otra pestaña */}
      {puedeVerRendimiento && (
        <div className="mt-6">
          <RendimientoEquipo esAdmin={esAdmin} />
        </div>
      )}

      {/* Panel reasignar registros importados */}
      {esAdmin && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900 mb-1">Asignar registros sin dueño</h2>
          <p className="text-xs text-amber-700 mb-4">
            Los registros importados desde Excel no tienen vendedor asignado. Selecciona un vendedor y haz clic en Asignar para que pueda verlos con su perfil COMERCIAL.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={reasignarId}
              onChange={e => { setReasignarId(e.target.value); setReasignarResultado(null); }}
              className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
            >
              <option value="">Seleccionar vendedor...</option>
              {usuarios.filter(u => u.activo).map(u => (
                <option key={u.id} value={u.id}>{u.nombre} — {ROLES.find(r => r.key === u.rol)?.label}</option>
              ))}
            </select>
            <button
              onClick={reasignarRegistros}
              disabled={!reasignarId || reasignando}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {reasignando ? "Asignando..." : "Asignar registros sin dueño"}
            </button>
          </div>
          {reasignarResultado && (
            <div className="mt-3 rounded-xl bg-white border border-amber-200 px-4 py-3 text-sm text-amber-900 flex items-start gap-1.5">
              <IconCircleCheck size={16} stroke={1.75} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>Asignados: <strong>{reasignarResultado.empresas}</strong> clientes · <strong>{reasignarResultado.oportunidades}</strong> oportunidades · <strong>{reasignarResultado.actividades}</strong> actividades
              {(reasignarResultado.expedientes > 0 || reasignarResultado.terminos > 0) && (
                <> · <strong>{reasignarResultado.expedientes}</strong> expedientes · <strong>{reasignarResultado.terminos}</strong> términos</>
              )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal resetear contraseña */}
      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {resetOk ? (
              <div className="text-center py-4">
                <IconCircleCheck size={30} stroke={1.75} className="text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">Contraseña actualizada</p>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-slate-800 mb-1">Resetear contraseña</h2>
                <p className="text-sm text-slate-500 mb-4">Nueva contraseña para <strong>{resetNombre}</strong></p>
                <input
                  type="text"
                  value={resetPass}
                  onChange={e => setResetPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 mb-4"
                />
                <p className="text-xs text-slate-400 mb-4">Comparte esta contraseña con el usuario por un canal seguro (WhatsApp, llamada). El usuario puede cambiarla después.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetearPassword(resetId)}
                    disabled={reseteando || resetPass.length < 6}
                    className="flex-1 rounded-xl bg-accent-600 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
                  >
                    {reseteando ? "Guardando..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => { setResetId(null); setResetPass(""); }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


