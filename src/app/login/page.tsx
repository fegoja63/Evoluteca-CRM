"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // El campo del código solo aparece cuando el servidor lo pide, y solo lo
  // pide a quien tenga la verificación en dos pasos activa. Para el resto de
  // la gente el login sigue siendo exactamente igual que siempre.
  const [pideCodigo, setPideCodigo] = useState(false);
  const [codigo, setCodigo] = useState("");

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setCargando(true);
    const resultado = await signIn("credentials", {
      ...data,
      ...(pideCodigo ? { codigo } : {}),
      redirect: false,
    });
    setCargando(false);

    if (resultado?.error) {
      // NextAuth solo deja pasar al navegador el "code" de un error
      // CredentialsSignin; el mensaje se queda en el servidor.
      if (resultado.code === "segundo_factor_requerido") {
        setPideCodigo(true);
        setError("Escribe el código de tu aplicación de autenticación.");
        return;
      }
      setError(
        pideCodigo
          ? "El código no es válido. Si perdiste el teléfono, usa uno de tus códigos de respaldo."
          : "Correo o contraseña incorrectos."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500 text-white text-xl font-bold mb-4">E</div>
          <h1 className="text-2xl font-bold text-white">Evoluteca CRM</h1>
          <p className="text-slate-400 text-sm mt-1">Organiza tus ventas en un día</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Correo electrónico</label>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
              <div className="mt-1.5 text-right">
                <a href="/forgot-password" className="text-xs text-slate-400 hover:text-blue-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            {pideCodigo && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Código de verificación
                </label>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 font-mono tracking-widest outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Los 6 dígitos de tu aplicación, o uno de tus códigos de respaldo.
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 mt-2"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            ¿No tienes cuenta?{" "}
            <a href="/registro" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Crea una gratis
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          <a href="https://www.felipegomezjaramillo.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-400 transition-colors">
            felipegomezjaramillo.com
          </a>
        </p>
      </div>
    </div>
  );
}
