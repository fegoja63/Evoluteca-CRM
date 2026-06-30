"use client";

import { useState, useRef } from "react";

type Resultado = { creados: number; errores: number; total: number } | null;

const MODULOS_EXPORT = [
  { key: "empresas", label: "Empresas / Cuentas", emoji: "🏢" },
  { key: "contactos", label: "Contactos", emoji: "👤" },
  { key: "pipeline", label: "Pipeline", emoji: "◈" },
  { key: "agenda", label: "Agenda", emoji: "📅" },
  { key: "cotizaciones", label: "Cotizaciones", emoji: "📄" },
  { key: "espectadores", label: "Audiencia", emoji: "🎪" },
  { key: "funciones", label: "Funciones", emoji: "🎭" },
];

const MODULOS_IMPORT = [
  { key: "empresas", label: "Empresas / Cuentas", emoji: "🏢" },
  { key: "contactos", label: "Contactos", emoji: "👤" },
  { key: "espectadores", label: "Audiencia", emoji: "🎪" },
];

export default function DatosPage() {
  const [importando, setImportando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado>(null);
  const [moduloActivo, setModuloActivo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function descargar(url: string, nombre: string) {
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.click();
  }

  async function handleImportar(modulo: string) {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImportando(modulo);
    setResultado(null);
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch(`/api/importar/${modulo}`, { method: "POST", body: fd });
    const data = await res.json();
    setResultado(data);
    setImportando(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Datos</h1>
        <p className="text-slate-500 text-sm mt-1">Importa y exporta información del CRM en formato Excel</p>
      </div>

      {/* EXPORTAR */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Exportar a Excel</h2>
        <p className="text-xs text-slate-400 mb-4">Descarga los datos actuales de cada módulo en un archivo .xlsx listo para usar.</p>
        <div className="grid grid-cols-2 gap-3">
          {MODULOS_EXPORT.map((m) => (
            <div key={m.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.emoji}</span>
                <p className="text-sm font-medium text-slate-800">{m.label}</p>
              </div>
              <button
                onClick={() => descargar(`/api/exportar/${m.key}`, `${m.key}.xlsx`)}
                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                ↓ Exportar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PLANTILLAS */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Descargar plantillas</h2>
        <p className="text-xs text-slate-400 mb-4">Descarga una plantilla vacía con el formato correcto, llénala con tus datos y luego impórtala.</p>
        <div className="grid grid-cols-2 gap-3">
          {MODULOS_IMPORT.map((m) => (
            <div key={m.key} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{m.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.label}</p>
                  <p className="text-xs text-slate-400">Incluye fila de ejemplo</p>
                </div>
              </div>
              <button
                onClick={() => descargar(`/api/plantilla/${m.key}`, `plantilla_${m.key}.xlsx`)}
                className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                ↓ Plantilla
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* IMPORTAR */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Importar desde Excel</h2>
        <p className="text-xs text-slate-400 mb-4">Sube un archivo .xlsx con tus datos. Usa la plantilla de arriba para asegurarte del formato correcto.</p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-600 mb-2">1. Selecciona el módulo a importar</label>
            <div className="flex flex-wrap gap-2">
              {MODULOS_IMPORT.map((m) => (
                <button
                  key={m.key}
                  onClick={() => { setModuloActivo(m.key); setResultado(null); }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                    moduloActivo === m.key
                      ? "bg-blue-600 text-white font-medium"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{m.emoji}</span> {m.label}
                </button>
              ))}
            </div>
          </div>

          {moduloActivo && (
            <>
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-600 mb-2">2. Selecciona el archivo .xlsx</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx"
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <button
                onClick={() => handleImportar(moduloActivo)}
                disabled={!!importando}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {importando ? "Importando..." : "↑ Importar ahora"}
              </button>
            </>
          )}

          {resultado && (
            <div className={`mt-5 rounded-2xl p-4 ${resultado.errores === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
              <p className={`text-sm font-semibold ${resultado.errores === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {resultado.errores === 0 ? "✓ Importación exitosa" : "⚠ Importación con advertencias"}
              </p>
              <p className="text-sm text-slate-600 mt-1">
                {resultado.creados} registros importados correctamente
                {resultado.errores > 0 && ` · ${resultado.errores} filas con error (nombre vacío o dato inválido)`}
                {" · "}Total procesado: {resultado.total} filas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
