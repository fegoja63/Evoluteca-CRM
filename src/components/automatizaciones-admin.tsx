"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { IconPlus, IconTrash, IconBolt, IconArrowRight } from "@tabler/icons-react";
import {
  EVENTOS, ACCIONES, EVENTO_LABEL, ACCION_LABEL,
  TIPOS_TAREA, TIPO_TAREA_LABEL, DESTINATARIOS, DESTINATARIO_LABEL,
  RESPONSABLE_DUENO,
  type EventoAutomatizacion, type AccionAutomatizacion, type TipoTarea, type Destinatario,
} from "@/lib/automatizaciones";

type Config = Record<string, unknown>;
type Regla = {
  id: string;
  nombre: string;
  activa: boolean;
  evento: EventoAutomatizacion;
  etapaDestino: string | null;
  accion: AccionAutomatizacion;
  config: Config;
  vecesEjecutada: number;
  ultimaEjecucion: string | null;
};
type Etapa = { key: string; nombre: string; oculta: boolean };
type Usuario = { id: string; nombre: string };

const ETAPAS_ACTIVAS = ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"];

export function AutomatizacionesAdmin() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [creando, setCreando] = useState(false);

  // Formulario de alta
  const [nombre, setNombre] = useState("");
  const [evento, setEvento] = useState<EventoAutomatizacion>("OPORTUNIDAD_CAMBIA_ETAPA");
  const [etapaDestino, setEtapaDestino] = useState("");
  const [accion, setAccion] = useState<AccionAutomatizacion>("CREAR_TAREA");
  // Config CREAR_TAREA
  const [titulo, setTitulo] = useState("");
  const [tipoTarea, setTipoTarea] = useState<TipoTarea>("LLAMADA");
  const [diasPlazo, setDiasPlazo] = useState("3");
  const [responsable, setResponsable] = useState(RESPONSABLE_DUENO);
  // Config ENVIAR_CORREO
  const [destinatario, setDestinatario] = useState<Destinatario>("DUENO");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/automatizaciones");
    setReglas(res.ok ? await res.json() : []);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
    fetch("/api/etapas-pipeline").then(r => r.json()).then(d => setEtapas(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/usuarios").then(r => r.json()).then(d =>
      setUsuarios(Array.isArray(d) ? d.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })) : [])
    ).catch(() => {});
  }, []);

  function etapaLabel(key: string | null): string {
    if (!key) return "";
    return etapas.find(e => e.key === key)?.nombre ?? key;
  }
  function responsableLabel(r: string): string {
    if (r === RESPONSABLE_DUENO) return "el dueño del negocio";
    return usuarios.find(u => u.id === r)?.nombre ?? "un usuario";
  }

  function resumen(r: Regla): string {
    const cuando = r.evento === "OPORTUNIDAD_CAMBIA_ETAPA"
      ? (r.etapaDestino ? `Cuando una oportunidad pase a "${etapaLabel(r.etapaDestino)}"` : "Cuando una oportunidad cambie de etapa")
      : "Cuando se cree una oportunidad";
    const c = r.config as Record<string, string>;
    const entonces = r.accion === "CREAR_TAREA"
      ? `crear la tarea "${c.titulo}" a ${c.diasPlazo} día(s) para ${responsableLabel(String(c.responsable))}`
      : `enviar un correo a ${DESTINATARIO_LABEL[(c.destinatario as Destinatario)] ?? c.destinatario}`;
    return `${cuando} → ${entonces}.`;
  }

  function limpiarForm() {
    setNombre(""); setEvento("OPORTUNIDAD_CAMBIA_ETAPA"); setEtapaDestino("");
    setAccion("CREAR_TAREA"); setTitulo(""); setTipoTarea("LLAMADA"); setDiasPlazo("3");
    setResponsable(RESPONSABLE_DUENO); setDestinatario("DUENO"); setAsunto(""); setCuerpo("");
  }

  async function crear() {
    if (!nombre.trim()) { toast.error("Ponle un nombre a la automatización."); return; }
    const config = accion === "CREAR_TAREA"
      ? { titulo, tipo: tipoTarea, diasPlazo: Number(diasPlazo), responsable }
      : { destinatario, asunto, cuerpo };

    setCreando(true);
    const res = await fetch("/api/automatizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim(),
        evento,
        etapaDestino: evento === "OPORTUNIDAD_CAMBIA_ETAPA" ? (etapaDestino || null) : null,
        accion,
        config,
      }),
    });
    setCreando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear la automatización.");
      return;
    }
    limpiarForm();
    setMostrarForm(false);
    cargar();
  }

  async function toggleActiva(r: Regla) {
    const previos = reglas;
    setReglas(prev => prev.map(x => x.id === r.id ? { ...x, activa: !x.activa } : x));
    const res = await fetch(`/api/automatizaciones/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !r.activa }),
    });
    if (!res.ok) { setReglas(previos); toast.error("No se pudo actualizar."); }
  }

  async function eliminar(r: Regla) {
    if (!confirm(`¿Eliminar la automatización "${r.nombre}"?`)) return;
    const res = await fetch(`/api/automatizaciones/${r.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo eliminar."); return; }
    cargar();
  }

  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500";

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <IconBolt size={16} stroke={1.75} />Automatizaciones
        </h2>
        <button onClick={() => setMostrarForm(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700">
          {mostrarForm ? "Cancelar" : <><IconPlus size={14} stroke={2} />Nueva</>}
        </button>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Reglas del tipo <strong>&ldquo;cuando pasa X → haz Y&rdquo;</strong>. Se ejecutan solas cuando una oportunidad
        cambia de etapa o se crea (incluidos los leads que entran por la API). En los textos puedes usar{" "}
        <code className="bg-slate-100 rounded px-1">{"{oportunidad}"}</code> y{" "}
        <code className="bg-slate-100 rounded px-1">{"{cliente}"}</code>.
      </p>

      {/* Formulario de alta */}
      {mostrarForm && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Nombre de la regla</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Seguimiento tras enviar cotización" className={inputCls} />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Cuándo (evento)</label>
              <select value={evento} onChange={e => setEvento(e.target.value as EventoAutomatizacion)} className={`${inputCls} bg-white`}>
                {EVENTOS.map(ev => <option key={ev} value={ev}>{EVENTO_LABEL[ev]}</option>)}
              </select>
            </div>
            {evento === "OPORTUNIDAD_CAMBIA_ETAPA" && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">Etapa destino</label>
                <select value={etapaDestino} onChange={e => setEtapaDestino(e.target.value)} className={`${inputCls} bg-white`}>
                  <option value="">Cualquier etapa</option>
                  {(etapas.length ? etapas : ETAPAS_ACTIVAS.map(k => ({ key: k, nombre: k, oculta: false })))
                    .filter(e => !e.oculta)
                    .map(e => <option key={e.key} value={e.key}>{e.nombre}</option>)}
                </select>
              </div>
            )}

            <div className="sm:col-span-2 border-t border-slate-200 pt-3">
              <label className="mb-1 block text-xs text-slate-500">Qué hacer (acción)</label>
              <select value={accion} onChange={e => setAccion(e.target.value as AccionAutomatizacion)} className={`${inputCls} bg-white`}>
                {ACCIONES.map(ac => <option key={ac} value={ac}>{ACCION_LABEL[ac]}</option>)}
              </select>
            </div>

            {accion === "CREAR_TAREA" ? (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Título de la tarea</label>
                  <input value={titulo} onChange={e => setTitulo(e.target.value)}
                    placeholder="Ej: Llamar a {cliente} por {oportunidad}" className={inputCls} />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Tipo</label>
                  <select value={tipoTarea} onChange={e => setTipoTarea(e.target.value as TipoTarea)} className={`${inputCls} bg-white`}>
                    {TIPOS_TAREA.map(t => <option key={t} value={t}>{TIPO_TAREA_LABEL[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Plazo (días desde hoy)</label>
                  <input type="number" min={0} max={365} value={diasPlazo} onChange={e => setDiasPlazo(e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Responsable</label>
                  <select value={responsable} onChange={e => setResponsable(e.target.value)} className={`${inputCls} bg-white`}>
                    <option value={RESPONSABLE_DUENO}>El dueño del negocio</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Destinatario</label>
                  <select value={destinatario} onChange={e => setDestinatario(e.target.value as Destinatario)} className={`${inputCls} bg-white`}>
                    {DESTINATARIOS.map(d => <option key={d} value={d}>{DESTINATARIO_LABEL[d]}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Asunto</label>
                  <input value={asunto} onChange={e => setAsunto(e.target.value)}
                    placeholder="Ej: {oportunidad} entró a negociación" className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-500">Cuerpo del correo</label>
                  <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={4}
                    placeholder="Ej: El negocio {oportunidad} de {cliente} avanzó. Revisa el pipeline." className={inputCls} />
                </div>
              </>
            )}
          </div>
          <button onClick={crear} disabled={creando}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
            <IconPlus size={16} stroke={1.75} />{creando ? "Creando..." : "Crear automatización"}
          </button>
        </div>
      )}

      {/* Lista */}
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : reglas.length === 0 ? (
        <p className="text-xs text-slate-400">Aún no tienes automatizaciones. Crea la primera con &ldquo;Nueva&rdquo;.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reglas.map(r => (
            <div key={r.id} className={`rounded-xl border px-4 py-3 ${r.activa ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                    <IconBolt size={13} stroke={1.75} className="text-amber-500 shrink-0" />{r.nombre}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                    <IconArrowRight size={12} stroke={2} className="mt-0.5 shrink-0 text-slate-300" />{resumen(r)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ejecutada {r.vecesEjecutada} vez(es)
                    {r.ultimaEjecucion && ` · última: ${new Date(r.ultimaEjecucion).toLocaleDateString("es-CO")}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActiva(r)}
                    title={r.activa ? "Desactivar" : "Activar"}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${r.activa ? "bg-accent-600" : "bg-slate-300"}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${r.activa ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <button onClick={() => eliminar(r)} className="text-slate-300 hover:text-red-500 p-1" title="Eliminar">
                    <IconTrash size={15} stroke={1.75} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
