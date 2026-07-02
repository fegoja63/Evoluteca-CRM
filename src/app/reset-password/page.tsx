"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmar) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return; }
    setCargando(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setCargando(false);
    if (res.ok) {
      setExito(true);
      setTimeout(() => router.push("/login"), 2500);
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al restablecer la contraseña");
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Enlace inválido</h2>
        <p className="text-slate-500 text-sm mb-4">Este enlace de recuperación no es válido.</p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">¡Contraseña actualizada!</h2>
        <p className="text-slate-500 text-sm">Redirigiendo al inicio de sesión...</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-800 text-center mb-1">Nueva contraseña</h1>
      <p className="text-slate-500 text-sm text-center mb-6">Elige una contraseña segura para tu cuenta.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Confirmar contraseña</label>
          <input
            type="password"
            value={confirmar}
            onChange={e => setConfirmar(e.target.value)}
            required
            placeholder="Repite la contraseña"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {error && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={cargando || !password || !confirmar}
          className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {cargando ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">E</div>
          </div>
          <Suspense fallback={<p className="text-center text-slate-400 text-sm">Cargando...</p>}>
            <ResetForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
