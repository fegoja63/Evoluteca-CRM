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

// Campos estándar disponibles por módulo
const CAMPOS_CRM: Record<string, { key: string; label: string }[]> = {
  empresas: [
    { key: "nombre", label: "Nombre *" },
    { key: "sector", label: "Sector" },
    { key: "telefono", label: "Teléfono" },
    { key: "sitioWeb", label: "Sitio Web" },
    { key: "notas", label: "Notas" },
  ],
  contactos: [
    { key: "nombre", label: "Nombre *" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "cargo", label: "Cargo" },
    { key: "empresa", label: "Empresa" },
    { key: "notas", label: "Notas" },
  ],
  oportunidades: [
    { key: "titulo", label: "Título *" },
    { key: "empresa", label: "Empresa" },
    { key: "etapa", label: "Etapa" },
    { key: "valor", label: "Valor (número)" },
    { key: "notas", label: "Notas" },
  ],
  espectadores: [
    { key: "nombre", label: "Nombre *" },
    { key: "email", label: "Email" },
    { key: "telefono", label: "Teléfono" },
    { key: "segmento", label: "Segmento" },
    { key: "notas", label: "Notas" },
  ],
};

const MODULOS = [
  { key: "empresas", label: "Empresas / Cuentas", emoji: "🏢" },
  { key: "contactos", label: "Contactos", emoji: "👤" },
  { key: "oportunidades", label: "Pipeline / Oportunidades", emoji: "◈" },
  { key: "espectadores", label: "Audiencia / Espectadores", emoji: "🎪" },
];

export default function ImportarAvanzadoPage() {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [modulo, setModulo] = useState<string>("");
  const [preview, setPreview] = useState<Preview | null>(null);
  // mapeo invertido: columnaExcel -> campoCRM ("__extra__" = guardar como extra, "__ignorar__" = ignorar)
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePrevisualizar() {
    const file = fileRef.current?.files?.[0];
    if (!file || !modulo) return;
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch("/api/importar/previsualizar", { method: "POST", body: fd });
    const data: Preview = await res.json();
    setPreview(data);

    // Auto-mapeo: para cada columna del Excel intentamos detectar a qué campo del CRM corresponde
    const campos = CAMPOS_CRM[modulo] ?? [];
    const autoMapeo: Record<string, string> = {};
    data.columnas.forEach((col) => {
      const colNorm = col.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = campos.find(({ key }) =>
        colNorm.includes(key.replace(/[^a-z0-9]/g, "")) ||
        key.replace(/[^a-z0-9]/g, "").includes(colNorm)
      );
      autoMapeo[col] = match ? match.key : "__extra__";
    });
    setMapeo(autoMapeo);
    setCargando(false);
    setPaso(2);
  }

  async function handleImportar() {
    const file = fileRef.current?.files?.[0];
    if (!file || !modulo) return;
    setCargando(true);

    // Convertir mapeo invertido (colExcel -> campoCRM) al formato que espera la API (campoCRM -> colExcel)
    const mapeoAPI: Record<string, string> = {};
    Object.entries(mapeo).forEach(([col, campo]) => {
      if (campo !== "__extra__" && campo !== "__ignorar__") {
        mapeoAPI[campo] = col;
      }
    });

    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("modulo", modulo);
    fd.append("mapeo", JSON.stringify(mapeoAPI));
    // Columnas marcadas como extra las mandamos también
    const colsExtra = Object.entries(mapeo)
      .filter(([, v]) => v === "__extra__")
      .map(([col]) => col);
    fd.append("colsExtra", JSON.stringify(colsExtra));

    const res = await fetch("/api/importar/ejecutar", { method: "POST", body: fd });
    const data = await res.json();
    setResultado(data);
    setCargando(false);
    setPaso(3);
  }

  const campos = CAMPOS_CRM[modulo] ?? [];

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
          { n: 2, label: "Asignar columnas" },
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
          <p className="text-xs text-slate-400 mb-3">Sube tu propio formato — en el siguiente paso verás todas tus columnas y decidirás qué hacer con cada una.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 mb-5" />

          <button onClick={handlePrevisualizar} disabled={!modulo || cargando}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Leyendo archivo..." : "Continuar →"}
          </button>
        </div>
      )}

      {/* PASO 2 */}
      {paso === 2 && preview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">¿Qué hago con cada columna de tu Excel?</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {preview.columnas.length} columnas detectadas · {preview.totalFilas} filas de datos
              </p>
            </div>
            <button onClick={() => setPaso(1)} className="text-xs text-slate-400 hover:underline">← Cambiar archivo</button>
          </div>

          {/* Leyenda */}
          <div className="flex gap-4 mb-5 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Campo del CRM</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Guardar como dato extra</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Ignorar</div>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {preview.columnas.map((col) => {
              const ejemplos = preview.muestra.map((f) => f[col]).filter(Boolean).slice(0, 2);
              const valor = mapeo[col] ?? "__extra__";
              return (
                <div key={col} className={`flex items-center gap-4 rounded-xl border p-3 ${
                  valor === "__ignorar__" ? "border-slate-100 bg-slate-50 opacity-60" :
                  valor === "__extra__" ? "border-emerald-100 bg-emerald-50" :
                  "border-blue-100 bg-blue-50"
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{col}</p>
                    {ejemplos.length > 0 && (
                      <p className="text-xs text-slate-400 truncate">Ej: {ejemplos.join(" · ")}</p>
                    )}
                  </div>
                  <select
                    value={valor}
                    onChange={(e) => setMapeo({ ...mapeo, [col]: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-blue-500 min-w-[200px]"
                  >
                    <option value="__extra__">💾 Guardar como dato extra</option>
                    <option value="__ignorar__">✕ Ignorar esta columna</option>
                    <optgroup label="─── Campo del CRM ───">
                      {campos.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {Object.values(mapeo).filter(v => v !== "__extra__" && v !== "__ignorar__").length} campos del CRM mapeados ·{" "}
              {Object.values(mapeo).filter(v => v === "__extra__").length} columnas como extras ·{" "}
              {Object.values(mapeo).filter(v => v === "__ignorar__").length} ignoradas
            </p>
            <button onClick={handleImportar} disabled={cargando}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {cargando ? "Importando..." : `↑ Importar ${preview.totalFilas} registros`}
            </button>
          </div>
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
            {resultado.errores > 0 && <> · <span className="font-semibold text-amber-700">{resultado.errores} con error</span></>}
            {" · "}{resultado.total} filas procesadas
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
