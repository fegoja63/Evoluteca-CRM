"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MoneyInput } from "@/components/money-input";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";
import { NotasRapidas } from "@/components/notas-rapidas";
import { guardarJson } from "@/lib/guardar";
import { Adjuntos } from "@/components/adjuntos";
import { CamposPersonalizadosForm } from "@/components/campos-personalizados-form";
import { CamposPersonalizadosVista } from "@/components/campos-personalizados-vista";
import { CorreosPanel } from "@/components/correos-panel";
import { CoachObjecionesIA } from "@/components/coach-objeciones-ia";
import { PanelPostventa } from "@/components/panel-postventa";
import { MinutasIA } from "@/components/minutas-ia";
import type { EtapaPostventa } from "@prisma/client";
import { esClaveCampoPersonalizado } from "@/lib/campos-personalizados";
import { estadoComercial, ultimoMovimientoDe, tieneProximoPasoDe } from "@/lib/estado-comercial";
import {
  IconAlertTriangle, IconHistory, IconTarget, IconTrophy, IconX, IconArrowRight,
  IconMoodSad, IconBolt, IconPhone, IconMail, IconPlus, IconPencil, IconTrash, IconFilePlus,
} from "@tabler/icons-react";
import { numeroCotizacion } from "@/lib/cotizaciones";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { SkeletonDetalle } from "@/components/ui/estados";
import { useEscape } from "@/lib/use-escape";
import { mapaEtapas } from "@/lib/etapas-color";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  motivoPerdida: string | null;
  notas: string | null;
  creadoEn: string;
  fechaCierre: string | null;
  probabilidad: number | null;
  salonId: string | null;
  sede: string | null;
  fechaEvento: string | null;
  extras: Record<string, string> | null;
  empresa:  { id: string; nombre: string; sector: string | null; telefono: string | null } | null;
  contacto: { id: string; nombre: string; email: string | null; telefono: string | null; cargo: string | null } | null;
  actividades: { id: string; tipo: string; titulo: string; fecha: string; completada: boolean; notas: string | null }[];
  cambiosEtapa: { id: string; etapaAnterior: string; etapaNueva: string; creadoEn: string; creadoByNombre: string | null }[];
  correos?: { fecha: string }[];
  // Postventa (módulo opcional)
  postventaEtapa?: EtapaPostventa | null;
  fechaRenovacion?: string | null;
  origenRenovacion?: { id: string; titulo: string } | null;
  renovaciones?: { id: string; titulo: string; etapa: string }[];
  cotizaciones?: { id: string; numero: number; numeroManual: string | null; estado: string; fechaValidez: string | null; creadoEn: string }[];
};

const ESTADO_COT: Record<string, { label: string; clase: string }> = {
  BORRADOR:  { label: "Borrador",  clase: "bg-slate-100 text-slate-600" },
  ENVIADA:   { label: "Enviada",   clase: "bg-brand-50 text-brand-700" },
  ACEPTADA:  { label: "Aceptada",  clase: "bg-emerald-50 text-emerald-700" },
  RECHAZADA: { label: "Rechazada", clase: "bg-red-50 text-red-600" },
};

// El nombre visible de cada etapa es configurable por tenant (Configuración →
// Etapas del pipeline); el "key" y el color quedan fijos en código.
const ETAPA_COLOR: Record<string, string> = mapaEtapas("insignia");

const ETAPAS_DEFECTO = [
  { key: "PROSPECTO",   label: "Prospecto" },
  { key: "CALIFICADO",  label: "Calificado" },
  { key: "PROPUESTA",   label: "Cotización" },
  { key: "NEGOCIACION", label: "Negociación" },
  { key: "GANADA",      label: "Ganada" },
  { key: "PERDIDA",     label: "Perdida" },
];

const ETAPA_ORDEN = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION","GANADA","PERDIDA"];

type Salon = { id: string; nombre: string; capacidad: number | null };
type Disponibilidad = { aceptadas: { id: string; empresa: { nombre: string } | null }[]; pendientes: { id: string; empresa: { nombre: string } | null }[] };

