"use client";

import { useEffect, useState } from "react";

const SECTORES = [
  "Arte y Cultura", "Educación", "Entretenimiento", "Eventos corporativos",
  "Gobierno", "Hospitalidad y Turismo", "Medios y Comunicación", "Música",
  "Religioso", "Salud", "Teatro y Artes escénicas", "Tecnología",
  "Otro",
];
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExtrasPanel } from "@/components/extras-panel";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";
import { TimelineCliente } from "@/components/timeline-cliente";
import { NotasRapidas } from "@/components/notas-rapidas";
import { Adjuntos } from "@/components/adjuntos";
import { Etiquetas } from "@/components/etiquetas";
import { WhatsAppBtn } from "@/components/whatsapp-btn";
import { IconPhone, IconMail, IconUsers, type Icon } from "@tabler/icons-react";

type Detalle = {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  extras: Record<string, string> | null;
  sitioWeb: string | null;
  telefono: string | null;
  notas: string | null;
  etiquetas: string[];
  contactos: { id: string; nombre: string; cargo: string | null; telefono: string | null }[];
  oportunidades: { id: string; titulo: string; etapa: string; valor: string | null }[];
  actividades: { id: string; titulo: string; fecha: string; completada: boolean }[];
  cotizaciones: { id: string; numero: number; estado: string; items: { cantidad: number; precioUnit: string }[] }[];
};

const ETAPA_COLOR: Record<string, string> = {
  GANADA: "text-emerald-700",
  PERDIDA: "text-red-500",
  PROPUESTA: "text-violet-600",
  NEGOCIACION: "text-amber-600",
  CALIFICADO: "text-blue-600",
  PROSPECTO: "text-slate-500",
};

