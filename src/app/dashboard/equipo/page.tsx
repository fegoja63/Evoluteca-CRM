"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

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
  const { data: session } = useSession();
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

  const [reasignando, setReasignando] = useState(false);
  const [reasignarId, setReasignarId] = useState("");
  const [reasignarResultado, setReasignarResultado] = useState<{ empresas: number; oportunidades: number; actividades: number; expedientes: number; terminos: number } | null>(null);

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
    const data = await res.json();
    setUsuarios(data);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

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

  async function cambiarRol(id: string, rol: string) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rol }),
    });
  }

  async function resetearPassword(id: string) {
    if (!resetPass || resetPass.length < 6) return;
    setReseteando(true);
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nuevaPassword: resetPass }),
    });
    setReseteando(false);
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
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, activo } : u)));
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium text-neutral-900">Equipo</h1>
          <p className="text-sm text-neutral-500">Usuarios con acceso a este CRM</p>
        </div>
        <div className="flex gap-2">
          {puedeVerRendimiento && (
            <Link href="/dashboard/equipo/rendimiento"
              className="rounded-md border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
              📊 Rendimiento
            </Link>
          )}
          <button onClick={exportarExcel} disabled={exportando}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {exportando ? "Exportando..." : "⬇ Excel"}
          </button>
          {esAdmin && (
            <button
              onClick={() => setMostrarForm(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Invitar usuario
            </button>
          )}
        </div>
      </div>

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
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Correo *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-neutral-400">Mínimo 8 caracteres. Compártesela por un canal seguro.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Rol</label>
              <select
                value={form.rol}
                onChange={(e) => setForm({ ...form, rol: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
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
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
                      {u.nombre} {esUnoMismo && <span className="text-xs text-neutral-400">(tú)</span>}
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
                            className="text-xs text-blue-600 hover:underline"
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
            <div className="mt-3 rounded-xl bg-white border border-amber-200 px-4 py-3 text-sm text-amber-900">
              ✅ Asignados: <strong>{reasignarResultado.empresas}</strong> clientes · <strong>{reasignarResultado.oportunidades}</strong> oportunidades · <strong>{reasignarResultado.actividades}</strong> actividades
              {(reasignarResultado.expedientes > 0 || reasignarResultado.terminos > 0) && (
                <> · <strong>{reasignarResultado.expedientes}</strong> expedientes · <strong>{reasignarResultado.terminos}</strong> términos</>
              )}
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
                <div className="text-3xl mb-2">✅</div>
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 mb-4"
                />
                <p className="text-xs text-slate-400 mb-4">Comparte esta contraseña con el usuario por un canal seguro (WhatsApp, llamada). El usuario puede cambiarla después.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resetearPassword(resetId)}
                    disabled={reseteando || resetPass.length < 6}
                    className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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


