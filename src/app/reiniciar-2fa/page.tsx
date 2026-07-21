"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

/**
 * Página a la que lleva el enlace del correo: el usuario confirma que quiere
 * desactivar su verificación en dos pasos.
 *
 * Sin sesión a propósito: quien llega aquí no puede iniciar sesión, que es
 * justamente el problema que viene a resolver.
 */
function Contenido() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [estado, setEstado] = useState<"cargando" | "valido" | "invalido" | "listo">("cargando");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!token) return setEstado("invalido");
    fetch(`/api/auth/reiniciar-2fa?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.valido) {
          setEmail(d.email);
          setEstado("valido");
        } else {
          setEstado("invalido");
        }
      })
      .catch(() => setEstado("invalido"));
  }, [token]);

  async function confirmar() {
    setEnviando(true);
    setError("");
    const res = await fetch("/api/auth/reiniciar-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const d = await res.json();
    setEnviando(false);

    if (!res.ok) return setError(d.error ?? "No se pudo completar");
    setEstado("listo");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-500 text-white text-xl font-bold mb-4">
            E
          </div>
          <h1 className="text-2xl font-bold text-white">Evoluteca CRM</h1>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
          {estado === "cargando" && <p className="text-sm text-slate-400">Comprobando el enlace…</p>}

          {estado === "invalido" && (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Este enlace ya no sirve</h2>
              <p className="text-sm text-slate-400 mb-4">
                Los enlaces duran una hora y se usan una sola vez. Pídele a tu administrador que
                genere uno nuevo.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white"
              >
                Ir a iniciar sesión
              </button>
            </>
          )}

          {estado === "valido" && (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">
                Desactivar verificación en dos pasos
              </h2>
              <p className="text-sm text-slate-400 mb-1">Para la cuenta:</p>
              <p className="text-sm text-white font-medium mb-4">{email}</p>
              <p className="text-sm text-slate-400 mb-5">
                Después de esto entrarás solo con tu contraseña. Vuelve a activarla en cuanto
                recuperes tu teléfono.
              </p>

              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={confirmar}
                disabled={enviando}
                className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {enviando ? "Desactivando…" : "Sí, desactivar"}
              </button>
              <p className="text-xs text-slate-500 mt-3 text-center">
                Si tú no perdiste el acceso, cierra esta página: nada cambiará.
              </p>
            </>
          )}

          {estado === "listo" && (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Listo</h2>
              <p className="text-sm text-slate-400 mb-5">
                Ya puedes entrar solo con tu contraseña. Te recomendamos volver a activar la
                verificación en dos pasos desde <b>Mi perfil</b> cuando tengas tu teléfono.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 py-2.5 text-sm font-semibold text-white"
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReiniciarDosFactoresPage() {
  // useSearchParams exige Suspense en el App Router.
  return (
    <Suspense fallback={null}>
      <Contenido />
    </Suspense>
  );
}
