"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Preview = {
  columnas: string[];
  muestra: Record<string, string>[];
  totalFilas: number;
};

type Resultado = {
  empresasCreadas: number;
  contactosCreados: number;
  oportunidadesCreadas: number;
  errores: number;
  total: number;
  debug?: {
    contactosMapeados: number;
    oportunidadesMapeadas: number;
    contactosError: string;
    oportunidadesError: string;
  };
};

const CAMPOS = [
  { key: "empresa",           label: "🏢 Empresa / Cliente",      desc: "Nombre de la empresa o cliente" },
  { key: "contacto",          label: "👤 Contacto / Persona",      desc: "Nombre de la persona de contacto" },
  { key: "emailContacto",     label: "✉️ Email del contacto",      desc: "" },
  { key: "telefonoContacto",  label: "📞 Teléfono del contacto",   desc: "" },
  { key: "cargoContacto",     label: "💼 Cargo del contacto",      desc: "" },
  { key: "tituloOportunidad", label: "◈ Tipo de negocio / evento", desc: "Nombre del negocio o tipo de evento" },
  { key: "etapaOportunidad",  label: "🏷️ Estado / Etapa",          desc: "HECHO, DESCARTADO, EN PROCESO, etc." },
  { key: "valorOportunidad",  label: "💰 Valor cotizado",          desc: "Solo números" },
  { key: "costoOportunidad",  label: "💸 Costo del evento",        desc: "Costo interno del evento" },
  { key: "fechaEvento",       label: "📅 Fecha del evento",        desc: "Fecha en que ocurre el evento" },
  { key: "fechaCierre",       label: "📆 Fecha de cierre",         desc: "Fecha de cierre del negocio" },
  { key: "sede",              label: "📍 Sede / Sala",             desc: "Lugar del evento" },
  { key: "origenLead",        label: "🎯 Origen del lead",         desc: "Cómo llegó este cliente" },
  { key: "segmento",          label: "👥 Segmento",                desc: "Tipo de cliente" },
  { key: "recurrente",        label: "🔁 Recurrente",              desc: "SI / NO — si es cliente recurrente" },
];

// Campos obligatorios para poder importar
const CAMPOS_REQUERIDOS = ["empresa", "contacto", "tituloOportunidad"];

