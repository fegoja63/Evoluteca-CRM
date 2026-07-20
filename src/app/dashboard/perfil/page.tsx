"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { IconCircleCheck, IconCalendar, IconCopy, IconCheck, IconRefresh, IconTrash } from "@tabler/icons-react";
import DosFactores from "./DosFactores";

const ROL_LABEL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  GERENTE: "Gerente",
  COMERCIAL: "Comercial",
};

export default function PerfilPage() {
  const { data: session, update } = useSession();

  const [nombre, setNombre]               = useState(session?.user?.name ?? "");
  const [email, setEmail]                 = useState(session?.user?.email ?? "");
  const [datosOriginales, setDatosOriginales] = useState({ nombre: session?.user?.name ?? "", email: session?.user?.email ?? "" });

  // useSession() suele resolver la sesión de forma asíncrona — en el primer
  // render "session" todavía es undefined, así que los campos quedaban vacíos
  // (el email vacío bloqueaba el envío del formulario por validación nativa
  // del navegador, sin ningún mensaje de error visible). Se sincronizan en
  // cuanto la sesión carga, una sola vez, para no pisar lo que el usuario
  // esté escribiendo si la sesión se refresca después.
  useEffect(() => {
    if (session?.user && !datosOriginales.nombre && !datosOriginales.email) {
      setNombre(session.user.name ?? "");
      setEmail(session.user.email ?? "");
      setDatosOriginales({ nombre: session.user.name ?? "", email: session.user.email ?? "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  const [passwordActual, setPasswordActual] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmar, setConfirmar]         = useState("");
  const [guardando, setGuardando]         = useState(false);
  const [exito, setExito]                 = useState("");
  const [error, setError]                 = useState("");

  // ── Suscripción de calendario (feed .ics en vivo) ──
  const [tokenCal, setTokenCal]     = useState<string | null>(null);
  const [cargandoCal, setCargandoCal] = useState(true);
  const [accionCal, setAccionCal]   = useState(false);
  const [copiado, setCopiado]       = useState(false);

  useEffect(() => {
    fetch("/api/perfil/calendario-token")
      .then(r => r.json())
      .then(d => setTokenCal(d.token ?? null))
      .catch(() => {})
      .finally(() => setCargandoCal(false));
  }, []);

  const urlCal = tokenCal && typeof window !== "undefined"
    ? `${window.location.origin}/api/calendario/${tokenCal}.ics`
    : "";

  async function generarCal() {
    setAccionCal(true);
    const res = await fetch("/api/perfil/calendario-token", { method: "POST" });
    const data = await res.json();
    setAccionCal(false);
    if (res.ok) setTokenCal(data.token);
  }

  async function revocarCal() {
    if (!confirm("¿Revocar el enlace de calendario? Los calendarios que ya lo tengan dejarán de actualizarse. Podrás generar uno nuevo cuando quieras.")) return;
    setAccionCal(true);
    const res = await fetch("/api/perfil/calendario-token", { method: "DELETE" });
    setAccionCal(false);
    if (res.ok) setTokenCal(null);
  }

  async function copiarCal() {
    if (!urlCal) return;
    await navigator.clipboard.writeText(urlCal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setExito("");

    if (nuevaPassword && nuevaPassword !== confirmar) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }

    setGuardando(true);
    const res = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre !== datosOriginales.nombre ? nombre : undefined,
        email: email !== datosOriginales.email ? email : undefined,
        passwordActual: passwordActual || undefined,
        nuevaPassword: nuevaPassword || undefined,
      }),
    });

    const data = await res.json();
    setGuardando(false);

    if (!res.ok) {
      setError(data.error ?? "Error al guardar");
      return;
    }

    await update({ name: nombre, email });
    setDatosOriginales({ nombre, email });
    setExito("Cambios guardados correctamente");
    setPasswordActual("");
    setNuevaPassword("");
    setConfirmar("");
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>
        <p className="text-slate-500 text-sm mt-1">Actualiza tu información personal y contraseña</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-8 p-5 bg-white rounded-2xl border border-slate-200">
        <div className="w-14 h-14 rounded-2xl bg-accent-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {(session?.user?.name ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{session?.user?.name}</p>
          <p className="text-sm text-slate-500">{session?.user?.email}</p>
          <span className="inline-block mt-1 text-xs font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
            {ROL_LABEL[session?.user?.rol ?? ""] ?? session?.user?.rol}
          </span>
        </div>
      </div>

      <form onSubmit={handleGuardar} className="space-y-6">

        {/* Datos personales */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Datos personales</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre completo</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Cambiar contraseña</h2>
          <p className="text-xs text-slate-400 mb-4">Deja en blanco si no quieres cambiarla</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña actual</label>
              <input type="password" value={passwordActual} onChange={e => setPasswordActual(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña</label>
              <input type="password" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar nueva contraseña</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        {exito && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">
            <IconCircleCheck size={16} stroke={1.75} /> {exito}
          </p>
        )}

        <button type="submit" disabled={guardando}
          className="w-full rounded-xl bg-accent-600 py-2.5 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50 transition-colors">
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>

      {/* Verificación en dos pasos */}
      <div className="mt-6">
        <DosFactores />
      </div>

      {/* Suscripción de calendario */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
          <IconCalendar size={16} stroke={1.75} /> Agenda en tu calendario
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Suscribe tus actividades pendientes a Google Calendar, Outlook o Apple Calendar. A diferencia de la
          exportación puntual, el enlace se mantiene actualizado solo: al agregar o cambiar actividades, tu
          calendario las refresca cada pocas horas sin volver a importar nada.
        </p>

        {cargandoCal ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : tokenCal ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tu enlace privado de suscripción</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={urlCal} onFocus={e => e.target.select()}
                  className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 outline-none" />
                <button type="button" onClick={copiarCal}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors">
                  {copiado ? <><IconCheck size={15} stroke={2} /> Copiado</> : <><IconCopy size={15} stroke={1.75} /> Copiar</>}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-semibold">Cualquiera con este enlace puede ver tu agenda.</span> No lo compartas.
                Si crees que se filtró, genera uno nuevo: el anterior deja de funcionar al instante.
              </p>
            </div>

            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-medium text-slate-600 select-none">¿Cómo lo suscribo?</summary>
              <ul className="mt-2 space-y-1.5 list-disc pl-4">
                <li><span className="font-medium text-slate-600">Google Calendar:</span> Otros calendarios → Suscribirse a un calendario (o Desde una URL) → pega el enlace.</li>
                <li><span className="font-medium text-slate-600">Outlook:</span> Agregar calendario → Suscribirse desde la web → pega el enlace.</li>
                <li><span className="font-medium text-slate-600">Apple Calendar:</span> Archivo → Nueva suscripción de calendario → pega el enlace.</li>
              </ul>
            </details>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={generarCal} disabled={accionCal}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                <IconRefresh size={15} stroke={1.75} /> Generar uno nuevo
              </button>
              <button type="button" onClick={revocarCal} disabled={accionCal}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                <IconTrash size={15} stroke={1.75} /> Revocar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={generarCal} disabled={accionCal}
            className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50 transition-colors">
            <IconCalendar size={16} stroke={1.75} /> {accionCal ? "Generando..." : "Activar suscripción de calendario"}
          </button>
        )}
      </div>
    </div>
  );
}