export default function FichaClientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [empresa, setEmpresa] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", sector: "", sitioWeb: "", telefono: "", notas: "" });
  const [quickTipo, setQuickTipo] = useState<string | undefined>(undefined);
  const [quickKey, setQuickKey] = useState(0);

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/empresas/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEmpresa(data);
      setForm({
        nombre: data.nombre,
        email: data.email ?? "",
        sector: data.sector ?? "",
        sitioWeb: data.sitioWeb ?? "",
        telefono: data.telefono ?? "",
        notas: data.notas ?? "",
      });
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/empresas/${id}`, { method: "DELETE" });
    router.push("/dashboard/cuentas");
  }

  function fmt(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  if (cargando) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!empresa) return <p className="text-sm text-slate-400">No encontrado.</p>;

  return (
    <div>
      <Link href="/dashboard/cuentas" className="mb-4 inline-block text-xs text-slate-500 hover:underline">
        ← Volver a Clientes
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{empresa.nombre}</h1>
          <p className="text-sm text-slate-500">{empresa.sector ?? "Sin sector"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditando(!editando)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            {editando ? "Cancelar" : "Editar"}
          </button>
          <button onClick={handleEliminar}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            Eliminar
          </button>
        </div>
      </div>

      {editando ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sector</label>
              <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                <option value="">Sin sector</option>
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sitio web</label>
              <input value={form.sitioWeb} onChange={e => setForm({ ...form, sitioWeb: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 rounded-2xl border border-slate-200 p-5 text-sm">
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Email</span><span className="text-slate-800">{empresa.email ?? "—"}</span></div>
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Teléfono</span><span className="text-slate-800">{empresa.telefono ?? "—"}</span></div>
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Sitio web</span><span className="text-slate-800">{empresa.sitioWeb ?? "—"}</span></div>
          <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Sector</span><span className="text-slate-800">{empresa.sector ?? "—"}</span></div>
          {empresa.notas && (
            <div className="col-span-2 flex gap-2"><span className="text-slate-400 w-20 shrink-0">Notas</span><span className="text-slate-800">{empresa.notas}</span></div>
          )}
        </div>
      )}

      <ExtrasPanel extras={empresa.extras} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-3">Etiquetas</h2>
        <Etiquetas
          etiquetas={empresa.etiquetas ?? []}
          onGuardar={async (etiquetas) => {
            await fetch(`/api/empresas/${empresa.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ etiquetas }),
            });
            cargar();
          }}
        />
      </div>

      <NotasRapidas
        valor={empresa.notas}
        onGuardar={async (notas) => {
          await fetch(`/api/empresas/${empresa.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notas }),
          });
          cargar();
        }}
      />

      <div className="mt-4">
        <Adjuntos empresaId={empresa.id} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {/* Contactos */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Contactos ({empresa.contactos.length})</h2>
          {empresa.contactos.length === 0 ? (
            <p className="text-xs text-slate-400">Sin contactos vinculados.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {empresa.contactos.map((c) => (
                <li key={c.id} className="flex items-center justify-between">
                  <span className="text-slate-700">
                    {c.nombre}{c.cargo && <span className="text-slate-400"> · {c.cargo}</span>}
                  </span>
                  {c.telefono && (
                    <WhatsAppBtn telefono={c.telefono} nombre={c.nombre} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Oportunidades */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Oportunidades ({empresa.oportunidades.length})</h2>
          {empresa.oportunidades.length === 0 ? (
            <p className="text-xs text-slate-400">Sin oportunidades.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {empresa.oportunidades.map((o) => (
                <li key={o.id} className="text-slate-700">
                  {o.titulo}
                  <span className={`ml-1.5 text-xs font-medium ${ETAPA_COLOR[o.etapa] ?? "text-slate-400"}`}>· {o.etapa}</span>
                  {o.valor && <span className="ml-1.5 text-xs font-semibold text-emerald-700">{fmt(o.valor)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actividades */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">Actividades ({empresa.actividades.length})</h2>
            <div className="flex gap-1">
              {([
                { tipo: "LLAMADA", icon: IconPhone, label: "Llamada" },
                { tipo: "EMAIL",   icon: IconMail,  label: "Email" },
                { tipo: "REUNION", icon: IconUsers, label: "Reunión" },
              ] as { tipo: string; icon: Icon; label: string }[]).map(q => {
                const Icono = q.icon;
                return (
                  <button key={q.tipo}
                    onClick={() => { setQuickTipo(q.tipo); setQuickKey(k => k + 1); }}
                    title={`Registrar ${q.label}`}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                    <Icono size={14} stroke={1.75} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm mb-3">
            {empresa.actividades.length === 0 ? (
              <p className="text-xs text-slate-400">Sin actividades.</p>
            ) : (
              empresa.actividades.map((a) => (
                <div key={a.id} className={`flex items-center gap-2 ${a.completada ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-current opacity-50" />
                  {a.titulo}
                  <span className="text-slate-400 text-xs ml-auto">{new Date(a.fecha).toLocaleDateString("es-CO")}</span>
                </div>
              ))
            )}
          </div>
          <NuevaActividadInline key={quickKey} empresaId={empresa.id} onGuardado={() => { setQuickTipo(undefined); cargar(); }}
            tipoInicial={quickTipo} autoAbrir={!!quickTipo} />
        </div>

        {/* Cotizaciones */}
        <div className="rounded-2xl border border-slate-200 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Cotizaciones ({empresa.cotizaciones.length})</h2>
          {empresa.cotizaciones.length === 0 ? (
            <p className="text-xs text-slate-400">Sin cotizaciones.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {empresa.cotizaciones.map((c) => {
                const total = c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
                return (
                  <li key={c.id} className="text-slate-700">
                    <Link href={`/dashboard/cotizaciones-formales/${c.id}`} className="hover:text-brand-600">
                      #{c.numero}
                    </Link>
                    <span className="text-slate-400 text-xs ml-1">· {c.estado}</span>
                    <span className="text-xs font-semibold text-emerald-700 ml-1">· {fmt(String(total))}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Timeline 360° */}
      <div className="mt-4">
        <TimelineCliente
          empresaId={empresa.id}
          contactos={empresa.contactos.map(c => ({ id: c.id, nombre: c.nombre }))}
        />
      </div>
    </div>
  );
}