export default function ImportarCompletoPage() {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [autoDetectados, setAutoDetectados] = useState<Set<string>>(new Set());
  const [colsExtra, setColsExtra] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePrevisualizar() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setArchivo(file);
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", file);
    const res = await fetch("/api/importar/previsualizar", { method: "POST", body: fd });
    const data: Preview = await res.json();
    setPreview(data);

    // Devuelve true si la mayoría de los valores de muestra de esa columna son numéricos
    function esColumnaNumerica(col: string): boolean {
      const vals = data.muestra.map((f) => f[col]).filter(Boolean);
      if (vals.length === 0) return false;
      const numericos = vals.filter((v) => !isNaN(Number(v.replace(/[.,\s$€£]/g, "")))).length;
      return numericos / vals.length >= 0.5;
    }

    // Auto-mapeo por nombre de columna + validación de datos
    const autoMapeo: Record<string, string> = {};
    const autoExtra: string[] = [];
    data.columnas.forEach((col) => {
      const norm = col.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (norm.includes("cliente") || norm.includes("empresa") || norm.includes("razon")) {
        autoMapeo["empresa"] = col;
      } else if (norm.includes("contacto") && !autoMapeo["contacto"]) {
        autoMapeo["contacto"] = col;
      } else if (norm.includes("email") || norm.includes("correo")) {
        autoMapeo["emailContacto"] = col;
      } else if (norm.includes("telefono") || norm.includes("celular")) {
        autoMapeo["telefonoContacto"] = col;
      } else if (norm.includes("cargo") || norm.includes("puesto")) {
        autoMapeo["cargoContacto"] = col;
      } else if (norm.includes("estado") || norm.includes("etapa") || norm.includes("status")) {
        autoMapeo["etapaOportunidad"] = col;
      } else if (norm.includes("costo") && esColumnaNumerica(col)) {
        autoMapeo["costoOportunidad"] = col;
      } else if ((norm.includes("valor") || norm.includes("precio") || norm.includes("monto")) && esColumnaNumerica(col) && !autoMapeo["valorOportunidad"]) {
        autoMapeo["valorOportunidad"] = col;
      } else if (norm.includes("fechaevento") || (norm.includes("fecha") && (norm.includes("event") || norm.includes("acto")))) {
        autoMapeo["fechaEvento"] = col;
      } else if (norm.includes("fechacierre") || norm.includes("fechadecier") || (norm.includes("fecha") && norm.includes("cierr"))) {
        autoMapeo["fechaCierre"] = col;
      } else if (norm.includes("tipoevento") || norm.includes("tipodeneg") || (norm.includes("tipo") && norm.includes("event"))) {
        if (!autoMapeo["tituloOportunidad"]) autoMapeo["tituloOportunidad"] = col;
      } else if ((norm.includes("tipo") || norm.includes("evento") || norm.includes("negocio")) && !autoMapeo["tituloOportunidad"]) {
        autoMapeo["tituloOportunidad"] = col;
      } else if (norm.includes("sede") || norm.includes("sala") || norm.includes("lugar")) {
        autoMapeo["sede"] = col;
      } else if (norm.includes("origen") || norm.includes("lead") || norm.includes("fuente")) {
        autoMapeo["origenLead"] = col;
      } else if (norm.includes("segmento")) {
        autoMapeo["segmento"] = col;
      } else if (norm.includes("recurrente") || norm.includes("recurrent")) {
        autoMapeo["recurrente"] = col;
      } else {
        autoExtra.push(col);
      }
    });
    setMapeo(autoMapeo);
    setAutoDetectados(new Set(Object.keys(autoMapeo)));
    setColsExtra(autoExtra);
    setCargando(false);
    setPaso(2);
  }

  async function handleImportar() {
    if (!archivo) return;
    setCargando(true);
    const fd = new FormData();
    fd.append("archivo", archivo);
    fd.append("mapeo", JSON.stringify(mapeo));
    fd.append("colsExtra", JSON.stringify(colsExtra));
    const res = await fetch("/api/importar/completo", { method: "POST", body: fd });
    const data = await res.json();
    setResultado(data);
    setCargando(false);
    setPaso(3);
  }

  // Columnas que no están mapeadas a ningún campo estándar
  const columnasMapeadas = new Set(Object.values(mapeo).filter(Boolean));

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/datos" className="text-xs text-slate-500 hover:underline">← Datos</Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Importación completa</h1>
      </div>

      <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Importación inteligente:</strong> desde un solo Excel crea automáticamente las Empresas, Contactos y Oportunidades del Pipeline — todos vinculados entre sí.
      </div>

      {/* Pasos */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { n: 1, label: "Subir archivo" },
          { n: 2, label: "Asignar columnas" },
          { n: 3, label: "Resultado" },
        ].map((p, i) => (
          <div key={p.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${paso >= p.n ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{p.n}</div>
            <span className={`text-sm ${paso >= p.n ? "text-slate-800 font-medium" : "text-slate-400"}`}>{p.label}</span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* PASO 1 */}
      {paso === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Sube tu archivo Excel</h2>
          <p className="text-xs text-slate-400 mb-4">Puede tener cualquier formato. En el siguiente paso asignarás cada columna.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 mb-5" />
          <button onClick={handlePrevisualizar} disabled={cargando}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Leyendo..." : "Continuar →"}
          </button>
        </div>
      )}

      {/* PASO 2 */}
      {paso === 2 && preview && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">¿Qué columna corresponde a cada campo del CRM?</h2>
              <p className="text-xs text-slate-400 mt-0.5">{preview.columnas.length} columnas · {preview.totalFilas} filas</p>
            </div>
            <button onClick={() => setPaso(1)} className="text-xs text-slate-400 hover:underline">← Cambiar archivo</button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {CAMPOS.map((campo) => {
              const mapeado = !!mapeo[campo.key];
              const requerido = CAMPOS_REQUERIDOS.includes(campo.key);
              const autoDetectado = autoDetectados.has(campo.key);
              const faltaRequerido = requerido && !mapeado;
              const ejemplos = mapeado
                ? preview.muestra.map((f) => f[mapeo[campo.key]]).filter(Boolean).slice(0, 2)
                : [];
              return (
                <div key={campo.key} className={`rounded-xl border p-3 ${faltaRequerido ? "border-red-300 bg-red-50" : mapeado ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-700">{campo.label}{requerido && <span className="text-red-500 ml-1">*</span>}</label>
                    {autoDetectado && mapeado && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">✓ Auto</span>
                    )}
                  </div>
                  {campo.desc && <p className="text-xs text-slate-400 mb-1.5">{campo.desc}</p>}
                  <select
                    value={mapeo[campo.key] ?? ""}
                    onChange={(e) => {
                      const nueva = { ...mapeo };
                      if (e.target.value) nueva[campo.key] = e.target.value;
                      else delete nueva[campo.key];
                      setMapeo(nueva);
                    }}
                    className={`w-full rounded-lg border px-2 py-1.5 text-xs outline-none focus:border-blue-500 ${faltaRequerido ? "border-red-300" : "border-slate-200"}`}
                  >
                    <option value="">— No mapear —</option>
                    {preview.columnas.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {faltaRequerido && <p className="text-xs text-red-500 mt-1">Este campo es obligatorio</p>}
                  {ejemplos.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1 truncate">Ej: {ejemplos.join(" · ")}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Columnas no mapeadas */}
          {preview.columnas.filter(c => !columnasMapeadas.has(c)).length > 0 && (
            <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs font-medium text-emerald-700 mb-2">
                Columnas restantes → se guardarán como datos extras en cada registro:
              </p>
              <div className="flex flex-wrap gap-1">
                {preview.columnas.filter(c => !columnasMapeadas.has(c)).map((c) => (
                  <span key={c} className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{c}</span>
                ))}
              </div>
            </div>
          )}

          {(() => {
            const faltantes = CAMPOS_REQUERIDOS.filter((k) => !mapeo[k]).map(
              (k) => CAMPOS.find((c) => c.key === k)?.label ?? k
            );
            return (
              <>
                <button onClick={handleImportar} disabled={cargando || faltantes.length > 0}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {cargando ? "Importando..." : `↑ Importar ${preview.totalFilas} registros a Cuentas, Contactos y Pipeline`}
                </button>
                {faltantes.length > 0 && (
                  <p className="text-xs text-red-500 mt-2">
                    Faltan campos obligatorios: {faltantes.map(l => l.replace(/^.+?\s/, "")).join(", ")}
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* PASO 3 */}
      {paso === 3 && resultado && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 bg-emerald-50">
            {resultado.errores === 0 ? "✅" : "⚠️"}
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Importación completada</h2>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{resultado.empresasCreadas}</p>
              <p className="text-xs text-blue-500 mt-0.5">Cuentas</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3">
              <p className="text-2xl font-bold text-violet-700">{resultado.contactosCreados}</p>
              <p className="text-xs text-violet-500 mt-0.5">Contactos</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{resultado.oportunidadesCreadas}</p>
              <p className="text-xs text-emerald-500 mt-0.5">Oportunidades</p>
            </div>
          </div>
          {resultado.errores > 0 && (
            <p className="text-sm text-amber-600 mb-4">{resultado.errores} filas con error</p>
          )}
          {resultado.debug && (resultado.debug.contactosError || resultado.debug.oportunidadesError) && (
            <div className="text-left rounded-xl bg-red-50 border border-red-100 p-3 mb-4 text-xs text-red-700">
              {resultado.debug.contactosError && <p><strong>Error contactos:</strong> {resultado.debug.contactosError}</p>}
              {resultado.debug.oportunidadesError && <p><strong>Error oportunidades:</strong> {resultado.debug.oportunidadesError}</p>}
            </div>
          )}
          {resultado.debug && (
            <p className="text-xs text-slate-400 mb-4">
              Filas mapeadas: {resultado.debug.contactosMapeados} contactos · {resultado.debug.oportunidadesMapeadas} oportunidades
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/cuentas"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Ver Cuentas →
            </Link>
            <Link href="/dashboard/datos"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              ← Volver a Datos
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
