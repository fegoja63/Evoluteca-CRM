"use client";

import { useEffect, useState } from "react";
import { IconCalendarUp, IconCircleCheck, IconPlugConnected, IconTrash } from "@tabler/icons-react";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { SkeletonLista } from "@/components/ui/estados";
import { toast } from "@/lib/toast";

type Estado = { conectado: boolean; proveedor: string | null };

/**
 * Mi perfil › Tu calendario de Google u Outlook: pegar la dirección secreta
 * iCal para que el enlace para agendar no ofrezca las horas ocupadas allá.
 */
export default function CalendarioExterno() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [url, setUrl] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    fetch("/api/perfil/calendario-externo").then(r => r.json()).then(setEstado).catch(() => setEstado({ conectado: false, proveedor: null }));
  }, []);

  async function conectar() {
    if (!url.trim()) return;
    setTrabajando(true);
    const res = await fetch("/api/perfil/calendario-externo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => null);
    setTrabajando(false);
    const cuerpo = await res?.json().catch(() => null);
    if (!res?.ok) { toast.error(cuerpo?.error ?? "No se pudo conectar el calendario."); return; }
    setEstado({ conectado: true, proveedor: cuerpo.proveedor });
    setUrl("");
    toast.success(`Calendario conectado: ${cuerpo.eventos} evento(s) ocupado(s) en los próximos 14 días.`);
  }

  async function desconectar() {
    if (!confirm("¿Desconectar tu calendario? El enlace para agendar volverá a mirar solo la Agenda del CRM.")) return;
    setTrabajando(true);
    const res = await fetch("/api/perfil/calendario-externo", { method: "DELETE" }).catch(() => null);
    setTrabajando(false);
    if (res?.ok) setEstado({ conectado: false, proveedor: null });
  }

  return (
    <div className={tarjeta("p-5 mt-6")}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
        <IconCalendarUp size={16} stroke={1.75} /> Tu calendario de Google u Outlook
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Conecta tu calendario para que tu enlace para agendar no ofrezca las horas en las que ya tienes algo allá.
        El CRM solo lee cuándo estás ocupado; no cambia nada en tu calendario. Para ver tus actividades del CRM en
        Google u Outlook, usa &quot;Agenda en tu calendario&quot; (más abajo).
      </p>

      {!estado ? (
        <SkeletonLista filas={1} />
      ) : estado.conectado ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
            <IconCircleCheck size={16} stroke={2} /> {estado.proveedor} conectado
          </span>
          <button type="button" onClick={desconectar} disabled={trabajando}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            <IconTrash size={14} stroke={1.75} /> Desconectar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="url" inputMode="url" placeholder="Pega aquí la dirección secreta (https://calendar.google.com/…/basic.ics)"
              value={url} onChange={e => setUrl(e.target.value)} className={campo("md", "flex-1 min-w-0 text-base sm:text-sm")} />
            <button type="button" onClick={conectar} disabled={trabajando || !url.trim()} className={boton("primario", "md", "shrink-0 flex")}>
              <IconPlugConnected size={15} stroke={1.75} /> {trabajando ? "Probando…" : "Conectar"}
            </button>
          </div>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-600 select-none">¿Dónde encuentro esa dirección?</summary>
            <ul className="mt-2 space-y-1.5 list-disc pl-4">
              <li>
                <span className="font-medium text-slate-600">Google Calendar</span> (en el computador): ⚙ Configuración → en
                &quot;Configuración de mis calendarios&quot; elige tu calendario → &quot;Integrar el calendario&quot; →
                copia la <span className="font-medium">&quot;Dirección secreta en formato iCal&quot;</span>.
              </li>
              <li>
                <span className="font-medium text-slate-600">Outlook</span>: Configuración → Calendario → Calendarios compartidos →
                &quot;Publicar un calendario&quot; → elige el calendario y &quot;Puede ver cuándo estoy ocupado&quot; →
                Publicar → copia el vínculo ICS.
              </li>
              <li>
                <span className="font-medium text-slate-600">iCloud</span>: en la app Calendario, comparte el calendario como
                &quot;Calendario público&quot; y copia el enlace (empieza por webcal://).
              </li>
            </ul>
            <p className="mt-2 text-amber-700">Esa dirección es privada: quien la tenga puede ver tu calendario. No la compartas con nadie más.</p>
          </details>
        </div>
      )}
    </div>
  );
}
