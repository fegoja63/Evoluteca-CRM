"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Salon = { id: string; nombre: string };
type Cotizacion = {
  id: string;
  estado: "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA";
  salonId: string | null;
  fechaEvento: string | null;
  empresa: { nombre: string } | null;
};

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function CalendarioSalonesPage() {
  const hoy = new Date();
  const [salones, setSalones] = useState<Salon[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [salonId, setSalonId] = useState("");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1); // 1-12
  const [cargando, setCargando] = useState(true);

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
    return mapa;
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
          <p className="text-3xl mb-3">🏛️</p>
          <p className="text-sm text-slate-500 mb-4">Aún no tienes salones registrados.</p>
          <Link href="/dashboard/salones" className="text-sm text-blue-600 hover:underline">Agregar salón →</Link>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select value={salonId} onChange={e => setSalonId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
              {salones.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <button onClick={() => cambiarMes(-1)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50">←</button>
              <span className="text-sm font-semibold text-slate-700 w-40 text-center">{MESES[mes - 1]} {anio}</span>
              <button onClick={() => cambiarMes(1)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50">→</button>
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
                return (
                  <div key={i} className={`min-h-[72px] rounded-lg border p-1.5 ${
                    dia == null ? "border-transparent" : reservas?.length ? "border-red-200 bg-red-50" : "border-slate-100"
                  }`}>
                    {dia != null && (
                      <>
                        <p className="text-xs text-slate-400 mb-1">{dia}</p>
                        {reservas?.map(r => (
                          <Link key={r.id} href={`/dashboard/cotizaciones-formales/${r.id}`}
                            className="block truncate text-[11px] font-medium text-red-700 hover:underline">
                            {r.empresa?.nombre ?? "Sin empresa"}
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">Se muestran solo las cotizaciones con estado "Aceptada" — las reservas confirmadas del salón.</p>
        </>
      )}
    </div>
  );
}
