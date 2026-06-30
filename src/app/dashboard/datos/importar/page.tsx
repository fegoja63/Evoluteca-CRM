"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Preview = {
  hojas: string[];
  columnas: string[];
  muestra: Record<string, string>[];
  totalFilas: number;
};

type Resultado = { creados: number; errores: number; total: number };

const MODULOS = [
  { key: "empresas", label: "Empresas / Cuentas", emoji: "🏢", campos: [
    { key: "nombre", label: "Nombre *" },
    { key: "sector", label: "Sector" },
    { key: "telefono", label: "Teléfono" },
    { key: "sitioWeb", label: "Sitio Web" },
    { key: "notas", label: "Notas" },
  ]},
  { key: "contactos", label: "Contactos", emoji: "👤", campos: [
    { key: "nombre", label: "Nombre *" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "cargo", label: "Cargo" },
    { key: "empresa", label: "Empresa (nombre exacto)" },
    { key: "notas", label: "Notas" },
  ]},
  { key: "oportunidades", label: "Pipeline / Oportunidades", emoji: "◈", campos: [
    { key: "titulo", label: "Título *" },
    { key: "empresa", label: "Empresa (nombre exacto)" },
    { key: "etapa", label: "Etapa (PROSPECTO/CALIFICADO/PROPUESTA/NEGOCIACION/GANADA/PERDIDA)" },
    { key: "valor", label: "Valor (número)" },
    { key: "notas", label: "Notas" },
  ]},
  { key: "espectadores", label: "Audiencia / Espectadores", emoji: "🎪", campos: [
    { key: "nombre", label: "Nombre *" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "segmento", label: "Segmento (INDIVIDUAL/GRUPO/EMPRESA/COLEGIO)" },
    { key: "notas", label: "Notas" },
  ]},
];

export default function ImportarAvanzadoPage() {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [modulo, setModulo] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileRef2 = useRef<HTMLInputElement>(null);

  const moduloActual = MODULOS.find((m) => m.key === modulo);

  async function handlePrevisualizar() {
    const file = fileRef.current?.files?.[0];
    if (!file || !modulo) return;
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch("/api/importar/previsualizar", { method: "POST", body: fd });
    const data = await res.json();
    setPreview(data);
    // Mapeo automático: intenta hacer match por similaridad
    const autoMapeo: Record<string, string> = {};
    if (moduloActual && data.columnas) {
      moduloActual.campos.forEach(({ key }) => {
        const match = data.columnas.find((col: string) =>
          col.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key.replace(/[^a-z0-9]/g, "").toLowerCase())
        );
        autoMapeo[key] = match ?? "__ignorar__";
      });
    }
    setMapeo(autoMapeo);
    setCargando(false);
    setPaso(2);
  }

  async function handleImportar() {
    const file = fileRef.current?.files?.[0];
    if (!file || !modulo) return;
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("modulo", modulo);
    fd.append("mapeo", JSON.stringify(mapeo));
    const res = await fetch("/api/importar/ejecutar", { method: "POST", body: fd });
    const data = await res.json();
    setResultado(data);
    setCargando(false);
    setPaso(3);
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/datos" className="text-xs text-slate-500 hover:underline">← Datos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Importar con mapeo personalizado</h1>
      </div>

      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Seleccionar archivo" },
          { n: 2, label: "Mapear columnas" },
          { n: 3, label: "Resultado" },
        ].map((p, i) => (
          <div key={p.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              paso >= p.n ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>{p.n}</div>
            <span className={`text-sm ${paso >= p.n ? "text-slate-800 font-medium" : "text-slate-400"}`}>{p.label}</span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* PASO 1 */}
      {paso === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">¿A qué módulo quieres importar?</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {MODULOS.map((m) => (
              <button key={m.key} onClick={() => setModulo(m.key)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  modulo === m.key ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                }`}>
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-sm font-medium text-slate-800">{m.label}</span>
              </button>
            ))}
          </div>

          <h2 className="text-sm font-semibold text-slate-800 mb-2">Sube tu archivo Excel</h2>
          <p className="text-xs text-slate-400 mb-3">Puede ser tu propio formato — no necesitas usar la plantilla de Evoluteca.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 mb-5" />

          <button onClick={handlePrevisualizar} disabled={!modulo || cargando}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Leyendo archivo..." : "Continuar →"}
          </button>
        </div>
      )}

      {/* PASO 2 */}
      {paso === 2 && preview && moduloActual && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Mapea las columnas de tu archivo</h2>
              <p className="text-xs text-slate-400 mt-0.5">Se detectaron {preview.columnas.length} columnas · {preview.totalFilas} filas de datos</p>
            </div>
            <button onClick={() => setPaso(1)} className="text-xs text-slate-400 hover:underline">← Cambiar archivo</button>
          </div>

          {/* Muestra de datos */}
          <div className="mb-5 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50">
            <table className="text-xs min-w-full">
              <thead>
                <tr>
                  {preview.columnas.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.muestra.map((fila, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {preview.columnas.map((c) => (
                      <td key={c} className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-[160px] truncate">{fila[c] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mapeo */}
          <h3 className="text-xs font-semibold text-slate-700 mb-3">¿Cuál columna de tu archivo corresponde a cada campo del CRM?</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {moduloActual.campos.map((campo) => (
              <div key={campo.key}>
                <label className="block text-xs text-slate-500 mb-1">{campo.label}</label>
                <select
                  value={mapeo[campo.key] ?? "__ignorar__"}
                  onChange={(e) => setMapeo({ ...mapeo, [campo.key]: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="__ignorar__">— No importar —</option>
                  {preview.columnas.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button onClick={handleImportar} disabled={cargando}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Importando..." : `↑ Importar ${preview.totalFilas} registros`}
          </button>
        </div>
      )}

      {/* PASO 3 */}
      {paso === 3 && resultado && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 ${
            resultado.errores === 0 ? "bg-emerald-50" : "bg-amber-50"
          }`}>
            {resultado.errores === 0 ? "✅" : "⚠️"}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {resultado.errores === 0 ? "Importación exitosa" : "Importación con advertencias"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            <span className="font-semibold text-emerald-700">{resultado.creados} registros</span> importados correctamente
            {resultado.errores > 0 && <> · <span className="font-semibold text-amber-700">{resultado.errores} con error</span> (nombre vacío o dato inválido)</>}
            {" · "}{resultado.total} filas procesadas en total
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/datos"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ← Volver a Datos
            </Link>
            <button onClick={() => { setPaso(1); setResultado(null); setPreview(null); setMapeo({}); }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
