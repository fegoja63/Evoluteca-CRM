"use client";

import { useState } from "react";
import { IconCheck, IconCopy, IconMailForward, IconSend, IconSparkles, IconX } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo } from "@/components/ui/estilos";
import { contarPalabras, PALABRAS_MAX_SEGUIMIENTO } from "@/lib/seguimiento-minuta";

type Respuesta = {
  correo: { asunto: string; cuerpo: string };
  para: string | null;
  contactoId: string | null;
  empresaId: string | null;
  oportunidadId: string | null;
};

// "Correo de seguimiento" de una minuta guardada: la IA redacta el borrador y
// el vendedor lo edita, lo copia o lo envía desde el CRM (queda en Correos).
// Nada se envía sin que el vendedor pulse "Enviar".
export function CorreoSeguimientoMinuta({ minutaId, destacado = false, onEnviado }: {
  minutaId: string;
  /** Recién guardada la minuta: el botón se resalta para invitar a usarlo. */
  destacado?: boolean;
  onEnviado?: () => void;
}) {
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [para, setPara] = useState("");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function redactar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/ia/seguimiento-minuta/${minutaId}`, { method: "POST" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? "No se pudo redactar el correo."); return; }
      setDatos(d);
      setPara(d.para ?? "");
      setAsunto(d.correo.asunto);
      setCuerpo(d.correo.cuerpo);
    } catch {
      toast.error("No se pudo redactar el correo. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`${asunto}\n\n${cuerpo}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* sin portapapeles */ }
  }

  async function enviar() {
    if (!datos) return;
    if (!para.trim()) { toast.error("Falta el correo del destinatario."); return; }
    if (!asunto.trim() || !cuerpo.trim()) { toast.error("El asunto y el mensaje no pueden quedar vacíos."); return; }
    setEnviando(true);
    const res = await fetch("/api/correos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        para: para.trim(), asunto: asunto.trim(), cuerpo,
        contactoId: datos.contactoId ?? undefined,
        empresaId: datos.empresaId ?? undefined,
        oportunidadId: datos.oportunidadId ?? undefined,
      }),
    });
    setEnviando(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "No se pudo enviar el correo.");
      return;
    }
    toast.success("Correo de seguimiento enviado.");
    setDatos(null);
    onEnviado?.();
  }

  if (!datos) {
    return (
      <button type="button" onClick={redactar} disabled={cargando}
        className={destacado ? boton("marca", "sm") : "inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline disabled:opacity-60"}>
        {destacado ? <IconSparkles size={14} stroke={2} /> : <IconMailForward size={13} stroke={2} />}
        {cargando ? "Redactando…" : "Correo de seguimiento"}
      </button>
    );
  }

  const palabras = contarPalabras(cuerpo);
  return (
    <div className="w-full rounded-xl border border-brand-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <IconMailForward size={14} stroke={1.75} className="text-brand-600" />Correo de seguimiento
        </p>
        <button type="button" onClick={() => setDatos(null)} aria-label="Cerrar" className="text-slate-400 hover:text-slate-700">
          <IconX size={15} stroke={1.75} />
        </button>
      </div>
      <p className="mb-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
        Borrador de la IA: revíselo antes de enviarlo. Nada sale hasta que pulse &quot;Enviar&quot;.
      </p>
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-500">Para
          <input type="email" value={para} onChange={e => setPara(e.target.value)} placeholder="cliente@empresa.com"
            className={campo("sm", "mt-1 w-full")} />
        </label>
        <label className="text-xs text-slate-500">Asunto
          <input value={asunto} onChange={e => setAsunto(e.target.value)} className={campo("sm", "mt-1 w-full")} />
        </label>
        <label className="text-xs text-slate-500">Mensaje
          <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={Math.max(7, cuerpo.split("\n").length + 1)}
            className={campo("sm", "mt-1 w-full leading-relaxed")} />
        </label>
        <p className={`text-right text-2xs ${palabras > PALABRAS_MAX_SEGUIMIENTO ? "text-amber-600" : "text-slate-400"}`}>
          {palabras} palabras{palabras > PALABRAS_MAX_SEGUIMIENTO ? ` (sugerido: máximo ${PALABRAS_MAX_SEGUIMIENTO})` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={enviar} disabled={enviando} className={boton("primario", "sm")}>
            <IconSend size={14} stroke={1.75} />{enviando ? "Enviando…" : "Enviar desde el CRM"}
          </button>
          <button type="button" onClick={copiar} className={boton("secundario", "sm")}>
            {copiado ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={1.75} />}{copiado ? "Copiado" : "Copiar"}
          </button>
          <button type="button" onClick={redactar} disabled={cargando} className="text-xs text-slate-500 hover:underline ml-auto">
            {cargando ? "Redactando…" : "Redactar de nuevo"}
          </button>
        </div>
      </div>
    </div>
  );
}
