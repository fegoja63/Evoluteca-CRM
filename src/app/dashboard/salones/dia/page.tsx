"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconBuildingPavilion, IconCircleCheck } from "@tabler/icons-react";

type Salon = { id: string; nombre: string; capacidad: number | null };
type Cotizacion = {
  id: string;
  estado: "BORRADOR" | "ENVIADA" | "ACEPTADA" | "RECHAZADA";
  salonId: string | null;
  fechaEvento: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  empresa: { nombre: string } | null;
};

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TablaDiaSalonesPage() {
  const [salones, setSalones] = useState<Salon[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [fecha, setFecha] = useState(hoyISO());
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/salones").then(r => r.json()),
      fetch("/api/cotizaciones").then(r => r.json()),
    ]).then(([s, c]) => {
      setSalones(Array.isArray(s) ? s : []);
      setCotizaciones(Array.isArray(c) ? c : []);
      setCargando(false);
    });
  }, []);

  const reservasPorSalon = useMemo(() => {
    const mapa = new Map<string, Cotizacion[]>();
    for (const c of cotizaciones) {
      if (!c.salonId || c.estado !== "ACEPTADA" || !c.fechaEvento) continue;
      if (c.fechaEvento.slice(0, 10) !== fecha) continue;
      mapa.set(c.salonId, [...(mapa.get(c.salonId) ?? []), c]);
    }
    Array.from(mapa.entries()).forEach(([salonId, reservas]) => {
      mapa.set(salonId, [...reservas].sort((a, b) => (a.horaInicio ?? "").localeCompare(b.horaInicio ?? "")));
    });
    return mapa;
  }, [cotizaciones, fecha]);

  const fechaFormateada = useMemo(() => {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }, [fecha]);

  if (cargando) return <p className="text-sm text-slate-400 p-6">Cargando...</p>;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard/salones" className="text-slate-400 hover:text-slate-700 text-sm">
          ← Salones
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold text-slate-900">Alquileres por día</h1>
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
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500" />
            <span className="text-sm text-slate-500 capitalize">{fechaFormateada}</span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold w-56">Salón</th>
                  <th className="px-4 py-3 text-left font-semibold">Reservas ese día</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salones.map(s => {
                  const reservas = reservasPorSalon.get(s.id) ?? [];
                  return (
                    <tr key={s.id}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-slate-800">{s.nombre}</p>
                        {s.capacidad != null && <p className="text-xs text-slate-400">{s.capacidad} pers.</p>}
                      </td>
                      <td className="px-4 py-3">
                        {reservas.length === 0 ? (
                          <span className="text-xs text-emerald-600 flex items-center gap-1 w-fit"><IconCircleCheck size={13} stroke={1.75} />Disponible todo el día</span>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {reservas.map(r => (
                              <Link key={r.id} href={`/dashboard/cotizaciones-formales/${r.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-xs text-red-700 hover:underline w-fit">
                                <span className="font-semibold">{r.horaInicio && r.horaFin ? `${r.horaInicio}–${r.horaFin}` : "Todo el día"}</span>
                                <span>{r.empresa?.nombre ?? "Sin empresa"}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">Se muestran solo las cotizaciones con estado "Aceptada" — las reservas confirmadas del salón.</p>
        </>
      )}
    </div>
  );
}
