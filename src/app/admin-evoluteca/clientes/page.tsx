"use client";

import { Fragment, useEffect, useState } from "react";
import { CampoPassword } from "@/components/campo-password";
import { boton, campo, insignia, type TonoInsignia } from "@/components/ui/estilos";
import type { NivelUso, SaludUso } from "@/lib/salud-uso";
import { SkeletonTabla } from "@/components/ui/estados";
import { IconCheck } from "@tabler/icons-react";
import { aInputDia, formatoDia, formatoFecha } from "@/lib/fecha-bogota";
import { LicenciasModulo, ESTADO_LICENCIA, type ResumenFinanzas } from "@/components/admin/licencias-modulo";

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
  soloFinanzas: boolean;
  limiteUsuarios: number | null;
  licenciaVenceEn: string | null;
  licenciaAvisoEn: string | null;
  licenciaAvisadaEn: string | null;
  licenciaFinanzas: ResumenFinanzas;
  _count: { usuarios: number; empresas: number; cotizaciones: number };
  salud: SaludUso;
};

const NIVEL: Record<NivelUso, { label: string; tono: TonoInsignia; ayuda: string }> = {
  ACTIVO: { label: "En uso", tono: "exito", ayuda: "Usó el CRM en los últimos 7 días" },
  ENFRIANDOSE: { label: "Enfriándose", tono: "alerta", ayuda: "Último uso hace 8 a 30 días" },
  INACTIVO: { label: "Sin uso", tono: "peligro", ayuda: "Sin uso en más de 30 días (o nunca)" },
};

