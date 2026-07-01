"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";

type Oportunidad = {
  id: string;
  titulo: string;
  valor: string | null;
  etapa: string;
  notas: string | null;
  creadoEn: string;
  extras: Record<string, string> | null;
  empresa:  { id: string; nombre: string; sector: string | null; telefono: string | null } | null;
  contacto: { id: string; nombre: string; email: string | null; telefono: string | null; cargo: string | null } | null;
  actividades: { id: string; tipo: string; titulo: string; fecha: string; completada: boolean; notas: string | null }[];
};

const ETAPAS = [
  { key: "PROSPECTO",   label: "Prospecto",   color: "bg-slate-100 text-slate-700" },
  { key: "CALIFICADO",  label: "Calificado",  color: "bg-blue-100 text-blue-700" },
  { key: "PROPUESTA",   label: "Propuesta",   color: "bg-violet-100 text-violet-700" },
  { key: "NEGOCIACION", label: "Negociación", color: "bg-amber-100 text-amber-700" },
  { key: "GANADA",      label: "Ganada",      color: "bg-emerald-100 text-emerald-700" },
  { key: "PERDIDA",     label: "Perdida",     color: "bg-red-100 text-red-600" },
];

const ETAPA_ORDEN = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION","GANADA","PERDIDA"];

export default function OportunidadDetallePage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params.id as string;

  const [op, setOp] = useState<Oportunidad | null>(null);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ titulo: "", valor: "", etapa: "", notas: "" });

  async function cargar() {
    const res = await fetch(`/api/oportunidades/${id}`);
    const data = await res.json();
    setOp(data);
    setForm({ titulo: data.titulo, valor: data.valor ?? "", etapa: data.etapa, notas: data.notas ?? "" });
  }

  useEffect(() => { cargar(); }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: form.titulo, valor: form.valor || null, etapa: form.etapa, notas: form.notas || null }),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function cambiarEtapa(etapa: string) {
    await fetch(`/api/oportunidades/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapa }),
    });
    cargar();
  }

  async function eliminar() {
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
        <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );

  const etapaInfo = ETAPAS.find(e => e.key === op.etapa)!;
  const extrasRelevantes = op.extras ? Object.entries(op.extras).filter(([k]) =>
    !["AÑO","MES ELABORACION","ELABORACIÓN"].includes(k)
  ) : [];

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link href="/dashboard/pipeline" className="hover:text-blue-600 transition-colors">← Pipeline</Link>
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Valor (COP)</label>
                <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Etapa</label>
                <select value={form.etapa} onChange={e => setForm({...form, etapa: e.target.value})}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                  {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500 mb-1 block">Notas</label>
                <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
                  rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
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

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Valor cotizado</p>
                <p className="text-lg font-bold text-emerald-700">{op.valor ? fmt(Number(op.valor)) : "—"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Año / Mes</p>
                <p className="text-sm font-semibold text-slate-800">
                  {op.extras?.["AÑO"] ?? "—"} · {op.extras?.["MES ELABORACION"] ?? "—"}
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
                        ? e.color + " ring-2 ring-offset-1 ring-blue-400"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {op.notas && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notas</p>
                <p className="text-sm text-slate-700">{op.notas}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Cliente */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Cliente</h2>
          {op.empresa ? (
            <div className="space-y-1.5 text-sm">
              <Link href={`/dashboard/cuentas/${op.empresa.id}`}
                className="font-semibold text-blue-600 hover:underline block">{op.empresa.nombre}</Link>
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
                className="font-semibold text-blue-600 hover:underline block">{op.contacto.nombre}</Link>
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
                <span className="text-slate-800 font-medium">{v}</span>
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
    </div>
  );
}
