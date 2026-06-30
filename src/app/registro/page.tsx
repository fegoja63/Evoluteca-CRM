"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registroSchema, RegistroInput } from "@/lib/validations/auth";

export default function RegistroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistroInput>({
    resolver: zodResolver(registroSchema),
  });

  const onSubmit = async (data: RegistroInput) => {
    setError(null);
    setCargando(true);

    const respuesta = await fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const resultado = await respuesta.json();

    if (!respuesta.ok) {
      setError(resultado.error ?? "Algo salió mal. Intenta de nuevo.");
      setCargando(false);
      return;
    }

    await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setCargando(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-medium text-neutral-900">
          Crea tu cuenta
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Organiza tus ventas en un día.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-700">
              Nombre de tu empresa
            </label>
            <input
              type="text"
              placeholder="Acme S.A.S"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              {...register("nombreEmpresa")}
            />
            {errors.nombreEmpresa && (
              <p className="mt-1 text-xs text-red-600">
                {errors.nombreEmpresa.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700">
              Tu nombre
            </label>
            <input
              type="text"
              placeholder="María Pérez"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              {...register("nombreUsuario")}
            />
            {errors.nombreUsuario && (
              <p className="mt-1 text-xs text-red-600">
                {errors.nombreUsuario.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700">
              Correo electrónico
            </label>
            <input
              type="email"
              placeholder="nombre@empresa.com"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700">
              Contraseña
            </label>
            <input
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-neutral-900 underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