export default function OportunidadDetallePage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;
  const { data: session } = useSession();
  const esAdministrador = session?.user?.rol === "ADMINISTRADOR";

  const [op, setOp] = useState<Oportunidad | null>(null);
  // La oportunidad no existe, fue borrada, o es de otro tenant (API 404/403):
  // en vez de reventar la pantalla, se muestra un mensaje de "no encontrada".
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [ETAPAS, setETAPAS] = useState(ETAPAS_DEFECTO.map(e => ({ ...e, color: ETAPA_COLOR[e.key] })));
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ titulo: "", valor: "", etapa: "", notas: "", fechaCierre: "", probabilidad: "", salonId: "", sede: "", fechaEvento: "", horaInicio: "", horaFin: "" });
  const [camposValores, setCamposValores] = useState<Record<string, string>>({});
  const [modalPerdida, setModalPerdida] = useState(false);
  const [motivoPerdida, setMotivoPerdida] = useState("");
  const [otroMotivo, setOtroMotivo] = useState("");
  useEscape(modalPerdida, () => { setModalPerdida(false); setMotivoPerdida(""); setOtroMotivo(""); });
  const [salones, setSalones] = useState<Salon[]>([]);
  const [moduloSalones, setModuloSalones] = useState(false);
  const [moduloObjeciones, setModuloObjeciones] = useState(false);
  const [moduloPostventa, setModuloPostventa] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const disponibilidadClaveRef = useRef("");
  // Edición rápida de la fecha de cierre desde el recuadro (sin abrir Editar).
  const [editandoCierre, setEditandoCierre] = useState(false);
  const [guardandoCierre, setGuardandoCierre] = useState(false);
  // Umbral de "días sin movimiento" del tenant (default 14). Lo lee la misma
  // config que el Pipeline, para que el estado comercial coincida en ambos.
  const [diasEstancamiento, setDiasEstancamiento] = useState(14);
  const [guardandoAccion, setGuardandoAccion] = useState(false);
  // Pestaña del centro y "+ Actividad" (vuelve a montar el formulario ya abierto).
  const [tab, setTab] = useState<"resumen" | "actividad" | "cotizaciones" | "archivos">("resumen");
  const [quickKey, setQuickKey] = useState(0);

  const MOTIVOS_PERDIDA = [
    "Precio muy alto",
    "Eligió a la competencia",
    "El evento fue cancelado",
    "Sin respuesta del cliente",
    "Presupuesto insuficiente",
    "Fuera de fechas disponibles",
    "Otro",
  ];

  async function cargar() {
    const res = await fetch(`/api/oportunidades/${id}`);
    if (!res.ok) {
      // El cuerpo trae { error } — NO se guarda como si fuera la oportunidad,
      // porque entonces op.etapa sería undefined y el render reventaría.
      setNoEncontrada(true);
      setOp(null);
      return;
    }
    const data = await res.json();
    setNoEncontrada(false);
    setOp(data);
    setForm({
      titulo: data.titulo, valor: data.valor ?? "", etapa: data.etapa, notas: data.notas ?? "",
      fechaCierre: data.fechaCierre ? data.fechaCierre.substring(0, 10) : "",
      probabilidad: String(data.probabilidad ?? 50),
      salonId: data.salonId ?? "", sede: data.sede ?? "",
      fechaEvento: data.fechaEvento ? data.fechaEvento.substring(0, 10) : "",
      horaInicio: data.horaInicio ?? "", horaFin: data.horaFin ?? "",
    });
    const cp: Record<string, string> = {};
    for (const [k, v] of Object.entries((data.extras ?? {}) as Record<string, unknown>)) {
      if (esClaveCampoPersonalizado(k)) cp[k] = String(v ?? "");
    }
    setCamposValores(cp);
  }

  useEffect(() => { cargar(); }, [id]);

  // "Actuar ahora": crea una tarea de seguimiento para hoy a partir de la acción
  // recomendada por el estado comercial. Reusa el POST de actividades (la misma
  // creación que hacen las automatizaciones), sin motor nuevo.
  async function actuarAhora() {
    if (!op || guardandoAccion) return;
    const estado = estadoComercial(
      { etapa: op.etapa, probabilidad: op.probabilidad, ultimoMovimiento: ultimoMovimientoDe(op), creadoEn: op.creadoEn, fechaCierre: op.fechaCierre, tieneProximoPaso: tieneProximoPasoDe(op.actividades) },
      diasEstancamiento,
    );
    if (!estado) return;
    setGuardandoAccion(true);
    try {
      const res = await fetch("/api/actividades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: estado.accionTipo,
          titulo: `${estado.accion}: ${op.titulo}`,
          fecha: new Date().toISOString(),
          oportunidadId: op.id,
          empresaId: op.empresa?.id ?? undefined,
          contactoId: op.contacto?.id ?? undefined,
          notas: `Seguimiento sugerido por el estado "${estado.label}" (${estado.razon}).`,
        }),
      });
      if (!res.ok) { toast.error("No se pudo crear el seguimiento"); return; }
      toast.success("Seguimiento creado para hoy");
      await cargar();
    } catch {
      toast.error("No se pudo crear el seguimiento");
    } finally {
      setGuardandoAccion(false);
    }
  }

  // Guarda la fecha de cierre editada desde el recuadro "Cierre estimado".
  async function guardarCierreRapido(valor: string) {
    if (!op) return;
    setGuardandoCierre(true);
    try {
      await guardarJson(`/api/oportunidades/${op.id}`, "PATCH", { fechaCierre: valor || null });
      setEditandoCierre(false);
      await cargar();
    } catch {
      toast.error("No se pudo guardar la fecha de cierre. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setGuardandoCierre(false);
    }
  }

  useEffect(() => {
    fetch("/api/etapas-pipeline").then(r => r.json()).then(data => {
      if (!Array.isArray(data) || data.length === 0) return;
      setETAPAS(
        data
          .filter((e: { oculta?: boolean }) => !e.oculta)
          .map((e: { key: string; nombre: string }) => ({ key: e.key, label: e.nombre, color: ETAPA_COLOR[e.key] }))
      );
    });
  }, []);

  useEffect(() => {
    fetch("/api/configuracion").then(r => r.json()).then(config => {
      const salonesActivo = !!config?.modulos?.salones;
      setModuloSalones(salonesActivo);
      setModuloObjeciones(!!config?.modulos?.objeciones);
      setModuloPostventa(!!config?.modulos?.postventa);
      setDiasEstancamiento(Number(config?.diasEstancamiento) || 14);
      if (salonesActivo) {
        fetch("/api/salones").then(r => r.json()).then(s => setSalones(Array.isArray(s) ? s : []));
      }
    });
  }, []);

  useEffect(() => {
    if (!form.salonId || !form.fechaEvento) { setDisponibilidad(null); return; }
    const clave = `${form.salonId}|${form.fechaEvento}|${form.horaInicio}|${form.horaFin}`;
    const t = setTimeout(async () => {
      disponibilidadClaveRef.current = clave;
      const params = new URLSearchParams({ salonId: form.salonId, fecha: form.fechaEvento });
      if (form.horaInicio && form.horaFin) { params.set("horaInicio", form.horaInicio); params.set("horaFin", form.horaFin); }
      const res = await fetch(`/api/salones/disponibilidad?${params.toString()}`);
      const data = await res.json();
      if (disponibilidadClaveRef.current === clave) setDisponibilidad(data);
    }, 300);
    return () => clearTimeout(t);
  }, [form.salonId, form.fechaEvento, form.horaInicio, form.horaFin]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`/api/oportunidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo, valor: form.valor || null, etapa: form.etapa, notas: form.notas || null,
          fechaCierre: form.fechaCierre || null, probabilidad: Number(form.probabilidad),
          salonId: form.salonId || null, sede: form.sede || null, fechaEvento: form.fechaEvento || null,
          horaInicio: form.horaInicio || null, horaFin: form.horaFin || null,
          extras: camposValores,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Se mantiene el modo edición abierto con lo que el usuario escribió,
        // para que no pierda sus cambios si el guardado falló.
        toast.error(data.error ?? "No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
        setGuardando(false);
        return;
      }
    } catch {
      toast.error("No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
      setGuardando(false);
      return;
    }
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEtapa(etapa: string) {
    if (etapa === "PERDIDA" && op?.etapa !== "PERDIDA") {
      setModalPerdida(true);
      return;
    }
    let cotizacionNumero: string | undefined;
    if (op && (op.etapa === "PROSPECTO" || op.etapa === "CALIFICADO") && etapa !== op.etapa) {
      const cot = prompt("Número de cotización (opcional):");
      if (cot && cot.trim()) cotizacionNumero = cot.trim();
    }
    try {
      const res = await fetch(`/api/oportunidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa, ...(cotizacionNumero ? { cotizacionNumero } : {}) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo cambiar la etapa. Revisa tu conexión e inténtalo de nuevo.");
    }
    cargar();
  }

  async function confirmarPerdida() {
    const motivo = motivoPerdida === "Otro" ? otroMotivo : motivoPerdida;
    try {
      const res = await fetch(`/api/oportunidades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa: "PERDIDA", motivoPerdida: motivo || "" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
    }
    setModalPerdida(false);
    setMotivoPerdida("");
    setOtroMotivo("");
    cargar();
  }

  async function eliminar() {
    if (!esAdministrador) { toast.error("Solicita al Administrador borrar esta oportunidad."); return; }
    if (!confirm("¿Eliminar esta oportunidad? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/oportunidades/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    router.push("/dashboard/pipeline");
  }

  function fmt(v: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }

  if (noEncontrada) return (
    <div className="max-w-lg mx-auto mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <IconAlertTriangle size={32} stroke={1.75} className="mx-auto text-amber-400" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Oportunidad no encontrada</h1>
      <p className="mt-1 text-sm text-slate-500">
        No existe, fue eliminada, o no tienes acceso a ella.
      </p>
      <Link href="/dashboard/pipeline"
        className={boton("secundario", "md", "mt-4 inline-block")}>
        ← Volver al Pipeline
      </Link>
    </div>
  );

  if (!op) return (
    <SkeletonDetalle />
  );

  function formatearValorExtra(k: string, v: string): string {
    if (k === "MES" && v.includes("T00:00")) {
      // Medianoche UTC del día 1 del mes importado — se fuerza timeZone: "UTC"
      // para no correr un mes atrás en timezones detrás de UTC (Colombia UTC-5).
      const d = new Date(v);
      return d.toLocaleDateString("es-CO", { month: "short", year: "numeric", timeZone: "UTC" });
    }
    return v;
  }

  const extrasRelevantes = op.extras ? Object.entries(op.extras).filter(([k]) =>
    !["AÑO","MES ELABORACION","ELABORACIÓN"].includes(k) && !esClaveCampoPersonalizado(k)
  ) : [];

  // Teléfono y correo para los botones del encabezado (contacto primero).
  const telefono = op.contacto?.telefono ?? op.empresa?.telefono ?? null;
  const email = op.contacto?.email ?? null;
  const activa = !["GANADA", "PERDIDA"].includes(op.etapa);
  const cierreVencido = !!op.fechaCierre && new Date(op.fechaCierre) < new Date() && activa;
  const ponderado = op.valor ? Number(op.valor) * ((op.probabilidad ?? 50) / 100) : null;
  // Próxima actividad pendiente (la más cercana de hoy en adelante; si no hay, la vencida más reciente).
  const pendientes = op.actividades.filter(a => !a.completada).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proxima = pendientes.find(a => new Date(a.fecha) >= new Date(new Date().toDateString())) ?? pendientes[pendientes.length - 1] ?? null;
  const cotizaciones = op.cotizaciones ?? [];
  // Etapas del embudo en orden (la barra de pasos); Ganada y Perdida van como cierre.
  const pasos = ETAPAS.filter(e => e.key !== "GANADA" && e.key !== "PERDIDA");
  const idxActual = pasos.findIndex(e => e.key === op.etapa);

  function abrirNuevaActividad() {
    setTab("actividad");
    setQuickKey(k => k + 1);
    setTimeout(() => document.getElementById("tab-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const TABS: { key: typeof tab; label: string; n?: number }[] = [
    { key: "resumen", label: "Resumen" },
    { key: "actividad", label: "Actividad", n: op.actividades.length },
    { key: "cotizaciones", label: "Cotizaciones", n: cotizaciones.length },
    { key: "archivos", label: "Archivos" },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link href="/dashboard/pipeline" className="hover:text-brand-600 transition-colors">← Pipeline</Link>
        <span>/</span>
        <span className="text-slate-600 truncate max-w-xs">{op.titulo}</span>
      </div>

      {/* ── ENCABEZADO: nombre, etapa como pasos, 5 datos clave y acciones ── */}
      <div className={tarjeta("p-6 mb-5")}>
        {editando ? (
          <form onSubmit={handleGuardar}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Título *</label>
                <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                  className={campo("md", "w-full")} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Valor (COP)</label>
                <MoneyInput value={form.valor} onChange={v => setForm({...form, valor: v})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Etapa</label>
                <select value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}
                  className={campo("md", "w-full")}>
                  {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha de cierre estimada</label>
                <input type="date" value={form.fechaCierre} onChange={e => setForm({...form, fechaCierre: e.target.value})}
                  className={campo("md", "w-full")} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Probabilidad: <span className="font-semibold text-brand-600">{form.probabilidad}%</span>
                </label>
                <input type="range" min="0" max="100" step="5" value={form.probabilidad}
                  onChange={e => setForm({...form, probabilidad: e.target.value})}
                  className="w-full accent-brand-600 mt-2" />
              </div>
              {moduloSalones && (
                <div className="col-span-2">
                  <label className="text-xs text-slate-500 mb-1 block">Salón</label>
                  <select value={form.salonId} onChange={e => setForm({...form, salonId: e.target.value})}
                    className={campo("md", "w-full")}>
                    <option value="">— Sin salón del catálogo —</option>
                    {salones.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.capacidad ? ` (${s.capacidad} pers.)` : ""}</option>)}
                  </select>
                  {disponibilidad && disponibilidad.aceptadas.length > 0 && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <p className="font-semibold flex items-center gap-1"><IconAlertTriangle size={13} stroke={1.75} />Ese salón ya tiene una cotización aceptada ese día:</p>
                      <ul className="mt-1 list-disc list-inside">
                        {disponibilidad.aceptadas.map(c => <li key={c.id}>{c.empresa?.nombre ?? "Sin empresa"}</li>)}
                      </ul>
                    </div>
                  )}
                  {disponibilidad && disponibilidad.aceptadas.length === 0 && disponibilidad.pendientes.length > 0 && (
                    <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {disponibilidad.pendientes.length} cotización(es) pendiente(s) también interesada(s) en esa fecha y salón.
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Sede / Lugar</label>
                <input value={form.sede} onChange={e => setForm({...form, sede: e.target.value})}
                  placeholder="Teatro Nacional, Sala A..."
                  className={campo("md", "w-full")} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha del evento</label>
                <input type="date" value={form.fechaEvento} onChange={e => setForm({...form, fechaEvento: e.target.value})}
                  className={campo("md", "w-full")} />
              </div>
              {moduloSalones && form.salonId && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Horario (opcional)</label>
                  <div className="flex items-center gap-2">
                    <input type="time" value={form.horaInicio} onChange={e => setForm({...form, horaInicio: e.target.value})}
                      className={campo("md", "w-full")} />
                    <span className="text-slate-400 text-xs">a</span>
                    <input type="time" value={form.horaFin} onChange={e => setForm({...form, horaFin: e.target.value})}
                      className={campo("md", "w-full")} />
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={3} className={campo("md", "w-full")} />
              </div>
              <CamposPersonalizadosForm entidad="OPORTUNIDAD" valores={camposValores}
                onChange={(clave, valor) => setCamposValores(prev => ({ ...prev, [clave]: valor }))} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={guardando}
                className={boton("primario", "md")}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
              <button type="button" onClick={() => setEditando(false)}
                className={boton("secundario", "md")}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900">{op.titulo}</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {op.empresa?.nombre ?? "Sin cliente"}{op.contacto ? ` · ${op.contacto.nombre}` : ""}
                  {op.extras?.["COTIZACION NUMERO"] && <span className="text-slate-400"> · {op.extras["COTIZACION NUMERO"]}</span>}
                </p>
                {op.origenRenovacion && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    Renovación de <Link href={`/dashboard/pipeline/${op.origenRenovacion.id}`} className="text-brand-600 hover:underline">{op.origenRenovacion.titulo}</Link>
                  </p>
                )}
                {op.etapa === "PERDIDA" && op.motivoPerdida && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <IconMoodSad size={14} stroke={1.75} />Motivo: {op.motivoPerdida}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {telefono && (
                  <a href={`tel:${telefono.replace(/\s+/g, "")}`} title={`Llamar ${telefono}`} className={boton("secundario", "md")}>
                    <IconPhone size={16} stroke={1.75} />Llamar
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} title={`Escribir a ${email}`} className={boton("secundario", "md")}>
                    <IconMail size={16} stroke={1.75} />Correo
                  </a>
                )}
                <button type="button" onClick={abrirNuevaActividad} className={boton("primario", "md")}>
                  <IconPlus size={16} stroke={2} />Actividad
                </button>
                <button type="button" onClick={() => setEditando(true)} className={boton("fantasma", "md")} title="Editar oportunidad">
                  <IconPencil size={16} stroke={1.75} />Editar
                </button>
                <button type="button" onClick={eliminar} title="Eliminar oportunidad"
                  className="rounded-xl px-2.5 py-2 text-sm text-red-500 hover:bg-red-50">
                  <IconTrash size={16} stroke={1.75} />
                </button>
              </div>
            </div>

            {/* Etapa como barra de pasos: un clic mueve el negocio a esa etapa. */}
            <div className="mb-5">
              {/* En pantallas angostas: las etapas en una fila y Ganada/Perdida debajo. */}
              <div className="flex flex-wrap items-stretch gap-1" role="list" aria-label="Etapa del negocio">
                <div className="grid flex-1 basis-full gap-1 sm:basis-0"
                  style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
                {pasos.map((e, i) => {
                  const actual = e.key === op.etapa;
                  const hecho = activa ? i < idxActual : op.etapa === "GANADA";
                  return (
                    <button key={e.key} type="button" role="listitem" aria-current={actual ? "step" : undefined}
                      onClick={() => cambiarEtapa(e.key)} title={`Mover a ${e.label}`}
                      className={`min-w-0 rounded-lg px-1 py-2 text-center text-2xs font-semibold transition-colors sm:text-xs ${
                        actual ? "bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1"
                          : hecho ? "bg-brand-100 text-brand-800 hover:bg-brand-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}>
                      <span className="block truncate">{e.label}</span>
                    </button>
                  );
                })}
                </div>
                <span className="mx-1 hidden w-px self-stretch bg-slate-200 sm:block" aria-hidden />
                <div className="flex basis-full gap-1 sm:basis-auto">
                {ETAPAS.filter(e => e.key === "GANADA" || e.key === "PERDIDA").map(e => (
                  <button key={e.key} type="button" onClick={() => cambiarEtapa(e.key)} title={`Marcar como ${e.label}`}
                    aria-current={op.etapa === e.key ? "step" : undefined}
                    className={`flex-1 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:flex-none ${
                      op.etapa === e.key
                        ? (e.key === "GANADA" ? "bg-emerald-600 text-white" : "bg-slate-500 text-white")
                        : (e.key === "GANADA" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200")
                    }`}>
                    {e.label}
                  </button>
                ))}
                </div>
              </div>
            </div>

            {/* 5 datos clave */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-400 mb-1">Valor cotizado</p>
                <p className="text-base font-bold text-emerald-700">{op.valor ? fmt(Number(op.valor)) : "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-400 mb-1">Probabilidad</p>
                <p className="text-base font-bold text-brand-600">{op.probabilidad ?? 50}%</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5" title="Valor × probabilidad">
                <p className="text-xs text-slate-400 mb-1">Ponderado</p>
                <p className="text-base font-bold text-slate-800">{ponderado !== null ? fmt(ponderado) : "—"}</p>
              </div>
              <div className={`rounded-xl p-3.5 ${cierreVencido ? "bg-red-50 ring-1 ring-red-200" : "bg-slate-50"}`}>
                <p className={`text-xs mb-1 ${cierreVencido ? "text-red-600 font-semibold" : "text-slate-400"}`}>{cierreVencido ? "Cierre vencido" : "Cierre estimado"}</p>
                {editandoCierre ? (
                  <input
                    type="date"
                    autoFocus
                    disabled={guardandoCierre}
                    defaultValue={op.fechaCierre ? new Date(op.fechaCierre).toISOString().substring(0, 10) : ""}
                    onFocus={e => { try { (e.target as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* el usuario abre el calendario con un clic */ } }}
                    onChange={e => guardarCierreRapido(e.target.value)}
                    onBlur={() => setEditandoCierre(false)}
                    className="w-full rounded-lg border border-brand-300 bg-white px-2 py-1 text-sm font-semibold text-slate-800 outline-none focus:border-brand-500"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditandoCierre(true)}
                    title="Haz clic para poner o cambiar la fecha de cierre"
                    className={`text-sm font-semibold hover:text-brand-600 transition-colors ${cierreVencido ? "text-red-700" : "text-slate-800"}`}
                  >
                    {op.fechaCierre
                      ? new Date(op.fechaCierre).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric", timeZone: "UTC" })
                      : <span className="text-brand-600">＋ Poner fecha</span>}
                  </button>
                )}
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5">
                <p className="text-xs text-slate-400 mb-1">Creada el</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(op.creadoEn).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
                </p>
              </div>
            </div>

            {/* Estado comercial: qué está pasando, por qué y qué hacer ahora.
                Solo para negocios activos (estadoComercial devuelve null en
                Ganada/Perdida). */}
            {(() => {
              const estado = estadoComercial(
                { etapa: op.etapa, probabilidad: op.probabilidad, ultimoMovimiento: ultimoMovimientoDe(op), creadoEn: op.creadoEn, fechaCierre: op.fechaCierre, tieneProximoPaso: tieneProximoPasoDe(op.actividades) },
                diasEstancamiento,
              );
              if (!estado) return null;
              return (
                <div className={`rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-3 ${estado.borde}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${estado.badge}`}>
                        {(estado.clave === "riesgo" || estado.clave === "atencion") && <IconAlertTriangle size={12} stroke={2} />}
                        {estado.label}
                      </span>
                      <span className="text-sm text-slate-500">{estado.razon}</span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-700">
                      Acción recomendada: <span className="text-slate-900">{estado.accion}</span>
                    </p>
                  </div>
                  <button type="button" onClick={actuarAhora} disabled={guardandoAccion}
                    className={boton("marca", "md", "shrink-0")}>
                    <IconBolt size={16} stroke={2} />{guardandoAccion ? "Creando…" : "Actuar ahora"}
                  </button>
                </div>
              );
            })()}

            {/* Postventa: solo negocios ganados y con el módulo activo. */}
            {moduloPostventa && op.etapa === "GANADA" && (
              <PanelPostventa
                key={`${op.postventaEtapa ?? "fuera"}-${op.fechaRenovacion ?? ""}`}
                op={{ id: op.id, postventaEtapa: op.postventaEtapa ?? null, fechaRenovacion: op.fechaRenovacion ?? null, renovaciones: op.renovaciones }}
                onCambio={cargar}
              />
            )}

          </>
        )}
      </div>

      {/* ── CUERPO: pestañas (centro) y panel lateral (derecha) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0">
          <div className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200" role="tablist">
            {TABS.map(t => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={`-mb-px shrink-0 inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}>
                {t.label}
                {!!t.n && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">{t.n}</span>}
              </button>
            ))}
          </div>

          <div id="tab-panel" className="flex flex-col gap-5 scroll-mt-4">
            {tab === "resumen" && (
              <>
                <NotasRapidas
                  valor={op?.notas ?? null}
                  onGuardar={async (notas) => {
                    await guardarJson(`/api/oportunidades/${op!.id}`, "PATCH", { notas: notas || null });
                    cargar();
                  }}
                />
                {/* Análisis con IA: minutas de reunión (resumen, acuerdos y próximos pasos). */}
                <MinutasIA oportunidadId={op.id} empresaNombre={op.empresa?.nombre ?? null} onGuardada={cargar} />
                <CamposPersonalizadosVista entidad="OPORTUNIDAD" extras={op.extras} />
                {extrasRelevantes.length > 0 && (
                  <div className={tarjeta("p-5")}>
                    <h2 className="text-sm font-bold text-slate-900 mb-3">Datos adicionales</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                      {extrasRelevantes.map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-sm border-b border-slate-50 pb-1.5">
                          <span className="text-slate-400 w-40 shrink-0 truncate">{k}</span>
                          <span className="text-slate-800 font-medium">{formatearValorExtra(k, v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Línea de tiempo del negocio */}
      {op.cambiosEtapa.length > 0 && (
        <div className={tarjeta("p-5")}>
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-1.5"><IconHistory size={15} stroke={1.75} />Historial de etapas</h3>
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
            <div className="space-y-3">
              {/* Entrada original */}
              <div className="flex items-start gap-3 relative">
                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center shrink-0 z-10">
                  <IconTarget size={13} stroke={1.75} className="text-slate-500" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-xs font-semibold text-slate-700">Creada como Prospecto</p>
                  <p className="text-xs text-slate-400">{new Date(op.creadoEn).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
              </div>
              {op.cambiosEtapa.map((c, i) => {
                const etapaAnterior = ETAPAS.find(e => e.key === c.etapaAnterior);
                const etapaNueva   = ETAPAS.find(e => e.key === c.etapaNueva);
                const esGanada  = c.etapaNueva === "GANADA";
                const esPerdida = c.etapaNueva === "PERDIDA";
                const iconBg   = esGanada ? "bg-emerald-100" : esPerdida ? "bg-red-100" : "bg-brand-100";
                const iconTxt  = esGanada ? "text-emerald-600" : esPerdida ? "text-red-500" : "text-brand-600";
                const IconoTransicion = esGanada ? IconTrophy : esPerdida ? IconX : IconArrowRight;
                const diasDesdeAnterior = i === 0
                  ? Math.floor((new Date(c.creadoEn).getTime() - new Date(op.creadoEn).getTime()) / 86_400_000)
                  : Math.floor((new Date(c.creadoEn).getTime() - new Date(op.cambiosEtapa[i-1].creadoEn).getTime()) / 86_400_000);
                return (
                  <div key={c.id} className="flex items-start gap-3 relative">
                    <div className={`w-7 h-7 rounded-full ${iconBg} border-2 border-white flex items-center justify-center shrink-0 z-10`}>
                      <IconoTransicion size={13} stroke={1.75} className={iconTxt} />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${etapaAnterior?.color ?? "bg-slate-100 text-slate-600"}`}>{etapaAnterior?.label ?? c.etapaAnterior}</span>
                        <span className="text-slate-300 text-xs">→</span>
                        <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${etapaNueva?.color ?? "bg-slate-100 text-slate-600"}`}>{etapaNueva?.label ?? c.etapaNueva}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(c.creadoEn).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                        {c.creadoByNombre && <span> · {c.creadoByNombre}</span>}
                        <span className="ml-2 text-slate-300">({diasDesdeAnterior === 0 ? "mismo día" : `${diasDesdeAnterior}d en etapa anterior`})</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

              </>
            )}

            {tab === "actividad" && (
              <>
                <div className={tarjeta("p-5")}>
                  <h2 className="text-sm font-bold text-slate-900 mb-3">
                    Actividades {op.actividades.length > 0 && `(${op.actividades.length})`}
                  </h2>
                  {op.actividades.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {op.actividades.map(a => (
                        <div key={a.id} className="flex items-start gap-3 text-sm py-2 border-b border-slate-50 last:border-0">
                          <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.completada ? "bg-emerald-400" : "bg-amber-400"}`} />
                          <div className="flex-1">
                            <p className={a.completada ? "font-medium text-slate-400 line-through" : "font-medium text-slate-800"}>{a.titulo}</p>
                            <p className="text-xs text-slate-400">
                              {a.tipo} · {new Date(a.fecha).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <NuevaActividadInline
                    key={quickKey}
                    oportunidadId={op.id}
                    empresaId={op.empresa?.id}
                    contactoId={op.contacto?.id}
                    onGuardado={cargar}
                    autoAbrir={quickKey > 0}
                  />
                </div>
                <CorreosPanel
                  oportunidadId={op.id}
                  empresaId={op.empresa?.id}
                  contactoId={op.contacto?.id}
                  emailDestino={op.contacto?.email}
                />
              </>
            )}

            {tab === "cotizaciones" && (
              <div className={tarjeta("p-5")}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Cotizaciones de este negocio</h2>
                  <Link href="/dashboard/cotizaciones-formales/nueva" className={boton("secundario", "sm")}>
                    <IconFilePlus size={14} stroke={1.75} />Nueva cotización
                  </Link>
                </div>
                {cotizaciones.length === 0 ? (
                  <p className="text-sm text-slate-400">Aún no hay cotizaciones formales ligadas a este negocio.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cotizaciones.map(c => (
                      <Link key={c.id} href={`/dashboard/cotizaciones-formales/${c.id}`}
                        className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-700">
                        <span className="font-mono text-xs text-brand-700">{numeroCotizacion(c)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_COT[c.estado]?.clase ?? "bg-slate-100 text-slate-600"}`}>
                          {ESTADO_COT[c.estado]?.label ?? c.estado}
                        </span>
                        <span className="flex-1" />
                        <span className="text-xs text-slate-400">
                          {c.fechaValidez ? `Válida hasta ${new Date(c.fechaValidez).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}` : `Creada ${new Date(c.creadoEn).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === "archivos" && <Adjuntos oportunidadId={op.id} />}
          </div>
        </div>

        {/* ── PANEL LATERAL ── */}
        <div className="flex flex-col gap-5">
          {/* Próxima actividad */}
          <div className={tarjeta("p-5")}>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Próxima actividad</h2>
            {proxima ? (
              <div className="text-sm">
                <p className="font-medium text-slate-800">{proxima.titulo}</p>
                <p className={`text-xs ${new Date(proxima.fecha) < new Date(new Date().toDateString()) ? "font-semibold text-red-600" : "text-slate-500"}`}>
                  {new Date(proxima.fecha) < new Date(new Date().toDateString()) ? "Vencida · " : ""}
                  {new Date(proxima.fecha).toLocaleString("es-CO", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin próximo paso agendado.</p>
            )}
            <button type="button" onClick={abrirNuevaActividad} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
              + Agendar actividad
            </button>
          </div>

          {/* Cliente */}
          <div className={tarjeta("p-5")}>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Cliente</h2>
            {op.empresa ? (
              <div className="space-y-1 text-sm">
                <Link href={`/dashboard/cuentas/${op.empresa.id}`}
                  className="font-semibold text-brand-600 hover:underline block">{op.empresa.nombre}</Link>
                {op.empresa.sector && <p className="text-slate-500">{op.empresa.sector}</p>}
                {op.empresa.telefono && <p className="text-slate-500">{op.empresa.telefono}</p>}
              </div>
            ) : <p className="text-sm text-slate-400">Sin cliente asignado</p>}
          </div>

          {/* Contacto */}
          <div className={tarjeta("p-5")}>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Contacto</h2>
            {op.contacto ? (
              <div className="space-y-1 text-sm">
                <Link href={`/dashboard/contactos/${op.contacto.id}`}
                  className="font-semibold text-brand-600 hover:underline block">{op.contacto.nombre}</Link>
                {op.contacto.cargo && <p className="text-slate-500">{op.contacto.cargo}</p>}
                {op.contacto.email && <p className="text-slate-500 break-all">{op.contacto.email}</p>}
                {op.contacto.telefono && <p className="text-slate-500">{op.contacto.telefono}</p>}
              </div>
            ) : <p className="text-sm text-slate-400">Sin contacto asignado</p>}
          </div>

          {/* Cotizaciones (resumen) */}
          <div className={tarjeta("p-5")}>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Cotizaciones</h2>
            {cotizaciones.length === 0 ? (
              <p className="text-sm text-slate-400">Ninguna todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {cotizaciones.slice(0, 3).map(c => (
                  <Link key={c.id} href={`/dashboard/cotizaciones-formales/${c.id}`} className="flex items-center gap-2 text-sm hover:text-brand-700">
                    <span className="font-mono text-xs text-brand-700">{numeroCotizacion(c)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_COT[c.estado]?.clase ?? "bg-slate-100 text-slate-600"}`}>
                      {ESTADO_COT[c.estado]?.label ?? c.estado}
                    </span>
                  </Link>
                ))}
                {cotizaciones.length > 3 && (
                  <button type="button" onClick={() => setTab("cotizaciones")} className="text-xs font-medium text-brand-600 hover:underline">
                    Ver las {cotizaciones.length}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Coach de objeciones (módulo opcional) */}
          {moduloObjeciones && <CoachObjecionesIA oportunidadId={op.id} />}
        </div>
      </div>

      {/* Modal motivo de pérdida */}
      {modalPerdida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4 animate-modal-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><IconMoodSad size={20} stroke={1.75} className="text-red-500" /></div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">¿Por qué se perdió este negocio?</h2>
                <p className="text-xs text-slate-400">Esta información ayuda a mejorar futuros cierres</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {MOTIVOS_PERDIDA.map(m => (
                <button key={m} onClick={() => setMotivoPerdida(m)}
                  className={`text-left rounded-xl border px-3 py-2.5 text-xs font-medium transition-all ${
                    motivoPerdida === m
                      ? "border-red-400 bg-red-50 text-red-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {m}
                </button>
              ))}
            </div>

            {motivoPerdida === "Otro" && (
              <input
                type="text"
                value={otroMotivo}
                onChange={e => setOtroMotivo(e.target.value)}
                placeholder="Describe el motivo..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 mb-4"
                autoFocus
              />
            )}

            <div className="flex gap-2 mt-2">
              <button onClick={confirmarPerdida} disabled={!motivoPerdida || (motivoPerdida === "Otro" && !otroMotivo.trim())}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-40">
                Marcar como perdida
              </button>
              <button onClick={() => { setModalPerdida(false); setMotivoPerdida(""); setOtroMotivo(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
