"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Modulos = {
  funciones?: boolean;
  audiencia?: boolean;
};

const MODULOS_DISPONIBLES = [
  {
    key: "funciones",
    titulo: "MÃ³dulo Funciones / Eventos",
    descripcion: "Registra cada funciÃ³n, obra o evento: fecha, ocupaciÃ³n de sillas, canal de venta e ingresos estimados. Ideal para teatros, auditorios, salones de eventos y academias.",
    emoji: "ðŸŽ­",
  },
  {
    key: "audiencia",
    titulo: "MÃ³dulo Audiencia (B2C)",
    descripcion: "Gestiona tu pÃºblico: espectadores individuales, grupos, colegios y empresas. Incluye captura de NPS post-funciÃ³n para medir satisfacciÃ³n y retenciÃ³n.",
    emoji: "ðŸ‘¥",
  },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const [modulos, setModulos] = useState<Modulos>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const esAdmin = session?.user?.rol === "ADMINISTRADOR";
  const [limpiando, setLimpiando] = useState(false);

  async function handleLimpiar() {
    if (!confirm("Â¿EstÃ¡s seguro? Esto borrarÃ¡ TODAS las empresas, contactos, oportunidades, actividades, cotizaciones, funciones y espectadores. Tu usuario y configuraciÃ³n se conservan.")) return;
    if (!confirm("Segunda confirmaciÃ³n: Â¿borrar todos los datos de prueba?")) return;
    setLimpiando(true);
    await fetch("/api/configuracion/limpiar", { method: "DELETE" });
    setLimpiando(false);
    alert("âœ“ Datos eliminados. El CRM estÃ¡ limpio.");
  }

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => {
        setModulos((data.modulos as Modulos) ?? {});
        setCargando(false);
      });
  }, []);

  async function toggleModulo(key: string, valor: boolean) {
    if (!esAdmin) return;
    const nuevos = { ...modulos, [key]: valor };
    setModulos(nuevos);
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modulos: nuevos }),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
    window.location.reload();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">ConfiguraciÃ³n</h1>
        <p className="text-slate-500 text-sm mt-1">Personaliza los mÃ³dulos activos de tu CRM</p>
      </div>

      {!esAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-6">
          Solo un administrador puede cambiar la configuraciÃ³n.
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">MÃ³dulos estÃ¡ndar</h2>
        <p className="text-xs text-slate-400 mb-4">Siempre activos para todos los tipos de negocio.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { titulo: "Clientes", emoji: "ðŸ¢", desc: "Empresas y organizaciones B2B" },
            { titulo: "Contactos", emoji: "ðŸ‘¤", desc: "Personas de tus clientes" },
            { titulo: "Pipeline", emoji: "â—ˆ", desc: "Oportunidades de venta" },
            { titulo: "Agenda", emoji: "ðŸ“…", desc: "Tareas, llamadas y reuniones" },
            { titulo: "Cotizaciones", emoji: "ðŸ“„", desc: "Cotizaciones activas" },
            { titulo: "Reportes", emoji: "ðŸ“Š", desc: "KPIs y mÃ©tricas del negocio" },
            { titulo: "Equipo", emoji: "ðŸ‘¥", desc: "Usuarios y roles" },
          ].map((m) => (
            <div key={m.titulo} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.titulo}</p>
                  <p className="text-xs text-slate-400">{m.desc}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Activo</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">MÃ³dulos opcionales</h2>
        <p className="text-xs text-slate-400 mb-4">ActÃ­valos segÃºn el tipo de negocio.</p>
        {cargando ? (
          <p className="text-sm text-slate-400">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {MODULOS_DISPONIBLES.map((m) => {
              const activo = !!(modulos as Record<string, boolean>)[m.key];
              return (
                <div key={m.key} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-0.5">{m.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{m.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-lg">{m.descripcion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    {guardando && <span className="text-xs text-slate-400">Guardando...</span>}
                    {guardado && <span className="text-xs text-emerald-600">âœ“ Guardado</span>}
                    <button
                      disabled={!esAdmin}
                      onClick={() => toggleModulo(m.key, !activo)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        activo ? "bg-blue-600" : "bg-slate-200"
                      } ${!esAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          activo ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {esAdmin && (
        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="text-sm font-semibold text-red-800 mb-1">Zona de peligro</h2>
          <p className="text-xs text-red-600 mb-4">
            Borra todos los datos del CRM (empresas, contactos, oportunidades, cotizaciones, actividades, funciones y espectadores). Tu usuario y configuraciÃ³n se conservan. Ãštil para limpiar datos de prueba antes de empezar en producciÃ³n.
          </p>
          <button
            onClick={handleLimpiar}
            disabled={limpiando}
            className="rounded-xl border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {limpiando ? "Limpiando..." : "ðŸ—‘ï¸ Limpiar todos los datos de prueba"}
          </button>
        </div>
      )}
    </div>
  );
}
