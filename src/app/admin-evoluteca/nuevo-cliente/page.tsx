"use client";

import { useState } from "react";

const FORM_VACIO = { claveAdmin: "", nombreEmpresa: "", nombreUsuario: "", email: "", password: "" };

export default function NuevoClienteInternoPage() {
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [creado, setCreado] = useState<{ nombreEmpresa: string; email: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEnviando(true);
    const res = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setEnviando(false);
    if (!res.ok) {
      setError(res.status === 403 ? "Clave de administrador incorrecta." : (data.error ?? "No se pudo crear el cliente"));
      return;
    }
    setCreado({ nombreEmpresa: form.nombreEmpresa, email: form.email });
    setForm(f => ({ ...FORM_VACIO, claveAdmin: f.claveAdmin }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500 text-white text-xl font-bold mb-4">E</div>
          <h1 className="text-2xl font-bold text-white">Nuevo cliente</h1>
          <p className="text-slate-400 text-sm mt-1">Página interna — solo Evoluteca</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
          {creado && (
            <div className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
              <p className="text-sm text-emerald-400 font-semibold">✓ Cliente creado</p>
              <p className="text-xs text-emerald-300/80 mt-1">
                {creado.nombreEmpresa} — administrador: {creado.email}. Ya puede iniciar sesión en{" "}
                <a href="/login" className="underline">/login</a> con la contraseña que definiste.
              </p>
            </div>
          )}

          <h2 className="text-lg font-semibold text-white mb-6">Crear cuenta de empresa</h2>

          <form onSubmit={crear} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Clave de administrador</label>
              <input
                type="password"
                value={form.claveAdmin}
                onChange={e => set("claveAdmin", e.target.value)}
                placeholder="ADMIN_REGISTRO_SECRET"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre de la empresa</label>
              <input
                type="text"
                value={form.nombreEmpresa}
                onChange={e => set("nombreEmpresa", e.target.value)}
                placeholder="Ej: Teatro Belarte"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre del administrador</label>
              <input
                type="text"
                value={form.nombreUsuario}
                onChange={e => set("nombreUsuario", e.target.value)}
                placeholder="Nombre de quien administrará la cuenta"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo del administrador</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="nombre@empresa.com"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña inicial</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">Compártela con el cliente por un canal seguro; puede cambiarla luego desde Mi perfil.</p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 mt-2"
            >
              {enviando ? "Creando..." : "Crear cliente"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Esta página no está enlazada en el menú ni indexada — guarda la URL en un lugar seguro.
        </p>
      </div>
    </div>
  );
}
