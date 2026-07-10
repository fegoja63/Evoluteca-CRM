"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type NpsRespuesta = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  creadoEn: string;
  espectador: { id: string; nombre: string } | null;
};

type Espectador = { id: string; nombre: string; segmento: string | null };

type Asistencia = {
  id: string;
  creadoEn: string;
  espectador: { id: string; nombre: string; telefono: string | null; segmento: string; _count: { asistencias: number } };
};

type Funcion = {
  id: string;
  titulo: string;
  fecha: string;
  sillasTotales: number;
  sillasVendidas: number;
  canal: string;
  ingresoEstimado: string | null;
  notas: string | null;
  npsList: NpsRespuesta[];
  asistencias: Asistencia[];
};

const CANALES: Record<string, string> = {
  PLATAFORMA: "Plataforma",
  TAQUILLA: "Taquilla",
  INVITADOS: "Invitados",
  EMPRESA: "Empresa",
};

function npsCategoria(p: number) {
  if (p >= 9) return { label: "Promotor", color: "text-emerald-700 bg-emerald-50" };
  if (p >= 7) return { label: "Pasivo", color: "text-amber-700 bg-amber-50" };
  return { label: "Detractor", color: "text-red-600 bg-red-50" };
}

export default function FichaFuncionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [fn, setFn] = useState<Funcion | null>(null);
  const [espectadores, setEspectadores] = useState<Espectador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [npsForm, setNpsForm] = useState({ puntuacion: "", comentario: "", espectadorId: "" });
  const [enviandoNps, setEnviandoNps] = useState(false);
  const [asistForm, setAsistForm] = useState({ espectadorId: "", nombre: "", telefono: "" });
  const [guardandoAsist, setGuardandoAsist] = useState(false);
  const [errorAsist, setErrorAsist] = useState("");
  const [form, setForm] = useState({
    titulo: "", fecha: "", sillasTotales: "", sillasVendidas: "", canal: "PLATAFORMA", ingresoEstimado: "", notas: "",
  });

  async function cargar() {
    setCargando(true);
    const [res, resEsp] = await Promise.all([
      fetch(`/api/funciones/${id}`),
      fetch("/api/espectadores"),
    ]);
    if (res.ok) {
      const data = await res.json();
      setFn(data);
      setForm({
        titulo: data.titulo,
        // datetime-local (no solo la fecha) para no perder la hora real del show al guardar
        fecha: new Date(data.fecha).toISOString().slice(0, 16),
        sillasTotales: String(data.sillasTotales),
        sillasVendidas: String(data.sillasVendidas),
        canal: data.canal,
        ingresoEstimado: data.ingresoEstimado ?? "",
        notas: data.notas ?? "",
      });
    }
    if (resEsp.ok) {
      const esp = await resEsp.json();
      setEspectadores(esp);
    }
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/funciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar esta función? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/funciones/${id}`, { method: "DELETE" });
    router.push("/dashboard/funciones");
  }

  async function handleNps(e: React.FormEvent) {
    e.preventDefault();
    setEnviandoNps(true);
    await fetch(`/api/funciones/${id}/nps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puntuacion: Number(npsForm.puntuacion),
        comentario: npsForm.comentario || null,
        espectadorId: npsForm.espectadorId || null,
      }),
    });
    setNpsForm({ puntuacion: "", comentario: "", espectadorId: "" });
    setEnviandoNps(false);
    cargar();
  }

  async function handleAgregarAsistente(e: React.FormEvent) {
    e.preventDefault();
    setErrorAsist("");
    setGuardandoAsist(true);
    try {
      const res = await fetch(`/api/funciones/${id}/asistencias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asistForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorAsist(data.error || "No se pudo registrar la asistencia");
        return;
      }
      setAsistForm({ espectadorId: "", nombre: "", telefono: "" });
      await cargar();
    } finally {
      setGuardandoAsist(false);
    }
  }

  async function handleEliminarAsistente(asistenciaId: string) {
    if (!confirm("¿Quitar esta asistencia?")) return;
    const res = await fetch(`/api/funciones/asistencias/${asistenciaId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo quitar la asistencia");
      return;
    }
    cargar();
  }

  function fmt(v: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
  }

  if (cargando) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1">{[0,1,2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
      ))}</div>
    </div>
  );
  if (!fn) return <p className="text-sm text-slate-400">No encontrada.</p>;

  const ocupacion = fn.sillasTotales > 0 ? Math.round((fn.sillasVendidas / fn.sillasTotales) * 100) : 0;
  const promotores = fn.npsList.filter(n => n.puntuacion >= 9).length;
  const detractores = fn.npsList.filter(n => n.puntuacion <= 6).length;
  const npsScore = fn.npsList.length > 0
    ? Math.round(((promotores - detractores) / fn.npsList.length) * 100)
    : null;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link href="/dashboard/funciones" className="hover:text-brand-600 transition-colors">← Funciones</Link>
        <span>/</span>
        <span className="text-slate-600 truncate max-w-xs">{fn.titulo}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        {editando ? (
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Título *</label>
              <input required value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fecha y hora</label>
              <input type="datetime-local" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Canal</label>
              <select value={form.canal} onChange={e => setForm({...form, canal: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                {Object.entries(CANALES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Sillas totales</label>
              <input type="number" value={form.sillasTotales} onChange={e => setForm({...form, sillasTotales: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Sillas vendidas</label>
              <input type="number" value={form.sillasVendidas} onChange={e => setForm({...form, sillasVendidas: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Ingreso estimado (COP)</label>
              <input type="number" value={form.ingresoEstimado} onChange={e => setForm({...form, ingresoEstimado: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 mb-1 block">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2 flex gap-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={() => setEditando(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs text-slate-400 mb-1">
                  {new Date(fn.fecha).toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                  {" · "}{CANALES[fn.canal] ?? fn.canal}
                </p>
                <h1 className="text-xl font-bold text-slate-900">{fn.titulo}</h1>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditando(true)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
                  Editar
                </button>
                <button onClick={handleEliminar}
                  className="rounded-xl border border-red-100 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50">
                  Eliminar
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-5 gap-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Ocupación</p>
                <p className={`text-2xl font-bold ${ocupacion >= 70 ? "text-emerald-700" : ocupacion >= 40 ? "text-amber-600" : "text-red-600"}`}>{ocupacion}%</p>
                <p className="text-xs text-slate-400 mt-0.5">{fn.sillasVendidas} / {fn.sillasTotales} sillas</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                  <div className={`h-1.5 rounded-full transition-all ${ocupacion >= 70 ? "bg-emerald-500" : ocupacion >= 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${ocupacion}%` }} />
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Asistentes registrados</p>
                <p className="text-2xl font-bold text-violet-700">{fn.asistencias.length}</p>
                <p className="text-xs text-slate-400 mt-0.5">{fn.asistencias.filter(a => a.espectador._count.asistencias > 1).length} recurrentes</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Ingresos</p>
                <p className="text-lg font-bold text-emerald-700">
                  {fn.ingresoEstimado ? fmt(Number(fn.ingresoEstimado)) : "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Respuestas NPS</p>
                <p className="text-2xl font-bold text-slate-800">{fn.npsList.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 mb-1">Score NPS</p>
                {npsScore !== null ? (
                  <p className={`text-2xl font-bold ${npsScore >= 50 ? "text-emerald-700" : npsScore >= 0 ? "text-amber-600" : "text-red-600"}`}>
                    {npsScore > 0 ? "+" : ""}{npsScore}
                  </p>
                ) : <p className="text-slate-400 text-sm">Sin datos</p>}
              </div>
            </div>

            {fn.notas && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Notas</p>
                <p className="text-sm text-slate-700">{fn.notas}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Asistentes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Asistentes</h2>

        <form onSubmit={handleAgregarAsistente} className="mb-6 pb-6 border-b border-slate-100">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="w-48">
              <label className="text-xs text-slate-500 mb-1 block">Espectador existente</label>
              <select
                value={asistForm.espectadorId}
                onChange={e => setAsistForm({ ...asistForm, espectadorId: e.target.value, nombre: "", telefono: "" })}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white"
              >
                <option value="">— Seleccionar —</option>
                {espectadores.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            {!asistForm.espectadorId && (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">O nombre nuevo</label>
                  <input
                    value={asistForm.nombre}
                    onChange={e => setAsistForm({ ...asistForm, nombre: e.target.value })}
                    placeholder="Nombre del espectador"
                    className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Teléfono (opcional)</label>
                  <input
                    value={asistForm.telefono}
                    onChange={e => setAsistForm({ ...asistForm, telefono: e.target.value })}
                    placeholder="WhatsApp"
                    className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </>
            )}
            <button type="submit" disabled={guardandoAsist || (!asistForm.espectadorId && !asistForm.nombre.trim())}
              className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50 shrink-0">
              {guardandoAsist ? "Guardando..." : "+ Registrar asistencia"}
            </button>
          </div>
          {errorAsist && <p className="mt-2 text-xs text-red-600">{errorAsist}</p>}
        </form>

        {fn.asistencias.length === 0 ? (
          <p className="text-sm text-slate-400">Sin asistentes registrados aún.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fn.asistencias.map(a => {
              const esRecurrente = a.espectador._count.asistencias > 1;
              return (
                <div key={a.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1">
                  <Link href={`/dashboard/audiencia/${a.espectador.id}`} className="text-sm text-slate-700 hover:text-brand-600 hover:underline">
                    {a.espectador.nombre}
                  </Link>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${esRecurrente ? "bg-emerald-100 text-emerald-700" : "bg-brand-100 text-brand-700"}`}>
                    {esRecurrente ? "recurrente" : "nuevo"}
                  </span>
                  <button onClick={() => handleEliminarAsistente(a.id)}
                    className="text-slate-400 hover:text-red-600 text-base leading-none px-1">
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* NPS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Encuesta NPS</h2>

        {/* Form nueva respuesta */}
        <form onSubmit={handleNps} className="mb-6 pb-6 border-b border-slate-100">
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Puntuación (1–10) *</label>
              <input
                required type="number" min={1} max={10}
                value={npsForm.puntuacion}
                onChange={e => setNpsForm({...npsForm, puntuacion: e.target.value})}
                placeholder="Ej: 9"
                className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="w-48">
              <label className="text-xs text-slate-500 mb-1 block">Espectador (opcional)</label>
              <select
                value={npsForm.espectadorId}
                onChange={e => setNpsForm({...npsForm, espectadorId: e.target.value})}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white"
              >
                <option value="">— Anónimo —</option>
                {espectadores.map(e => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">Comentario (opcional)</label>
              <input
                value={npsForm.comentario}
                onChange={e => setNpsForm({...npsForm, comentario: e.target.value})}
                placeholder="¿Qué le pareció la función?"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <button type="submit" disabled={enviandoNps}
              className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50 shrink-0">
              {enviandoNps ? "Enviando..." : "+ Registrar"}
            </button>
          </div>
        </form>

        {/* Lista de respuestas */}
        {fn.npsList.length === 0 ? (
          <p className="text-sm text-slate-400">Sin respuestas NPS aún.</p>
        ) : (
          <div className="space-y-3">
            {fn.npsList.map(n => {
              const cat = npsCategoria(n.puntuacion);
              return (
                <div key={n.id} className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className={`text-lg font-bold w-8 text-center rounded-lg py-0.5 ${cat.color}`}>
                    {n.puntuacion}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cat.color}`}>{cat.label}</span>
                      {n.espectador && (
                        <Link href={`/dashboard/audiencia/${n.espectador.id}`}
                          className="text-xs text-brand-600 hover:underline">{n.espectador.nombre}</Link>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {new Date(n.creadoEn).toLocaleDateString("es-CO", { day:"2-digit", month:"short" })}
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
