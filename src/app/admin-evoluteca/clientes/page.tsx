"use client";

import { Fragment, useEffect, useState } from "react";

const CLAVE_KEY = "admin-evoluteca-secret";

type Modulos = { funciones?: boolean; audiencia?: boolean; expedientes?: boolean; salones?: boolean; ahorros?: boolean };

type Tenant = {
  id: string;
  nombre: string;
  slug: string;
  plan: string;
  activo: boolean;
  creadoEn: string;
  modulos: Modulos;
  emailsActivos: boolean;
  limiteUsuarios: number | null;
  _count: { usuarios: number; empresas: number; cotizaciones: number };
};

// Los 3 escalones de precio más comunes, para elegir en un clic — "Personalizado"
// deja escribir cualquier número (ej. plan de 5 + adicionales pagados).
const LIMITES_RAPIDOS = [
  { label: "1 (solo Admin)", valor: 1 },
  { label: "Hasta 5", valor: 5 },
  { label: "Ilimitados", valor: null },
] as const;

const MODULOS_DISPONIBLES = [
  { key: "funciones", label: "Funciones" },
  { key: "audiencia", label: "Audiencia" },
  { key: "expedientes", label: "Expedientes" },
  { key: "salones", label: "Salones" },
  { key: "ahorros", label: "Facturación por resultados" },
] as const;

const PLANES = ["arranque", "empresa", "corporativo"] as const;

