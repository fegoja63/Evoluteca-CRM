"use client";

import { useEffect, useState } from "react";
import { IconCalendarPlus, IconCopy, IconCheck, IconRefresh, IconTrash, IconExternalLink } from "@tabler/icons-react";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { SkeletonLista } from "@/components/ui/estados";
import { toast } from "@/lib/toast";

type Config = { dias: number[]; desde: string; hasta: string; duracion: number; anticipacionHoras: number; diasAdelante: number };
type Estado = { enlace: string | null; config: Config };

const DIAS = [
  { n: 1, l: "L" }, { n: 2, l: "M" }, { n: 3, l: "X" }, { n: 4, l: "J" }, { n: 5, l: "V" }, { n: 6, l: "S" }, { n: 0, l: "D" },
];

/** Mi perfil › Enlace para agendar: el link que el vendedor comparte y su horario. */
export default function EnlaceAgendar() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function aplicar(e: Estado) { setEstado(e); setConfig(e.config); }

  useEffect(() => {
    fetch("/api/perfil/agenda").then(r => r.json()).then(aplicar).catch(() => {});
  }, []);

  async function llamar(method: "POST" | "DELETE" | "PUT", body?: unknown) {
    if (method === "POST" && estado?.enlace && !confirm("Se creará un enlace nuevo y el anterior dejará de funcionar. ¿Continuar?")) return;
    if (method === "DELETE" && !confirm("Nadie podrá agendar con el enlace actual. ¿Desactivarlo?")) return;
    setTrabajando(true);
    const res = await fetch("/api/perfil/agenda", {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setTrabajando(false);
    if (!res?.ok) {
      const err = await res?.json().catch(() => null);
      toast.error(err?.error ?? "No se pudo guardar. Revisa el horario e inténtalo de nuevo.");
      return;
    }
    aplicar(await res.json());
    if (method === "PUT") toast.success("Horario guardado.");
  }

  async function copiar() {
    if (!estado?.enlace) return;
    await navigator.clipboard.writeText(estado.enlace).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const alternarDia = (n: number) => config && setConfig({
    ...config, dias: config.dias.includes(n) ? config.dias.filter(d => d !== n) : [...config.dias, n],
  });

  return (
    <div className={tarjeta("p-5 mt-6")}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
        <IconCalendarPlus size={16} stroke={1.75} /> Enlace para agendar reuniones
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Comparte este enlace (en tu firma de correo, por WhatsApp o en una cotización) y el cliente elige una hora libre
        de tu agenda. La reunión queda en tu Agenda del CRM, te llega un aviso y el cliente recibe la invitación por correo.
      </p>

      {!estado || !config ? (
        <SkeletonLista filas={2} />
      ) : !estado.enlace ? (
        <button type="button" onClick={() => llamar("POST")} disabled={trabajando} className={boton("primario", "lg", "flex")}>
          <IconCalendarPlus size={16} stroke={1.75} /> {trabajando ? "Activando..." : "Activar mi enlace para agendar"}
        </button>
      ) : (
        <div className="space-y-5">
          <div className="flex gap-2">
            <input type="text" readOnly value={estado.enlace} onFocus={e => e.target.select()}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 outline-none" />
            <button type="button" onClick={copiar} className={boton("primario", "lg", "shrink-0 flex")}>
              {copiado ? <><IconCheck size={15} stroke={2} /> Copiado</> : <><IconCopy size={15} stroke={1.75} /> Copiar</>}
            </button>
            <a href={estado.enlace} target="_blank" rel="noreferrer" className={boton("secundario", "lg", "shrink-0 flex")} title="Ver como cliente">
              <IconExternalLink size={15} stroke={1.75} />
            </a>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Tu horario para reuniones (hora de Colombia)</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {DIAS.map(d => (
                <button key={d.n} type="button" onClick={() => alternarDia(d.n)}
                  className={`h-9 w-9 rounded-full text-xs font-semibold border transition-colors ${config.dias.includes(d.n) ? "bg-brand-600 border-brand-600 text-white" : "border-slate-200 text-slate-500"}`}>
                  {d.l}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="text-xs text-slate-500">Desde
                <input type="time" step={900} value={config.desde} onChange={e => setConfig({ ...config, desde: e.target.value })} className={campo("md", "w-full mt-1")} />
              </label>
              <label className="text-xs text-slate-500">Hasta
                <input type="time" step={900} value={config.hasta} onChange={e => setConfig({ ...config, hasta: e.target.value })} className={campo("md", "w-full mt-1")} />
              </label>
              <label className="text-xs text-slate-500">Duración
                <select value={config.duracion} onChange={e => setConfig({ ...config, duracion: Number(e.target.value) })} className={campo("md", "w-full mt-1")}>
                  {[15, 30, 45, 60, 90].map(n => <option key={n} value={n}>{n} min</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">Aviso mínimo
                <select value={config.anticipacionHoras} onChange={e => setConfig({ ...config, anticipacionHoras: Number(e.target.value) })} className={campo("md", "w-full mt-1")}>
                  {[0, 2, 4, 12, 24, 48].map(n => <option key={n} value={n}>{n === 0 ? "Sin mínimo" : `${n} h antes`}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">Hasta cuándo
                <select value={config.diasAdelante} onChange={e => setConfig({ ...config, diasAdelante: Number(e.target.value) })} className={campo("md", "w-full mt-1")}>
                  {[7, 14, 21, 30].map(n => <option key={n} value={n}>Próximos {n} días</option>)}
                </select>
              </label>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">No se ofrecen las horas en las que ya tienes reuniones, llamadas o visitas en la Agenda.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => llamar("PUT", config)} disabled={trabajando} className={boton("primario", "md", "flex")}>
              <IconCheck size={15} stroke={2} /> Guardar horario
            </button>
            <button type="button" onClick={() => llamar("POST")} disabled={trabajando} className={boton("secundario", "md", "flex")}>
              <IconRefresh size={15} stroke={1.75} /> Enlace nuevo
            </button>
            <button type="button" onClick={() => llamar("DELETE")} disabled={trabajando}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
              <IconTrash size={15} stroke={1.75} /> Desactivar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
