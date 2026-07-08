"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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
        <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {(session?.user?.name ?? "?")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-slate-900">{session?.user?.name}</p>
          <p className="text-sm text-slate-500">{session?.user?.email}</p>
          <span className="inline-block mt-1 text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña</label>
              <input type="password" value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar nueva contraseña</label>
              <input type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        {exito && <p className="text-sm text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">✔ {exito}</p>}

        <button type="submit" disabled={guardando}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