function haceCuanto(iso: string | null): string {
  if (!iso) return "nunca";
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  return `hace ${dias} días`;
}

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

  async function actualizar(id: string, cambios: Partial<{ activo: boolean; plan: string; emailsActivos: boolean; soloFinanzas: boolean; limiteUsuarios: number | null; modulos: Modulos; licenciaVenceEn: string | null; licenciaAvisoEn: string | null }>) {
    setGuardando(true);
    const res = await fetch(`/api/admin-evoluteca/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": clave },
      body: JSON.stringify(cambios),
    });
    if (res.ok) {
      const actualizado = await res.json();
      // El PATCH no trae la salud de uso: se conserva la que ya estaba.
      setTenants(prev => prev.map(t => (t.id === id ? { ...t, ...actualizado } : t)));
    }
    setGuardando(false);
  }

  // Cuenta solo Finanzas: el cliente deja de ver el CRM (los datos se conservan).
  function toggleSoloFinanzas(t: Tenant) {
    const mensaje = t.soloFinanzas
      ? `¿Devolver "${t.nombre}" al CRM completo? Sus usuarios volverán a ver Clientes, Pipeline y demás, y recibirán los correos del CRM.`
      : `¿Convertir "${t.nombre}" en cuenta solo Finanzas? Sus usuarios verán solo el Gerente Financiero y lo administrativo, y dejarán de recibir los correos del CRM. Los datos del CRM se conservan.`;
    if (confirm(mensaje)) actualizar(t.id, { soloFinanzas: !t.soloFinanzas });
  }

  function toggleModulo(t: Tenant, key: string) {
    const actual = !!(t.modulos as Record<string, boolean>)[key];
    actualizar(t.id, { modulos: { [key]: !actual } });
  }

  function toggleActivo(t: Tenant) {
    const accion = t.activo ? "suspender" : "reactivar";
    const detalle = t.activo
      ? " Sus usuarios no podrán iniciar sesión y se apagarán sus correos automáticos. Los datos se conservan."
      : " Sus usuarios podrán volver a entrar y se reactivarán sus correos automáticos.";
    if (!confirm(`¿Seguro que quieres ${accion} el acceso de "${t.nombre}"?${detalle}`)) return;
    actualizar(t.id, { activo: !t.activo });
  }

  const porNivel = (n: NivelUso) => tenants.filter(t => t.activo && t.salud.nivel === n).length;

  const filtrados = tenants.filter(t => t.nombre.toLowerCase().includes(busqueda.toLowerCase()) || t.slug.toLowerCase().includes(busqueda.toLowerCase()));

  if (!clave) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-500 text-white text-xl font-bold mb-4">E</div>
            <h1 className="text-2xl font-bold text-white">Clientes</h1>
            <p className="text-slate-400 text-sm mt-1">Página interna — solo Evoluteca</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
            <form onSubmit={desbloquear} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Clave de administrador</label>
                <CampoPassword
                  value={claveInput}
                  onChange={e => setClaveInput(e.target.value)}
                  colorOjo="text-slate-400 hover:text-slate-200"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  required
                  autoFocus
                />
              </div>
              {claveError && <p className="text-sm text-red-400">{claveError}</p>}
              <button type="submit" disabled={cargando} className="w-full rounded-xl bg-brand-500 hover:bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
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
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Clientes de Evoluteca</h1>
            <p className="text-slate-500 text-sm mt-1">{tenants.length} tenants — página interna, no indexada</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin-evoluteca/errores" className={boton("secundario", "md")}>
              Errores
            </a>
            <a href="/admin-evoluteca/nuevo-cliente" className={boton("marca", "md")}>
              + Nuevo cliente
            </a>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar por nombre o slug..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className={campo("md", "w-full max-w-sm mb-4")}
        />

        {!cargando && tenants.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wide">Salud de uso (cuentas activas):</span>
            {(Object.keys(NIVEL) as NivelUso[]).map(n => (
              <span key={n} className={insignia(NIVEL[n].tono)} title={NIVEL[n].ayuda}>
                {porNivel(n)} {NIVEL[n].label.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        {cargando ? (
          <SkeletonTabla columnas={8} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Empresa</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide">Uso</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide" title="Negocios abiertos con una actividad pendiente desde hoy">Próximo paso</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wide" title="Últimos 30 días">Movimiento 30 d</th>
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
                        <p className="font-medium text-slate-900 whitespace-nowrap">{t.nombre}</p>
                        <p className="text-xs text-slate-400 whitespace-nowrap">{t.slug} · <span className="capitalize">{t.plan}</span></p>
                        {t.soloFinanzas && <span className={insignia("marca", "mt-1 mr-1")}>Solo Finanzas</span>}
                        {t.licenciaFinanzas.estado !== "SIN_LICENCIA" && (
                          <span className={insignia(ESTADO_LICENCIA[t.licenciaFinanzas.estado].tono, "mt-1")}>
                            Finanzas{t.licenciaFinanzas.estado === "VENCIDA" ? " vencida" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.activo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {t.activo ? "Activo" : "Suspendido"}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={insignia(NIVEL[t.salud.nivel].tono)} title={NIVEL[t.salud.nivel].ayuda}>
                          {NIVEL[t.salud.nivel].label}
                        </span>
                        <p className="mt-0.5 text-xs text-slate-400">{haceCuanto(t.salud.ultimoUso)}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                        {t.salud.abiertas === 0 ? (
                          <span className="text-slate-400">sin abiertas</span>
                        ) : (
                          <>
                            {Math.round((100 * t.salud.abiertasConProximoPaso) / t.salud.abiertas)}%
                            <span className="text-xs text-slate-400"> · {t.salud.abiertasConProximoPaso}/{t.salud.abiertas}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">
                        <p>{t.salud.actividades30d} actividades <span className="text-slate-400">({t.salud.actividades7d} en 7 d)</span></p>
                        <p className="text-slate-400">{t.salud.negociosNuevos30d} negocios nuevos · {t.salud.usuariosActivos30d} usuarios activos</p>
                      </td>
                      <td className="px-4 py-2 text-slate-600">
                        {t._count.usuarios} <span className="text-slate-400">/ {t.limiteUsuarios ?? "∞"}</span>
                      </td>
                      <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                        {formatoFecha(new Date(t.creadoEn), { day: "2-digit", month: "short", year: "numeric" })}
                        {t.licenciaVenceEn && (
                          <p className="text-xs text-slate-400">vence {formatoDia(t.licenciaVenceEn, { day: "2-digit", month: "short", year: "numeric" })}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => setEditandoId(editandoId === t.id ? null : t.id)}
                          className={boton("secundario", "sm")}
                        >
                          {editandoId === t.id ? "Cerrar" : "Gestionar"}
                        </button>
                      </td>
                    </tr>
                    {editandoId === t.id && (
                      <tr key={`${t.id}-editor`} className="bg-slate-50">
                        <td colSpan={8} className="px-4 py-4">
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
                                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 ${t.limiteUsuarios === l.valor ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"}`}
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
                                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand-400"
                                  title="Escribe un número y sal del campo para guardar (ej: usuarios adicionales pagados sobre el plan de 5)"
                                />
                              </div>
                              <p className="mt-1 text-2xs text-slate-400">{t._count.usuarios} usuario{t._count.usuarios !== 1 ? "s" : ""} hoy</p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Licencia</p>
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="text-xs text-slate-500">
                                Vence el
                                <input
                                  type="date"
                                  disabled={guardando}
                                  value={aInputDia(t.licenciaVenceEn)}
                                  onChange={e => actualizar(t.id, { licenciaVenceEn: e.target.value || null })}
                                  className={campo("sm", "mt-1 block")}
                                />
                              </label>
                              <label className="text-xs text-slate-500">
                                Avisarme el
                                <input
                                  type="date"
                                  disabled={guardando}
                                  value={aInputDia(t.licenciaAvisoEn)}
                                  onChange={e => actualizar(t.id, { licenciaAvisoEn: e.target.value || null })}
                                  className={campo("sm", "mt-1 block")}
                                />
                              </label>
                              <p className="pb-2 text-2xs text-slate-400">
                                {!t.licenciaAvisoEn
                                  ? "Sin aviso programado."
                                  : t.licenciaAvisadaEn
                                    ? `Aviso enviado el ${formatoFecha(t.licenciaAvisadaEn)}.`
                                    : "Ese día llega un correo a Evoluteca para decidir si se renueva. Vencer no suspende el acceso."}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Tipo de cuenta</p>
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                disabled={guardando}
                                onClick={() => toggleSoloFinanzas(t)}
                                className={boton(t.soloFinanzas ? "marca" : "secundario", "sm")}
                              >
                                {t.soloFinanzas ? "Solo Finanzas" : "CRM completo"}
                              </button>
                              <p className="text-2xs text-slate-400">
                                {t.soloFinanzas
                                  ? "Compró solo el Gerente Financiero: no ve el CRM ni recibe sus correos. Clic para devolverla al CRM completo."
                                  : "Clic para convertirla en cuenta solo Finanzas (Gerente Financiero sin el CRM)."}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                            <LicenciasModulo
                              tenantId={t.id}
                              tenantNombre={t.nombre}
                              clave={clave}
                              onCambio={resumen => setTenants(prev => prev.map(x => (x.id === t.id ? { ...x, licenciaFinanzas: resumen } : x)))}
                            />
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
                                    className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${activo ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}
                                  >
                                    <span className="inline-flex items-center gap-1">{m.label}{activo && <IconCheck size={13} stroke={2.25} />}</span>
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
