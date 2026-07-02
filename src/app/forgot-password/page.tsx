"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setCargando(false);
    if (res.ok) {
      setEnviado(true);
    } else {
      setError("Ocurrió un error. Intenta de nuevo.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">E</div>
          </div>

          {enviado ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Revisa tu correo</h2>
              <p className="text-slate-500 text-sm mb-6">
                Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña. El enlace expira en 1 hora.
              </p>
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                ← Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">¿Olvidaste tu contraseña?</h1>
              <p className="text-slate-500 text-sm text-center mb-6">
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="tu@correo.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={cargando || !email}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {cargando ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                  ← Volver al inicio de sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
