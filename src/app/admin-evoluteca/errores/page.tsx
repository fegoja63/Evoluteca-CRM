"use client";

import { useEffect, useState } from "react";

const CLAVE_KEY = "admin-evoluteca-secret";

type ErrorLog = {
  id: string;
  mensaje: string;
  stack: string | null;
  url: string | null;
  tipo: string;
  tenantNombre: string | null;
  usuarioEmail: string | null;
  userAgent: string | null;
  creadoEn: string;
};

const TIPO_COLOR: Record<string, string> = {
  boundary: "bg-red-100 text-red-700",
  client: "bg-amber-100 text-amber-700",
  unhandledrejection: "bg-violet-100 text-violet-700",
};

export default function ErroresInternoPage() {
  const [clave, setClave] = useState("");
  const [claveInput, setClaveInput] = useState("");
  const [claveError, setClaveError] = useState("");
  const [errores, setErrores] = useState<ErrorLog[]>([]);
  const [total24h, setTotal24h] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const guardada = sessionStorage.getItem(CLAVE_KEY);
    if (guardada) { setClave(guardada); cargar(guardada); }
  }, []);

  async function cargar(claveActual: string) {
    setCargando(true);
    setClaveError("");
    const res = await fetch("/api/admin-evoluteca/errores", { headers: { "x-admin-secret": claveActual } });
    if (res.status === 403) {
      sessionStorage.removeItem(CLAVE_KEY);
      setClave("");
      setClaveError("Clave de administrador incorrecta.");
      setCargando(false);
      return;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setClaveError(d.error ?? "No se pudo cargar.");
      setCargando(false);
      return;
    }
    const data = await res.json();
    setErrores(Array.isArray(data.errores) ? data.errores : []);
    setTotal24h(data.total24h ?? 0);
    setCargando(false);
  }

  function entrar() {
    if (!claveInput.trim()) return;
    sessionStorage.setItem(CLAVE_KEY, claveInput.trim());
    setClave(claveInput.trim());
    cargar(claveInput.trim());
  }

  async function limpiar() {
    if (!confirm("¿Borrar TODO el historial de errores? No se puede deshacer.")) return;
    const res = await fetch("/api/admin-evoluteca/errores", { method: "DELETE", headers: { "x-admin-secret": clave } });
    if (res.ok) cargar(clave);
  }

  const fmtFecha = (s: string) => new Date(s).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  if (!clave) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Errores — Panel interno</h1>
          <p className="text-xs text-slate-500 mb-4">Ingresa la clave de administrador de Evoluteca.</p>
          <input type="password" value={claveInput} onChange={e => setClaveInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") entrar(); }}
            placeholder="Clave" autoFocus
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 mb-3" />
          {claveError && <p className="text-xs text-red-600 mb-3">{claveError}</p>}
          <button onClick={entrar} className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Entrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Errores en producción</h1>
            <p className="text-sm text-slate-500 mt-1">
              {total24h > 0
                ? <><span className="font-semibold text-red-600">{total24h}</span> en las últimas 24 horas · {errores.length} más recientes</>
                : <>Sin errores en las últimas 24 horas · {errores.length} en el histórico</>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => cargar(clave)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Actualizar</button>
            {errores.length > 0 && <button onClick={limpiar} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 hover:bg-red-100">Limpiar historial</button>}
          </div>
        </div>

        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : errores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-sm text-slate-500">No hay errores registrados. 🎉</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {errores.map(e => (
              <div key={e.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button onClick={() => setExpandido(expandido === e.id ? null : e.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIPO_COLOR[e.tipo] ?? "bg-slate-100 text-slate-600"}`}>{e.tipo}</span>
                        <span className="text-xs text-slate-400">{fmtFecha(e.creadoEn)}</span>
                      </div>
                      <p className="text-sm text-slate-800 font-medium truncate">{e.mensaje}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {e.tenantNombre ? `${e.tenantNombre}` : "sin tenant"}{e.usuarioEmail ? ` · ${e.usuarioEmail}` : ""}{e.url ? ` · ${e.url}` : ""}
                      </p>
                    </div>
                    <span className="text-slate-300 text-xs shrink-0">{expandido === e.id ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandido === e.id && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                    {e.stack && <pre className="text-[11px] text-slate-600 whitespace-pre-wrap break-words overflow-x-auto max-h-72 overflow-y-auto">{e.stack}</pre>}
                    {e.userAgent && <p className="text-[11px] text-slate-400 mt-2 break-words">{e.userAgent}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
