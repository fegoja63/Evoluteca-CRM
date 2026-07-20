"use client";

import { useEffect, useState } from "react";
import { IconShieldCheck, IconShieldOff, IconCopy, IconCheck, IconAlertTriangle } from "@tabler/icons-react";

type Estado = { activa: boolean; activadaEn: string | null; codigosRespaldoRestantes: number };

/**
 * Verificación en dos pasos, en "Mi perfil".
 *
 * El flujo tiene tres estados y el orden importa: mientras no se confirme con
 * un código de la app, la cuenta sigue entrando solo con contraseña. Eso evita
 * que alguien se quede fuera si abandona la configuración a medias.
 */
export default function DosFactores() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(true);

  // Datos de la activación en curso (existen solo mientras se configura).
  const [qr, setQr] = useState<string | null>(null);
  const [secreto, setSecreto] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [codigosRespaldo, setCodigosRespaldo] = useState<string[] | null>(null);

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  async function cargarEstado() {
    const res = await fetch("/api/perfil/dos-factores");
    if (res.ok) setEstado(await res.json());
    setCargando(false);
  }

  useEffect(() => {
    cargarEstado();
  }, []);

  async function empezar() {
    setOcupado(true);
    setError("");
    const res = await fetch("/api/perfil/dos-factores", { method: "POST" });
    const data = await res.json();
    setOcupado(false);

    if (!res.ok) return setError(data.error ?? "No se pudo iniciar");
    setQr(data.qr);
    setSecreto(data.secreto);
  }

  async function confirmar() {
    setOcupado(true);
    setError("");
    const res = await fetch("/api/perfil/dos-factores", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo }),
    });
    const data = await res.json();
    setOcupado(false);

    if (!res.ok) return setError(data.error ?? "Código incorrecto");

    // Los códigos de respaldo se muestran UNA vez: se dejan en pantalla hasta
    // que el usuario confirme que los guardó.
    setCodigosRespaldo(data.codigosRespaldo);
    setQr(null);
    setSecreto(null);
    setCodigo("");
    await cargarEstado();
  }

  async function desactivar() {
    const suCodigo = prompt(
      "Para desactivar la verificación en dos pasos, escribe el código de 6 dígitos que te muestra tu aplicación:"
    );
    if (!suCodigo) return;

    setOcupado(true);
    setError("");
    const res = await fetch("/api/perfil/dos-factores", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo: suCodigo }),
    });
    const data = await res.json();
    setOcupado(false);

    if (!res.ok) return setError(data.error ?? "No se pudo desactivar");
    await cargarEstado();
  }

  async function copiarRespaldos() {
    if (!codigosRespaldo) return;
    await navigator.clipboard.writeText(codigosRespaldo.join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-sm text-slate-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-sm font-semibold text-slate-800">Verificación en dos pasos</h2>
        {estado?.activa ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
            <IconShieldCheck size={13} /> Activa
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
            <IconShieldOff size={13} /> Inactiva
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Añade un código de tu teléfono al iniciar sesión. Aunque alguien conozca tu contraseña, no podrá entrar.
      </p>

      {error && (
        <div className="mb-4 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* Códigos de respaldo recién generados: se muestran una sola vez */}
      {codigosRespaldo && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <IconAlertTriangle size={16} /> Guarda estos códigos ahora
          </p>
          <p className="text-xs text-amber-800 mt-1 mb-3">
            Son la única forma de entrar si pierdes el teléfono. Cada uno sirve una sola vez y no se volverán a mostrar.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm text-amber-900">
            {codigosRespaldo.map((c) => (
              <div key={c} className="bg-white rounded-lg px-2 py-1 text-center border border-amber-200">
                {c}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={copiarRespaldos}
              className="inline-flex items-center gap-1.5 text-xs font-medium bg-white border border-amber-300 text-amber-900 rounded-lg px-3 py-1.5"
            >
              {copiado ? <IconCheck size={14} /> : <IconCopy size={14} />}
              {copiado ? "Copiados" : "Copiar todos"}
            </button>
            <button
              type="button"
              onClick={() => setCodigosRespaldo(null)}
              className="text-xs font-medium text-amber-900 px-3 py-1.5"
            >
              Ya los guardé
            </button>
          </div>
        </div>
      )}

      {/* Configuración en curso */}
      {qr && (
        <div className="space-y-4">
          <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
            <li>Abre tu aplicación de autenticación (Google Authenticator, Microsoft Authenticator, 1Password…).</li>
            <li>Escanea este código.</li>
            <li>Escribe abajo los 6 dígitos que te muestre.</li>
          </ol>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR para la aplicación de autenticación" className="rounded-xl border border-slate-200" width={200} height={200} />

          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer">¿No puedes escanearlo?</summary>
            <p className="mt-1">Escribe esta clave a mano en tu aplicación:</p>
            <code className="block mt-1 font-mono bg-slate-50 rounded-lg px-2 py-1 break-all">{secreto}</code>
          </details>

          <div className="flex gap-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="000000"
              maxLength={7}
              className="w-32 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="button"
              onClick={confirmar}
              disabled={ocupado || codigo.length < 6}
              className="rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50"
            >
              {ocupado ? "Comprobando…" : "Activar"}
            </button>
          </div>
        </div>
      )}

      {/* Estado de reposo */}
      {!qr && (
        <div className="flex items-center gap-3">
          {estado?.activa ? (
            <>
              <button
                type="button"
                onClick={desactivar}
                disabled={ocupado}
                className="rounded-xl border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2.5 disabled:opacity-50"
              >
                Desactivar
              </button>
              <p className="text-xs text-slate-400">
                Te quedan {estado.codigosRespaldoRestantes} código{estado.codigosRespaldoRestantes === 1 ? "" : "s"} de respaldo.
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={empezar}
              disabled={ocupado}
              className="rounded-xl bg-brand-600 text-white text-sm font-medium px-4 py-2.5 disabled:opacity-50"
            >
              {ocupado ? "Preparando…" : "Activar verificación en dos pasos"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
