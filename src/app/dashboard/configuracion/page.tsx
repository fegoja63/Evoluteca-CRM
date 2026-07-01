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
    titulo: "Módulo Funciones / Eventos",
    descripcion: "Registra cada función, obra o evento: fecha, ocupación de sillas, canal de venta e ingresos estimados. Ideal para teatros, auditorios, salones de eventos y academias.",
    emoji: "🎭",
  },
  {
    key: "audiencia",
    titulo: "Módulo Audiencia (B2C)",
    descripcion: "Gestiona tu público: espectadores individuales, grupos, colegios y empresas. Incluye captura de NPS post-función para medir satisfacción y retención.",
    emoji: "👥",
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
    if (!confirm("¿Estás seguro? Esto borrará TODAS las empresas, contactos, oportunidades, actividades, propuestas, funciones y espectadores. Tu usuario y configuración se conservan.")) return;
    if (!confirm("Segunda confirmación: ¿borrar todos los datos de prueba?")) return;
    setLimpiando(true);
    await fetch("/api/configuracion/limpiar", { method: "DELETE" });
    setLimpiando(false);
    alert("✓ Datos eliminados. El CRM está limpio.");
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
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-slate-500 text-sm mt-1">Personaliza los módulos activos de tu CRM</p>
      </div>

      {!esAdmin && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-6">
          Solo un administrador puede cambiar la configuración.
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Módulos estándar</h2>
        <p className="text-xs text-slate-400 mb-4">Siempre activos para todos los tipos de negocio.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { titulo: "Clientes", emoji: "🏢", desc: "Empresas y organizaciones B2B" },
            { titulo: "Contactos", emoji: "👤", desc: "Personas de tus clientes" },
            { titulo: "Pipeline", emoji: "◈", desc: "Oportunidades de venta" },
            { titulo: "Agenda", emoji: "📅", desc: "Tareas, llamadas y reuniones" },
            { titulo: "Propuestas", emoji: "📄", desc: "Propuestas y cotizaciones activas" },
            { titulo: "Reportes", emoji: "📊", desc: "KPIs y métricas del negocio" },
            { titulo: "Equipo", emoji: "👥", desc: "Usuarios y roles" },
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
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Módulos opcionales</h2>
        <p className="text-xs text-slate-400 mb-4">Actívalos según el tipo de negocio.</p>
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
                    {guardado && <span className="text-xs text-emerald-600">✓ Guardado</span>}
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
            Borra todos los datos del CRM (empresas, contactos, oportunidades, propuestas, actividades, funciones y espectadores). Tu usuario y configuración se conservan. Útil para limpiar datos de prueba antes de empezar en producción.
          </p>
          <button
            onClick={handleLimpiar}
            disabled={limpiando}
            className="rounded-xl border border-red-400 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {limpiando ? "Limpiando..." : "🗑️ Limpiar todos los datos de prueba"}
          </button>
        </div>
      )}
    </div>
  );
}
