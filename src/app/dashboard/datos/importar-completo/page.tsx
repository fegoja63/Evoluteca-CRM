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
  { key: "empresa",           label: "Empresa / Cliente",      emoji: "🏢", desc: "Nombre de la empresa o cliente", requerido: true },
  { key: "contacto",          label: "Contacto / Persona",      emoji: "👤", desc: "Nombre de la persona de contacto", requerido: true },
  { key: "tituloOportunidad", label: "Tipo de negocio / evento",emoji: "◈",  desc: "Tipo de evento o nombre del negocio", requerido: true },
  { key: "etapaOportunidad",  label: "Estado / Etapa",          emoji: "🏷️", desc: "HECHO, DESCARTADO, EN PROCESO…", requerido: false },
  { key: "valorOportunidad",  label: "Valor cotizado",          emoji: "💰", desc: "Solo números (sin símbolos)", requerido: false },
  { key: "costoOportunidad",  label: "Costo del evento",        emoji: "💸", desc: "Costo interno", requerido: false },
  { key: "fechaEvento",       label: "Fecha del evento",        emoji: "📅", desc: "Fecha en que ocurre el evento", requerido: false },
  { key: "fechaCierre",       label: "Fecha de cierre",         emoji: "📆", desc: "Fecha de cierre del negocio", requerido: false },
  { key: "sede",              label: "Sede / Sala",             emoji: "📍", desc: "Lugar del evento", requerido: false },
  { key: "origenLead",        label: "Origen del lead",         emoji: "🎯", desc: "Cómo llegó este cliente", requerido: false },
  { key: "segmento",          label: "Segmento",                emoji: "👥", desc: "Tipo de cliente", requerido: false },
  { key: "emailContacto",     label: "Email del contacto",      emoji: "✉️", desc: "", requerido: false },
  { key: "telefonoContacto",  label: "Teléfono del contacto",   emoji: "📞", desc: "", requerido: false },
  { key: "cargoContacto",     label: "Cargo del contacto",      emoji: "💼", desc: "", requerido: false },
  { key: "recurrente",        label: "Recurrente",              emoji: "🔁", desc: "SI / NO", requerido: false },
];

