"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { IconBuildingPavilion, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

type Salon = { id: string; nombre: string };
type Cotizacion = {
  id: string;
  estado: "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA";
  salonId: string | null;
  fechaEvento: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  empresa: { nombre: string } | null;
};

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ESTADO_LABEL: Record<string, string> = { BORRADOR: "Borrador", ENVIADA: "Enviada", ACEPTADA: "Aceptada", RECHAZADA: "Rechazada" };

export default function CalendarioSalonesPage() {
  const hoy = new Date();
  const [salones, setSalones] = useState<Salon[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [salonId, setSalonId] = useState("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1); // 1-12
  const [cargando, setCargando] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDia, setDragOverDia] = useState<number | null>(null);
  const [moviendo, setMoviendo] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/salones").then(r => r.json()),
      fetch("/api/cotizaciones").then(r => r.json()),
    ]).then(([s, c]) => {
      const listaSalones = Array.isArray(s) ? s : [];
      setSalones(listaSalones);
      setCotizaciones(Array.isArray(c) ? c : []);
      if (listaSalones.length > 0) setSalonId(listaSalones[0].id);
      setCargando(false);
    });
  }, []);

  const reservasDelMes = useMemo(() => {
    if (!salonId) return new Map<number, Cotizacion[]>();
    const mapa = new Map<number, Cotizacion[]>();
    for (const c of cotizaciones) {
      if (c.salonId !== salonId || c.estado !== "ACEPTADA" || !c.fechaEvento) continue;
      const f = new Date(c.fechaEvento);
      if (f.getUTCFullYear() !== anio || f.getUTCMonth() + 1 !== mes) continue;
      const dia = f.getUTCDate();
      mapa.set(dia, [...(mapa.get(dia) ?? []), c]);
    }
    // Ordena por hora de inicio dentro del mismo día — las reservas de día
    // completo (sin hora) van primero.
    Array.from(mapa.entries()).forEach(([dia, reservas]) => {
      mapa.set(dia, [...reservas].sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "")));
    });
    return mapa;
  }, [cotizaciones, salonId, anio, mes]);

  // Cotizaciones del mismo salón/mes que aún no están aceptadas — se
  // muestran aparte (no en el calendario) para no confundirlas con las
  // reservas ya confirmadas, pero siguen siendo útiles de ver venir.
  const pendientesDelMes = useMemo(() => {
    if (!salonId) return [];
    return cotizaciones
      .filter(c => c.salonId === salonId && c.estado !== "ACEPTADA" && c.estado !== "RECHAZADA" && c.fechaEvento)
      .filter(c => {
        const f = new Date(c.fechaEvento!);
        return f.getUTCFullYear() === anio && f.getUTCMonth() + 1 === mes;
      })
      .sort((a, b) => new Date(a.fechaEvento!).getTime() - new Date(b.fechaEvento!).getTime());
  }, [cotizaciones, salonId, anio, mes]);

  const celdas = useMemo(() => {
    const primerDia = new Date(Date.UTC(anio, mes - 1, 1));
    const offset = (primerDia.getUTCDay() + 6) % 7; // 0 = lunes
    const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const arr: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= diasEnMes; d++) arr.push(d);
    return arr;
  }, [anio, mes]);

  function cambiarMes(delta: number) {
    let m = mes + delta;
    let a = anio;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m);
    setAnio(a);
  }

  async function handleDrop(dia: number | null) {
    const draggedId = draggingId;
    setDraggingId(null);
    setDragOverDia(null);
    if (dia == null || !draggedId || moviendo) return;

    const cot = cotizaciones.find(c => c.id === draggedId);
    if (!cot) return;

    if (cot.fechaEvento) {
      const actual = new Date(cot.fechaEvento);
      if (actual.getUTCFullYear() === anio && actual.getUTCMonth() + 1 === mes && actual.getUTCDate() === dia) return;
    }

    const nuevaFecha = `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    setMoviendo(true);
    const res = await fetch(`/api/salones/disponibilidad?salonId=${encodeURIComponent(salonId)}&fecha=${encodeURIComponent(nuevaFecha)}&excluirCotizacionId=${encodeURIComponent(draggedId)}`);
    const disp = await res.json();
    if (disp.aceptadas?.length > 0) {
      const nombres = disp.aceptadas.map((c: { empresa: { nombre: string } | null }) => c.empresa?.nombre ?? "Sin empresa").join(", ");
      if (!confirm(`Ese día ya tiene otra reserva aceptada para este salón (${nombres}). ¿Mover de todas formas?`)) {
        setMoviendo(false);
        return;
      }
    }

    // Guardado optimista con reversión: si el PATCH no persiste, se restaura
    // la fecha anterior y se avisa, para no dejar en pantalla una reserva
    // "movida" que en realidad no se guardó.
    const previas = cotizaciones;
    setCotizaciones(prev => prev.map(c => c.id === draggedId ? { ...c, fechaEvento: new Date(Date.UTC(anio, mes - 1, dia)).toISOString() } : c));
    try {
      const guardar = await fetch(`/api/cotizaciones/${draggedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaEvento: nuevaFecha }),
      });
      if (!guardar.ok) throw new Error();
    } catch {
      setCotizaciones(previas);
      toast.error("No se pudo reprogramar la reserva. Revisa tu conexión e inténtalo de nuevo.");
    }
    setMoviendo(false);
  }

  if (cargando) return <p className="text-sm text-slate-400 p-6">Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/salones" className="text-slate-400 hover:text-slate-700 text-sm">
          ← Salones
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Calendario de reservas</h1>
      </div>

      {salones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <IconBuildingPavilion size={32} stroke={1.5} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500 mb-4">Aún no tienes salones registrados.</p>
          <Link href="/dashboard/salones" className="text-sm text-brand-600 hover:underline">Agregar salón →</Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={salonId} onChange={e => setSalonId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
              {salones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <button onClick={() => cambiarMes(-1)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50 flex items-center"><IconChevronLeft size={14} stroke={1.75} /></button>
              <span className="text-sm font-semibold text-slate-700 w-40 text-center">{MESES[mes - 1]} {anio}</span>
              <button onClick={() => cambiarMes(1)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50 flex items-center"><IconChevronRight size={14} stroke={1.75} /></button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map((d, i) => (
                <div key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((dia, i) => {
                const reservas = dia ? reservasDelMes.get(dia) : undefined;
                const isOver = dia != null && dragOverDia === dia;
                return (
                  <div key={i}
                    onDragOver={e => { if (dia != null) { e.preventDefault(); setDragOverDia(dia); } }}
                    onDragLeave={() => setDragOverDia(prev => prev === dia ? null : prev)}
                    onDrop={e => { e.preventDefault(); handleDrop(dia); }}
                    className={`min-h-[72px] rounded-lg border p-1.5 transition-colors ${
                      dia == null ? "border-transparent" :
                      isOver ? "border-brand-300 bg-brand-50" :
                      reservas?.length ? "border-red-200 bg-red-50" : "border-slate-100"
                    }`}>
                    {dia != null && (
                      <>
                        <p className="text-xs text-slate-400 mb-1">{dia}</p>
                        {reservas?.map(r => (
                          <div key={r.id}
                            draggable
                            onDragStart={e => { e.dataTransfer.setData("cotizacionId", r.id); e.dataTransfer.effectAllowed = "move"; setDraggingId(r.id); }}
                            onDragEnd={() => { setDraggingId(null); setDragOverDia(null); }}
                            className={`cursor-grab active:cursor-grabbing ${draggingId === r.id ? "opacity-40" : ""}`}>
                            <Link href={`/dashboard/cotizaciones-formales/${r.id}`}
                              onClick={e => { if (draggingId) e.preventDefault(); }}
                              className="block truncate text-[11px] font-medium text-red-700 hover:underline">
                              {r.horaInicio ? `${r.horaInicio} ` : ""}{r.empresa?.nombre ?? "Sin empresa"}
                            </Link>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Se muestran solo las cotizaciones con estado "Aceptada" — las reservas confirmadas del salón. Arrastra una reserva a otro día para reprogramarla.</p>

          {pendientesDelMes.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Cotizaciones con fecha este mes, aún no aceptadas ({pendientesDelMes.length})
              </p>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 divide-y divide-amber-100">
                {pendientesDelMes.map(c => {
                  const f = new Date(c.fechaEvento!);
                  const fechaLabel = `${f.getUTCDate()} de ${MESES[f.getUTCMonth()].toLowerCase()}`;
                  return (
                    <Link key={c.id} href={`/dashboard/cotizaciones-formales/${c.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-amber-100/60">
                      <span className="text-slate-700">
                        <span className="font-medium">{c.empresa?.nombre ?? "Sin empresa"}</span>
                        <span className="text-slate-400"> · {fechaLabel}{c.horaInicio ? ` · ${c.horaInicio}` : ""}</span>
                      </span>
                      <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        {ESTADO_LABEL[c.estado]}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