export default function ClientesInternoPage() {
  const [clave, setClave] = useState("");
  const [claveInput, setClaveInput] = useState("");
  const [claveError, setClaveError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const guardada = sessionStorage.getItem(CLAVE_KEY);
    if (guardada) {
      setClave(guardada);
      cargar(guardada);
    }
  }, []);

  async function cargar(claveActual: string) {
    setCargando(true);
    setClaveError("");
    const res = await fetch("/api/admin-evoluteca/tenants", { headers: { "x-admin-secret": claveActual } });
    if (res.status === 403) {
      sessionStorage.removeItem(CLAVE_KEY);
      setClave("");
      setClaveError("Clave de administrador incorrecta.");
      setCargando(false);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setClaveError(data.error ?? "No se pudo cargar la lista.");
      setCargando(false);
      return;
    }
    setTenants(await res.json());
    setCargando(false);
  }

  function desbloquear(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem(CLAVE_KEY, claveInput);
    setClave(claveInput);
    cargar(claveInput);
  }

  async function actualizar(id: string, cambios: Partial<{ activo: boolean; plan: string; emailsActivos: boolean; limiteUsuarios: number | null; modulos: Modulos }>) {
    setGuardando(true);
    const res = await fetch(`/api/admin-evoluteca/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": clave },
      body: JSON.stringify(cambios),
    });
    if (res.ok) {
      const actualizado = await res.json();
      setTenants(prev => prev.map(t => (t.id === id ? actualizado : t)));
    }
    setGuardando(false);
  }

  function toggleModulo(t: Tenant, key: string) {
    const actual = !!(t.modulos as Record<string, boolean>)[key];
    actualizar(t.id, { modulos: { [key]: !actual } });
  }

  function toggleActivo(t: Tenant) {
    const accion = t.activo ? "suspender" : "reactivar";
    if (!confirm(`¿Seguro que quieres ${accion} el acceso de "${t.nombre}"?${t.activo ? " Sus usuarios no podrán iniciar sesión." : ""}`)) return;
    actualizar(t.id, { activo: !t.activo });
  }

  const filtrados = tenants.filter(t => t.nombre.toLowerCase().includes(busqueda.toLowerCase()) || t.slug.toLowerCase().includes(busqueda.toLowerCase()));

  if (!clave) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500 text-white text-xl font-bold mb-4">E</div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-slate-400 text-sm mt-1">Página interna — solo Evoluteca</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <form onSubmit={desbloquear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Clave de administrador</label>
                <input
                  type="password"
                  value={claveInput}
                  onChange={e => setClaveInput(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  required
                  autoFocus
                />
              </div>
              {claveError && <p className="text-sm text-red-400">{claveError}</p>}
              <button type="submit" disabled={cargando} className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {cargando ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Clientes de Evoluteca</h1>
            <p className="text-slate-500 text-sm mt-1">{tenants.length} tenants — página interna, no indexada</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin-evoluteca/errores" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Errores
            </a>
            <a href="/admin-evoluteca/nuevo-cliente" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              + Nuevo cliente
            </a>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o slug..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full max-w-sm mb-4 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Empresa</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Plan</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Usuarios</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Creado</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map(t => (
                  <Fragment key={t.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-900">{t.nombre}</p>
                        <p className="text-xs text-slate-400">{t.slug}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-600 capitalize">{t.plan}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {t.activo ? "Activo" : "Suspendido"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {t._count.usuarios} <span className="text-slate-400">/ {t.limiteUsuarios ?? "∞"}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                        {new Date(t.creadoEn).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setEditandoId(editandoId === t.id ? null : t.id)}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100"
                        >
                          {editandoId === t.id ? "Cerrar" : "Gestionar"}
                        </button>
                      </td>
                    </tr>
                    {editandoId === t.id && (
                      <tr key={`${t.id}-editor`} className="bg-slate-50">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Estado de la cuenta</p>
                              <button
                                disabled={guardando}
                                onClick={() => toggleActivo(t)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${t.activo ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"}`}
                              >
                                {t.activo ? "Suspender acceso" : "Reactivar acceso"}
                              </button>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Plan</p>
                              <select
                                value={t.plan}
                                disabled={guardando}
                                onChange={e => actualizar(t.id, { plan: e.target.value })}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                              >
                                {PLANES.map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Emails automáticos</p>
                              <button
                                disabled={guardando}
                                onClick={() => actualizar(t.id, { emailsActivos: !t.emailsActivos })}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${t.emailsActivos ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                              >
                                {t.emailsActivos ? "Activados" : "Desactivados"}
                              </button>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Límite de usuarios</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {LIMITES_RAPIDOS.map(l => (
                                  <button
                                    key={l.label}
                                    disabled={guardando}
                                    onClick={() => actualizar(t.id, { limiteUsuarios: l.valor })}
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${t.limiteUsuarios === l.valor ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"}`}
                                  >
                                    {l.label}
                                  </button>
                                ))}
                                <input
                                  type="number"
                                  min={1}
                                  max={9999}
                                  placeholder="Otro"
                                  disabled={guardando}
                                  defaultValue={t.limiteUsuarios ?? ""}
                                  onBlur={e => {
                                    const v = e.target.value.trim();
                                    if (!v) return;
                                    const n = Number(v);
                                    if (n >= 1 && n !== t.limiteUsuarios) actualizar(t.id, { limiteUsuarios: n });
                                  }}
                                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                                  title="Escribe un número y sal del campo para guardar (ej: usuarios adicionales pagados sobre el plan de 5)"
                                />
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400">{t._count.usuarios} usuario{t._count.usuarios !== 1 ? "s" : ""} hoy</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Módulos opcionales</p>
                            <div className="flex flex-wrap gap-2">
                              {MODULOS_DISPONIBLES.map(m => {
                                const activo = !!(t.modulos as Record<string, boolean>)[m.key];
                                return (
                                  <button
                                    key={m.key}
                                    disabled={guardando}
                                    onClick={() => toggleModulo(t, m.key)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${activo ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                                  >
                                    {m.label} {activo ? "✓" : ""}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <p className="mt-3 text-xs text-slate-400">
                            {t._count.empresas} empresas · {t._count.cotizaciones} cotizaciones registradas
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <p className="p-8 text-center text-sm text-slate-400">No se encontraron clientes.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