export default function ImportarCompletoPage() {
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapeo, setMapeo] = useState<Record<string, string>>({});
  const [autoDetectados, setAutoDetectados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Columna seleccionada para ver su detalle
  const [colDetalle, setColDetalle] = useState<string | null>(null);

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

    function esColumnaNumerica(col: string): boolean {
      const vals = data.muestra.map((f) => f[col]).filter(Boolean);
      if (vals.length === 0) return false;
      const numericos = vals.filter((v) => !isNaN(Number(v.replace(/[.,\s$€£]/g, "")))).length;
      return numericos / vals.length >= 0.5;
    }

    const autoMapeo: Record<string, string> = {};
    data.columnas.forEach((col) => {
      const norm = col.toLowerCase().replace(/[^a-z0-9]/g, "");
      if ((norm.includes("cliente") || norm.includes("empresa") || norm.includes("razon")) && !autoMapeo["empresa"]) {
        autoMapeo["empresa"] = col;
      } else if (norm.includes("contacto") && !autoMapeo["contacto"]) {
        autoMapeo["contacto"] = col;
      } else if ((norm.includes("email") || norm.includes("correo")) && !autoMapeo["emailContacto"]) {
        autoMapeo["emailContacto"] = col;
      } else if ((norm.includes("telefono") || norm.includes("celular")) && !autoMapeo["telefonoContacto"]) {
        autoMapeo["telefonoContacto"] = col;
      } else if ((norm.includes("cargo") || norm.includes("puesto")) && !autoMapeo["cargoContacto"]) {
        autoMapeo["cargoContacto"] = col;
      } else if ((norm.includes("estado") || norm.includes("etapa") || norm.includes("status")) && !autoMapeo["etapaOportunidad"]) {
        autoMapeo["etapaOportunidad"] = col;
      } else if (norm.includes("costo") && esColumnaNumerica(col) && !autoMapeo["costoOportunidad"]) {
        autoMapeo["costoOportunidad"] = col;
      } else if ((norm.includes("valor") || norm.includes("precio") || norm.includes("monto")) && esColumnaNumerica(col) && !autoMapeo["valorOportunidad"]) {
        autoMapeo["valorOportunidad"] = col;
      } else if ((norm.includes("fechaevento") || (norm.includes("fecha") && norm.includes("event"))) && !autoMapeo["fechaEvento"]) {
        autoMapeo["fechaEvento"] = col;
      } else if ((norm.includes("fechacierre") || (norm.includes("fecha") && norm.includes("cierr"))) && !autoMapeo["fechaCierre"]) {
        autoMapeo["fechaCierre"] = col;
      } else if ((norm.includes("tipoevento") || (norm.includes("tipo") && norm.includes("event"))) && !autoMapeo["tituloOportunidad"]) {
        autoMapeo["tituloOportunidad"] = col;
      } else if ((norm.includes("sede") || norm.includes("sala") || norm.includes("lugar")) && !autoMapeo["sede"]) {
        autoMapeo["sede"] = col;
      } else if ((norm.includes("origen") || norm.includes("lead") || norm.includes("fuente")) && !autoMapeo["origenLead"]) {
        autoMapeo["origenLead"] = col;
      } else if (norm.includes("segmento") && !autoMapeo["segmento"]) {
        autoMapeo["segmento"] = col;
      } else if ((norm.includes("recurrente") || norm.includes("recurrent")) && !autoMapeo["recurrente"]) {
        autoMapeo["recurrente"] = col;
      }
    });

    setMapeo(autoMapeo);
    setAutoDetectados(new Set(Object.keys(autoMapeo)));
    setCargando(false);
    setPaso(2);
  }

  async function handleImportar() {
    if (!archivo || !preview) return;
    setCargando(true);
    // Las columnas no mapeadas van como extras
    const colsUsadasArr = Object.values(mapeo).filter(Boolean);
    const colsExtra = preview.columnas.filter(c => !colsUsadasArr.includes(c));
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

  const columnasMapeadas = new Set(Object.values(mapeo).filter(Boolean));
  const camposRequeridos = CAMPOS.filter(c => c.requerido);
  const faltanRequeridos = camposRequeridos.filter(c => !mapeo[c.key]).map(c => c.label);

  // Muestras de valores de una columna
  function muestrasDeCol(col: string): string[] {
    if (!preview) return [];
    const vals = preview.muestra.map(f => f[col]).filter(Boolean);
    return vals.filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  }

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
        {[{ n: 1, label: "Subir archivo" }, { n: 2, label: "Asignar columnas" }, { n: 3, label: "Resultado" }].map((p, i) => (
          <div key={p.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${paso >= p.n ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{p.n}</div>
            <span className={`text-sm ${paso >= p.n ? "text-slate-800 font-medium" : "text-slate-400"}`}>{p.label}</span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* ── PASO 1 ── */}
      {paso === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Sube tu archivo Excel</h2>
          <p className="text-xs text-slate-400 mb-4">Puede tener cualquier formato de columnas. En el siguiente paso verás los datos y asignarás cada columna al campo del CRM.</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 mb-5" />
          <button onClick={handlePrevisualizar} disabled={cargando}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Leyendo archivo..." : "Continuar →"}
          </button>
        </div>
      )}

      {/* ── PASO 2 ── */}
      {paso === 2 && preview && (
        <div className="flex gap-6">
          {/* Panel izquierdo: columnas del Excel */}
          <div className="w-72 shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Columnas de tu Excel</p>
                <button onClick={() => setPaso(1)} className="text-xs text-slate-400 hover:underline">Cambiar archivo</button>
              </div>
              <p className="text-xs text-slate-400 mb-3">{preview.totalFilas} filas · {preview.columnas.length} columnas. Haz clic en cualquier columna para ver sus datos.</p>
              <div className="flex flex-col gap-1">
                {preview.columnas.map(col => {
                  const campo = CAMPOS.find(c => mapeo[c.key] === col);
                  const mapeada = !!campo;
                  const activa = colDetalle === col;
                  return (
                    <button
                      key={col}
                      onClick={() => setColDetalle(activa ? null : col)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${activa ? "bg-blue-600 text-white" : mapeada ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{col}</span>
                        {mapeada && !activa && <span className="shrink-0 text-emerald-600">✓</span>}
                      </div>
                      {mapeada && !activa && (
                        <p className="text-xs text-emerald-600 truncate">→ {campo!.emoji} {campo!.label}</p>
                      )}
                      {activa && (
                        <div className="mt-1 space-y-0.5">
                          {muestrasDeCol(col).map((v, i) => (
                            <p key={i} className="text-blue-100 truncate">{v}</p>
                          ))}
                        </div>
                      )}
                      {!mapeada && !activa && (
                        <p className="text-slate-400 truncate">{muestrasDeCol(col)[0] ?? "—"}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Columnas no mapeadas van como extras */}
              {preview.columnas.filter(c => !columnasMapeadas.has(c)).length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-2">
                  <p className="text-xs text-slate-500 font-medium mb-1">Sin mapear → se guardan como datos extras:</p>
                  <div className="flex flex-wrap gap-1">
                    {preview.columnas.filter(c => !columnasMapeadas.has(c)).map(c => (
                      <span key={c} className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho: campos del CRM */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">¿Qué columna de tu Excel corresponde a cada campo del CRM?</h2>
              <p className="text-xs text-slate-400 mb-4">Los campos marcados con <span className="text-red-500">*</span> son obligatorios. Haz clic en una columna de la izquierda para ver sus valores.</p>

              {/* Campos obligatorios */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Campos obligatorios</p>
                <div className="flex flex-col gap-3">
                  {CAMPOS.filter(c => c.requerido).map(campo => {
                    const mapeado = !!mapeo[campo.key];
                    const autoDetectado = autoDetectados.has(campo.key);
                    const muestras = mapeado ? muestrasDeCol(mapeo[campo.key]) : [];
                    return (
                      <div key={campo.key} className={`rounded-xl border p-3 ${!mapeado ? "border-red-300 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-semibold text-slate-800">
                            {campo.emoji} {campo.label} <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {autoDetectado && mapeado && <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">✓ Auto</span>}
                          </div>
                        </div>
                        {campo.desc && <p className="text-xs text-slate-500 mb-2">{campo.desc}</p>}
                        <select
                          value={mapeo[campo.key] ?? ""}
                          onChange={e => {
                            const nueva = { ...mapeo };
                            if (e.target.value) nueva[campo.key] = e.target.value;
                            else delete nueva[campo.key];
                            setMapeo(nueva);
                          }}
                          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white ${!mapeado ? "border-red-300" : "border-emerald-300"}`}
                        >
                          <option value="">— Seleccionar columna —</option>
                          {preview.columnas.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {!mapeado && <p className="text-xs text-red-600 mt-1">⚠ Este campo es obligatorio para importar</p>}
                        {muestras.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-slate-400">Datos reales:</span>
                            {muestras.map((v, i) => (
                              <span key={i} className="text-xs bg-white border border-emerald-200 rounded px-1.5 py-0.5 text-slate-700 font-medium">{v}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Campos opcionales */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Campos opcionales</p>
                <div className="grid grid-cols-2 gap-2">
                  {CAMPOS.filter(c => !c.requerido).map(campo => {
                    const mapeado = !!mapeo[campo.key];
                    const muestras = mapeado ? muestrasDeCol(mapeo[campo.key]) : [];
                    return (
                      <div key={campo.key} className={`rounded-xl border p-2.5 ${mapeado ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50"}`}>
                        <label className="text-xs font-medium text-slate-700 block mb-1.5">{campo.emoji} {campo.label}</label>
                        <select
                          value={mapeo[campo.key] ?? ""}
                          onChange={e => {
                            const nueva = { ...mapeo };
                            if (e.target.value) nueva[campo.key] = e.target.value;
                            else delete nueva[campo.key];
                            setMapeo(nueva);
                          }}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500 bg-white"
                        >
                          <option value="">— No mapear —</option>
                          {preview.columnas.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {muestras.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1 truncate">Ej: {muestras.slice(0, 2).join(" · ")}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Botón importar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              {faltanRequeridos.length > 0 ? (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-3">
                  <p className="text-sm font-semibold text-red-700 mb-1">Faltan campos obligatorios:</p>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {faltanRequeridos.map(l => <li key={l}>{l}</li>)}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-3">
                  <p className="text-sm font-semibold text-emerald-700 mb-1">✓ Todo listo para importar</p>
                  <p className="text-xs text-emerald-600">
                    Se crearán empresas, contactos y oportunidades a partir de <strong>{preview.totalFilas} filas</strong>.
                    Las columnas no mapeadas se guardan como datos extras.
                  </p>
                </div>
              )}
              <button
                onClick={handleImportar}
                disabled={cargando || faltanRequeridos.length > 0}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cargando ? "Importando... esto puede tomar unos segundos" : `↑ Importar ${preview.totalFilas} filas al CRM`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 3 ── */}
      {paso === 3 && resultado && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 bg-emerald-50">✅</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Importación completada</h2>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{resultado.empresasCreadas}</p>
              <p className="text-xs text-blue-500 mt-0.5">Cuentas nuevas</p>
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
          {resultado.debug && (resultado.debug.contactosError || resultado.debug.oportunidadesError) && (
            <div className="text-left rounded-xl bg-red-50 border border-red-100 p-3 mb-4 text-xs text-red-700">
              {resultado.debug.contactosError && <p><strong>Error contactos:</strong> {resultado.debug.contactosError}</p>}
              {resultado.debug.oportunidadesError && <p><strong>Error oportunidades:</strong> {resultado.debug.oportunidadesError}</p>}
            </div>
          )}
          {resultado.debug && (
            <p className="text-xs text-slate-400 mb-4">
              {resultado.debug.contactosMapeados} contactos · {resultado.debug.oportunidadesMapeadas} oportunidades procesadas
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link href="/dashboard/cuentas" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Ver Cuentas →</Link>
            <button onClick={() => { setPaso(1); setResultado(null); setPreview(null); setMapeo({}); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
