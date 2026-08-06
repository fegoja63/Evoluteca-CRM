"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IconBuilding, IconUser, IconUsers, IconChartFunnel, IconCalendarEvent,
  IconFileText, IconTheater, IconPackage, IconRocket, IconDownload, IconCopyOff, type Icon,
} from "@tabler/icons-react";

// `key` es el segmento que consume /api/exportar/<key>. `req`, si está, es el
// módulo del tenant que debe estar activo para mostrar la tarjeta (los demás
// son módulos base, siempre disponibles).
const MODULOS_EXPORT: { key: string; label: string; icon: Icon; req?: string }[] = [
  { key: "empresas", label: "Empresas / Cuentas", icon: IconBuilding },
  { key: "contactos", label: "Contactos", icon: IconUser },
  { key: "pipeline", label: "Pipeline", icon: IconChartFunnel },
  { key: "catalogo", label: "Catálogo / Productos", icon: IconPackage },
  { key: "agenda", label: "Agenda", icon: IconCalendarEvent },
  { key: "cotizaciones", label: "Cotizaciones", icon: IconFileText },
  { key: "espectadores", label: "Audiencia", icon: IconUsers, req: "audiencia" },
  { key: "funciones", label: "Funciones", icon: IconTheater, req: "funciones" },
];

export default function DatosPage() {
  const [modulos, setModulos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setModulos((data.modulos as Record<string, boolean>) ?? {}))
      .catch(() => {});
  }, []);

  const exportables = MODULOS_EXPORT.filter((m) => !m.req || modulos[m.req]);

  function descargar(url: string, nombre: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Datos</h1>
        <p className="text-slate-500 text-sm mt-1">Importa y exporta información del CRM en formato Excel</p>
      </div>

      {/* IMPORTACION COMPLETA */}
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconRocket size={18} stroke={1.75} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Importación completa desde un solo Excel</p>
            <p className="text-xs text-emerald-700 mt-1">Crea Cuentas, Contactos y Pipeline vinculados en una sola operación.</p>
          </div>
        </div>
        <Link href="/dashboard/datos/importar-completo"
          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 shrink-0 ml-4">
          Importar todo →
        </Link>
      </div>

      {/* IMPORTACION POR MODULO (con mapeo de columnas) */}
      <div className="mb-10 rounded-2xl border border-brand-200 bg-brand-50 p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-900">¿Quieres importar un módulo específico?</p>
          <p className="text-xs text-brand-600 mt-1">Sube tu archivo, mapea cada columna a los campos del CRM y decide qué hacer con el resto.</p>
        </div>
        <Link href="/dashboard/datos/importar"
          className="rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-700 shrink-0 ml-4">
          Importar un módulo →
        </Link>
      </div>

      {/* LIMPIEZA DE DATOS */}
      <div className="mb-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconCopyOff size={18} stroke={1.75} className="text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">¿Contactos o empresas repetidos?</p>
            <p className="text-xs text-amber-700 mt-1">Las importaciones acumulan duplicados. Encuéntralos y fusiónalos sin perder lo asociado.</p>
          </div>
        </div>
        <Link href="/dashboard/datos/duplicados"
          className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 shrink-0 ml-4">
          Limpiar duplicados →
        </Link>
      </div>

      {/* EXPORTAR */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Exportar a Excel</h2>
        <p className="text-xs text-slate-400 mb-4">Descarga los datos actuales de cada módulo en un archivo .xlsx listo para usar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportables.map((m) => {
            const Icono = m.icon;
            return (
            <div key={m.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Icono size={16} stroke={1.75} className="text-brand-600" />
                </div>
                <p className="text-sm font-medium text-slate-800">{m.label}</p>
              </div>
              <button
                onClick={() => descargar(`/api/exportar/${m.key}`, `${m.key}.xlsx`)}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 flex items-center gap-1"
              >
                <IconDownload size={13} stroke={1.75} />Exportar
              </button>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
