"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type NpsRespuesta = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  creadoEn: string;
  funcion: { id: string; titulo: string; fecha: string } | null;
};

type Asistencia = {
  id: string;
  creadoEn: string;
  funcion: { id: string; titulo: string; fecha: string } | null;
};

type Espectador = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  segmento: string;
  nivelMembresia: string | null;
  notas: string | null;
  creadoEn: string;
  npsList: NpsRespuesta[];
  asistencias: Asistencia[];
};

const SEGMENTOS: Record<string, string> = {
  INDIVIDUAL: "Individual",
  GRUPO: "Grupo",
  EMPRESA: "Empresa",
  COLEGIO: "Colegio",
};

const SEG_COLOR: Record<string, string> = {
  INDIVIDUAL: "bg-blue-50 text-blue-700",
  GRUPO: "bg-violet-50 text-violet-700",
  EMPRESA: "bg-emerald-50 text-emerald-700",
  COLEGIO: "bg-amber-50 text-amber-700",
};

const MEMBRESIAS = [
  { key: "", label: "— Sin membresía —" },
  { key: "ESPECTADOR", label: "Espectador (10% desc.)" },
  { key: "FANATICO",   label: "Fanático (20% + ensayo)" },
  { key: "MECENAS",    label: "Mecenas (naming)" },
];

const MEMBRESIA_LABEL: Record<string, string> = {
  ESPECTADOR: "Espectador",
  FANATICO: "Fanático",
  MECENAS: "Mecenas",
};

const MEMBRESIA_COLOR: Record<string, string> = {
  ESPECTADOR: "bg-slate-100 text-slate-600",
  FANATICO: "bg-blue-100 text-blue-700",
  MECENAS: "bg-amber-100 text-amber-800",
};

function npsCategoria(p: number) {
  if (p >= 9) return { label: "Promotor", color: "text-emerald-700 bg-emerald-50" };
  if (p >= 7) return { label: "Pasivo", color: "text-amber-700 bg-amber-50" };
  return { label: "Detractor", color: "text-red-600 bg-red-50" };
}

export default function FichaEspectadorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [esp, setEsp] = useState<Espectador | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", segmento: "INDIVIDUAL", nivelMembresia: "", notas: "" });

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/espectadores/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEsp(data);
      setForm({ nombre: data.nombre, email: data.email ?? "", telefono: data.telefono ?? "", segmento: data.segmento, nivelMembresia: data.nivelMembresia ?? "", notas: data.notas ?? "" });
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/espectadores/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este espectador? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/espectadores/${id}`, { method: "DELETE" });
    router.push("/dashboard/audiencia");
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1">{[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );
  if (!esp) return <p className="text-sm text-slate-400">No encontrado.</p>;

  const avgNps = esp.npsList.length > 0
    ? (esp.npsList.reduce((a, n) => a + n.puntuacion, 0) / esp.npsList.length).toFixed(1)
    : null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link href="/dashboard/audiencia" className="hover:text-blue-600 transition-colors">← Audiencia</Link>
        <span>/</span>
        <span className="text-slate-600">{esp.nombre}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${SEG_COLOR[esp.segmento] ?? "bg-slate-100 text-slate-600"}`}>
              {SEGMENTOS[esp.segmento] ?? esp.segmento}
            </span>
            {esp.nivelMembresia && (
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ml-1.5 ${MEMBRESIA_COLOR[esp.nivelMembresia]}`}>
                Club Belarte · {MEMBRESIA_LABEL[esp.nivelMembresia]}
              </span>
            )}
            <h1 className="text-xl font-bold text-slate-900">{esp.nombre}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditando(!editando)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              {editando ? "Cancelar" : "Editar"}
            </button>
            <button onClick={handleEliminar}
              className="rounded-xl border border-red-100 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">
              Eliminar
            </button>
          </div>
        </div>

        {editando ? (
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Segmento</label>
              <select value={form.segmento} onChange={e => setForm({...form, segmento: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                {Object.entries(SEGMENTOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Club Belarte</label>
              <select value={form.nivelMembresia} onChange={e => setForm({...form, nivelMembresia: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 bg-white">
                {MEMBRESIAS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Email</span><span className="text-slate-800">{esp.email ?? "—"}</span></div>
            <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Teléfono</span><span className="text-slate-800">{esp.telefono ?? "—"}</span></div>
            <div className="flex gap-2"><span className="text-slate-400 w-20 shrink-0">Desde</span>
              <span className="text-slate-800">{new Date(esp.creadoEn).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" })}</span>
            </div>
            {esp.notas && <div className="col-span-2 flex gap-2"><span className="text-slate-400 w-20 shrink-0">Notas</span><span className="text-slate-800">{esp.notas}</span></div>}
          </div>
        )}
      </div>

      {/* KPIs NPS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 mb-1">Funciones asistidas</p>
          <p className="text-2xl font-bold text-slate-900">{esp.asistencias.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 mb-1">Puntaje promedio</p>
          <p className={`text-2xl font-bold ${avgNps ? (Number(avgNps) >= 9 ? "text-emerald-700" : Number(avgNps) >= 7 ? "text-amber-600" : "text-red-600") : "text-slate-400"}`}>
            {avgNps ?? "—"}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs text-slate-400 mb-1">Categoría</p>
          {avgNps ? (
            (() => { const cat = npsCategoria(Number(avgNps)); return (
              <span className={`inline-block text-sm font-semibold px-2.5 py-1 rounded-full ${cat.color}`}>{cat.label}</span>
            ); })()
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </div>
      </div>

      {/* Historial de asistencias */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Historial de asistencias</h2>
        {esp.asistencias.length === 0 ? (
          <p className="text-sm text-slate-400">Sin asistencias registradas aún.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {esp.asistencias.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                {a.funcion ? (
                  <Link href={`/dashboard/funciones/${a.funcion.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                    {a.funcion.titulo}
                  </Link>
                ) : <span className="text-sm text-slate-400">Función eliminada</span>}
                <span className="text-xs text-slate-400">
                  {a.funcion ? new Date(a.funcion.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial NPS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Historial de funciones</h2>
        {esp.npsList.length === 0 ? (
          <p className="text-sm text-slate-400">Sin respuestas NPS aún.</p>
        ) : (
          <div className="space-y-3">
            {esp.npsList.map(n => {
              const cat = npsCategoria(n.puntuacion);
              return (
                <div key={n.id} className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className={`text-lg font-bold w-8 text-center rounded-lg py-0.5 ${cat.color}`}>
                    {n.puntuacion}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {n.funcion && (
                        <Link href={`/dashboard/funciones/${n.funcion.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline">{n.funcion.titulo}</Link>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {n.funcion ? new Date(n.funcion.fecha).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }) : ""}
                      </span>
                    </div>
                    {n.comentario && <p className="text-sm text-slate-600">{n.comentario}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
