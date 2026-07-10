"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";
import { NotasRapidas } from "@/components/notas-rapidas";
import {
  IconAlertTriangle, IconHistory, IconTarget, IconTrophy, IconX, IconArrowRight,
  IconMoodSad,
} from "@tabler/icons-react";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
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
};

const ETAPAS = [
  { key: "PROSPECTO",   label: "Prospecto",   color: "bg-slate-100 text-slate-700" },
  { key: "CALIFICADO",  label: "Calificado",  color: "bg-blue-100 text-blue-700" },
  { key: "PROPUESTA",   label: "Cotización",  color: "bg-violet-100 text-violet-700" },
  { key: "NEGOCIACION", label: "Negociación", color: "bg-amber-100 text-amber-700" },
  { key: "GANADA",      label: "Ganada",      color: "bg-emerald-100 text-emerald-700" },
  { key: "PERDIDA",     label: "Perdida",     color: "bg-red-100 text-red-600" },
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
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ titulo: "", valor: "", etapa: "", notas: "", fechaCierre: "", probabilidad: "", salonId: "", sede: "", fechaEvento: "", horaInicio: "", horaFin: "" });
  const [modalPerdida, setModalPerdida] = useState(false);
  const [motivoPerdida, setMotivoPerdida] = useState("");
  const [otroMotivo, setOtroMotivo] = useState("");
  const [salones, setSalones] = useState<Salon[]>([]);
  const [moduloSalones, setModuloSalones] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const disponibilidadClaveRef = useRef("");

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
    const data = await res.json();
    setOp(data);
    setForm({
      titulo: data.titulo, valor: data.valor ?? "", etapa: data.etapa, notas: data.notas ?? "",
      fechaCierre: data.fechaCierre ? data.fechaCierre.substring(0, 10) : "",
      probabilidad: String(data.probabilidad ?? 50),
      salonId: data.salonId ?? "", sede: data.sede ?? "",
      fechaEvento: data.fechaEvento ? data.fechaEvento.substring(0, 10) : "",
      horaInicio: data.horaInicio ?? "", horaFin: data.horaFin ?? "",
    });
  }

  useEffect(() => { cargar(); }, [id]);

  useEffect(() => {
    fetch("/api/configuracion").then(r => r.json()).then(config => {
      const salonesActivo = !!config?.modulos?.salones;
      setModuloSalones(salonesActivo);
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
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo, valor: form.valor || null, etapa: form.etapa, notas: form.notas || null,
        fechaCierre: form.fechaCierre || null, probabilidad: Number(form.probabilidad),
        salonId: form.salonId || null, sede: form.sede || null, fechaEvento: form.fechaEvento || null,
        horaInicio: form.horaInicio || null, horaFin: form.horaFin || null,
      }),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEtapa(etapa: string) {
    if (etapa === "PERDIDA" && op?.etapa !== "PERDIDA") {
      setModalPerdida(true);
      return;
    }
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });
    cargar();
  }

  async function confirmarPerdida() {
    const motivo = motivoPerdida === "Otro" ? otroMotivo : motivoPerdida;
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa: "PERDIDA", notas: motivo ? `[MOTIVO DE PÉRDIDA] ${motivo}${op?.notas ? `\n\n${op.notas}` : ""}` : op?.notas }),
    });
    setModalPerdida(false);
    setMotivoPerdida("");
    setOtroMotivo("");
    cargar();
  }

  async function eliminar() {
    if (!esAdministrador) { alert("Solicita al Administrador borrar esta oportunidad."); return; }
    if (!confirm("¿Eliminar esta oportunidad? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/oportunidades/${id}`, { method: "DELETE" });
    router.push("/dashboard/pipeline");
  }

  function fmt(v: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }

  if (!op) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1">{[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );

  const etapaInfo = ETAPAS.find(e => e.key === op.etapa)!;
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
    !["AÑO","MES ELABORACION","ELABORACIÓN"].includes(k)
  ) : [];

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link href="/dashboard/pipeline" className="hover:text-brand-600 transition-colors">← Pipeline</Link>
        <span>/</span>
        <span className="text-slate-600 truncate max-w-xs">{op.titulo}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        {editando ? (
          <form onSubmit={handleGuardar}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Título *</label>
                <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Valor (COP)</label>
                <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Etapa</label>
                <select value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                  {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha de cierre estimada</label>
                <input type="date" value={form.fechaCierre} onChange={e => setForm({...form, fechaCierre: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fecha del evento</label>
                <input type="date" value={form.fechaEvento} onChange={e => setForm({...form, fechaEvento: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
              {moduloSalones && form.salonId && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Horario (opcional)</label>
                  <div className="flex items-center gap-2">
                    <input type="time" value={form.horaInicio} onChange={e => setForm({...form, horaInicio: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                    <span className="text-slate-400 text-xs">a</span>
                    <input type="time" value={form.horaFin} onChange={e => setForm({...form, horaFin: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
              <button type="button" onClick={() => setEditando(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${etapaInfo.color}`}>
                  {etapaInfo.label}
                </span>
                <h1 className="text-xl font-bold text-slate-900">{op.titulo}</h1>
                {op.extras?.["COTIZACION NUMERO"] && (
                  <p className="text-sm text-slate-400 mt-0.5">{op.extras["COTIZACION NUMERO"]}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditando(true)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  Editar
                </button>
                <button onClick={eliminar}
                  className="rounded-xl border border-red-100 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Valor cotizado</p>
                <p className="text-lg font-bold text-emerald-700">{op.valor ? fmt(Number(op.valor)) : "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Probabilidad</p>
                <p className="text-lg font-bold text-brand-600">{op.probabilidad ?? 50}%</p>
              </div>
              <div className={`rounded-xl p-4 ${op.fechaCierre && new Date(op.fechaCierre) < new Date() && !["GANADA","PERDIDA"].includes(op.etapa) ? "bg-red-50" : "bg-slate-50"}`}>
                <p className="text-xs text-slate-400 mb-1">Cierre estimado</p>
                <p className="text-sm font-semibold text-slate-800">
                  {op.fechaCierre
                    ? new Date(op.fechaCierre).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })
                    : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Creada el</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(op.creadoEn).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
                </p>
              </div>
            </div>

            {/* Progreso de etapa */}
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Mover a etapa</p>
              <div className="flex gap-1.5 flex-wrap">
                {ETAPAS.map(e => (
                  <button key={e.key} onClick={() => cambiarEtapa(e.key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                      op.etapa === e.key
                        ? e.color + " ring-2 ring-offset-1 ring-brand-400"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

          </>
        )}
      </div>

      <NotasRapidas
        valor={op?.notas ?? null}
        onGuardar={async (notas) => {
          await fetch(`/api/oportunidades/${op!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notas: notas || null }),
          });
          cargar();
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
        {/* Cliente */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Cliente</h2>
          {op.empresa ? (
            <div className="space-y-1.5 text-sm">
              <Link href={`/dashboard/cuentas/${op.empresa.id}`}
                className="font-semibold text-brand-600 hover:underline block">{op.empresa.nombre}</Link>
              {op.empresa.sector && <p className="text-slate-500">{op.empresa.sector}</p>}
              {op.empresa.telefono && <p className="text-slate-500">{op.empresa.telefono}</p>}
            </div>
          ) : <p className="text-sm text-slate-400">Sin cliente asignado</p>}
        </div>

        {/* Contacto */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Contacto</h2>
          {op.contacto ? (
            <div className="space-y-1.5 text-sm">
              <Link href={`/dashboard/contactos/${op.contacto.id}`}
                className="font-semibold text-brand-600 hover:underline block">{op.contacto.nombre}</Link>
              {op.contacto.cargo && <p className="text-slate-500">{op.contacto.cargo}</p>}
              {op.contacto.email && <p className="text-slate-500">{op.contacto.email}</p>}
              {op.contacto.telefono && <p className="text-slate-500">{op.contacto.telefono}</p>}
            </div>
          ) : <p className="text-sm text-slate-400">Sin contacto asignado</p>}
        </div>
      </div>

      {/* Datos extras del Excel */}
      {extrasRelevantes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Datos adicionales</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {extrasRelevantes.map(([k, v]) => (
              <div key={k} className="flex gap-2 text-sm border-b border-slate-50 pb-1.5">
                <span className="text-slate-400 w-40 shrink-0 truncate">{k}</span>
                <span className="text-slate-800 font-medium">{formatearValorExtra(k, v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actividades */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-3">
          Actividades {op.actividades.length > 0 && `(${op.actividades.length})`}
        </h2>
        {op.actividades.length > 0 && (
          <div className="space-y-2 mb-4">
            {op.actividades.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-sm py-2 border-b border-slate-50 last:border-0">
                <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.completada ? "bg-emerald-400" : "bg-amber-400"}`} />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{a.titulo}</p>
                  <p className="text-xs text-slate-400">
                    {a.tipo} · {new Date(a.fecha).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <NuevaActividadInline
          oportunidadId={op.id}
          empresaId={op.empresa?.id}
          contactoId={op.contacto?.id}
          onGuardado={cargar}
        />
      </div>

      {/* ── HISTORIAL DE ETAPAS ── */}
      {op.cambiosEtapa.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
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

      {/* Modal motivo de pérdida */}
      {modalPerdida && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl mx-4">
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
