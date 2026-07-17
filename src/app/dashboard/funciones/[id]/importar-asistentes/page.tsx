"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  IconCircleCheck, IconAlertTriangle, IconUpload, IconUsers,
} from "@tabler/icons-react";

type Preview = {
  columnas: string[];
  muestra: Record<string, string>[];
  totalFilas: number;
};

type Resultado = {
  asistenciasCreadas: number;
  espectadoresNuevos: number;
  duplicados: number;
  errores: number;
  total: number;
};

// Campos del CRM a los que se puede mapear cada columna del Excel.
const CAMPOS = [
  { key: "nombre", label: "Nombre del asistente *" },
  { key: "email", label: "Email" },
  { key: "telefono", label: "Teléfono / WhatsApp" },
  { key: "segmento", label: "Segmento (INDIVIDUAL/GRUPO/EMPRESA/COLEGIO)" },
];

export default function ImportarAsistentesPage() {
  const params = useParams();
  const id = params.id as string;

  const [tituloFuncion, setTituloFuncion] = useState<string>("");
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [preview, setPreview] = useState<Preview | null>(null);
  // mapeo invertido: columnaExcel -> campoCRM ("__ignorar__" = ignorar)
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [archivoGuardado, setArchivoGuardado] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/funciones/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.titulo) setTituloFuncion(d.titulo); })
      .catch(() => {});
  }, [id]);

  async function handlePrevisualizar() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setArchivoGuardado(file);
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch("/api/importar/previsualizar", { method: "POST", body: fd });
    if (!res.ok) {
      setCargando(false);
      toast.error("No se pudo leer el archivo. Verifica que sea un Excel válido.");
      return;
    }
    const data: Preview = await res.json();
    setPreview(data);

    // Auto-mapeo: intentamos detectar a qué campo corresponde cada columna.
    const autoMapeo: Record<string, string> = {};
    data.columnas.forEach((col) => {
      const colNorm = col.toLowerCase().replace(/[^a-z0-9]/g, "");
      const match = CAMPOS.find(({ key }) =>
        colNorm.includes(key.replace(/[^a-z0-9]/g, "")) ||
        key.replace(/[^a-z0-9]/g, "").includes(colNorm)
      );
      // "nombre" es lo más común; si no hay match claro, dejamos ignorar.
      autoMapeo[col] = match ? match.key : "__ignorar__";
    });
    setMapeo(autoMapeo);
    setCargando(false);
    setPaso(2);
  }

  async function handleImportar() {
    const file = archivoGuardado;
    if (!file) return;

    const tieneNombre = Object.values(mapeo).includes("nombre");
    if (!tieneNombre) {
      toast.error('Debes asignar al menos una columna al campo "Nombre del asistente *" antes de importar.');
      return;
    }

    setCargando(true);

    // Convertir mapeo invertido (colExcel -> campoCRM) al formato de la API (campoCRM -> colExcel).
    const mapeoAPI: Record<string, string> = {};
    Object.entries(mapeo).forEach(([col, campo]) => {
      if (campo !== "__ignorar__") mapeoAPI[campo] = col;
    });

    const fd = new FormData();
    fd.append("archivo", file);
    fd.append("mapeo", JSON.stringify(mapeoAPI));

    const res = await fetch(`/api/funciones/${id}/asistencias/importar`, { method: "POST", body: fd });
    if (!res.ok) {
      setCargando(false);
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo importar. Inténtalo de nuevo.");
      return;
    }
    const data: Resultado = await res.json();
    setResultado(data);
    setCargando(false);
    setPaso(3);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href={`/dashboard/funciones/${id}`} className="hover:text-brand-600 transition-colors">← Volver a la función</Link>
        {tituloFuncion && <><span>/</span><span className="text-slate-600 truncate max-w-xs">{tituloFuncion}</span></>}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <IconUsers size={22} stroke={1.5} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Importar asistentes de esta función</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sube la planilla de público de la obra. Se registra la asistencia a esta función y se agrega a la audiencia
            sin duplicar a quienes ya existen (por email o nombre).
          </p>
        </div>
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
              paso >= p.n ? "bg-accent-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>{p.n}</div>
            <span className={`text-sm ${paso >= p.n ? "text-slate-800 font-medium" : "text-slate-400"}`}>{p.label}</span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* PASO 1 */}
      {paso === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Sube el Excel con la lista de asistentes</h2>
          <p className="text-xs text-slate-400 mb-3">
            Sube tu propio formato — en el siguiente paso verás tus columnas y decidirás cuál es el nombre, el email, etc.
            Lo único obligatorio es el <span className="font-medium text-slate-600">nombre</span>.
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 mb-5" />

          <button onClick={handlePrevisualizar} disabled={cargando}
            className="rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
            {cargando ? "Leyendo archivo..." : "Continuar →"}
          </button>
        </div>
      )}

      {/* PASO 2 */}
      {paso === 2 && preview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">¿Qué es cada columna de tu Excel?</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {preview.columnas.length} columnas detectadas · {preview.totalFilas} filas de datos
              </p>
            </div>
            <button onClick={() => setPaso(1)} className="text-xs text-slate-400 hover:underline">← Cambiar archivo</button>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            {preview.columnas.map((col) => {
              const ejemplos = preview.muestra.map((f) => f[col]).filter(Boolean).slice(0, 2);
              const valor = mapeo[col] ?? "__ignorar__";
              return (
                <div key={col} className={`flex items-center gap-4 rounded-xl border p-3 ${
                  valor === "__ignorar__" ? "border-slate-100 bg-slate-50 opacity-60" : "border-brand-100 bg-brand-50"
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
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-brand-500 min-w-[220px]"
                  >
                    <option value="__ignorar__">Ignorar esta columna</option>
                    <optgroup label="─── Campo del CRM ───">
                      {CAMPOS.map((c) => (
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
              {Object.values(mapeo).includes("nombre")
                ? "Columna de nombre asignada ✓"
                : "Falta asignar la columna del nombre"}
            </p>
            <button onClick={handleImportar} disabled={cargando}
              className="rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50 flex items-center gap-1.5">
              <IconUpload size={14} stroke={1.75} />{cargando ? "Importando..." : `Registrar ${preview.totalFilas} asistentes`}
            </button>
          </div>
        </div>
      )}

      {/* PASO 3 */}
      {paso === 3 && resultado && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            resultado.errores === 0 ? "bg-emerald-50" : "bg-amber-50"
          }`}>
            {resultado.errores === 0
              ? <IconCircleCheck size={28} stroke={1.5} className="text-emerald-600" />
              : <IconAlertTriangle size={28} stroke={1.5} className="text-amber-600" />}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {resultado.errores === 0 ? "Asistencias registradas" : "Importación con advertencias"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            <span className="font-semibold text-emerald-700">{resultado.asistenciasCreadas}</span> asistencias registradas
            {" · "}<span className="font-semibold text-brand-700">{resultado.espectadoresNuevos}</span> espectadores nuevos
            {resultado.duplicados > 0 && <>{" · "}<span className="font-semibold text-slate-600">{resultado.duplicados}</span> ya estaban en la función</>}
            {resultado.errores > 0 && <>{" · "}<span className="font-semibold text-amber-700">{resultado.errores}</span> con error</>}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/dashboard/funciones/${id}`}
              className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700">
              Ver la función →
            </Link>
            <button onClick={() => { setPaso(1); setResultado(null); setPreview(null); setMapeo({}); if (fileRef.current) fileRef.current.value = ""; }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
