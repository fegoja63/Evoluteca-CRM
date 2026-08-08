"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { IconMail, IconSend, IconX, IconChevronDown, IconChevronUp } from "@tabler/icons-react";

type Correo = {
  id: string;
  direccion: "ENVIADO" | "RECIBIDO";
  de: string;
  para: string;
  asunto: string;
  cuerpo: string;
  fecha: string;
};

type Props = {
  contactoId?: string;
  empresaId?: string;
  oportunidadId?: string;
  // Correo del contacto, para precargar el destinatario.
  emailDestino?: string | null;
};

export function CorreosPanel({ contactoId, empresaId, oportunidadId, emailDestino }: Props) {
  const [correos, setCorreos] = useState<Correo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [redactando, setRedactando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  const [para, setPara] = useState(emailDestino ?? "");
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");

  const query = new URLSearchParams();
  if (contactoId) query.set("contactoId", contactoId);
  if (empresaId) query.set("empresaId", empresaId);
  if (oportunidadId) query.set("oportunidadId", oportunidadId);
  const qs = query.toString();

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch(`/api/correos?${qs}`);
    setCorreos(res.ok ? await res.json() : []);
    setCargando(false);
  }, [qs]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPara(emailDestino ?? ""); }, [emailDestino]);

  async function enviar() {
    if (!para.trim()) { toast.error("Falta el correo del destinatario."); return; }
    if (!asunto.trim()) { toast.error("Ponle un asunto."); return; }
    if (!cuerpo.trim()) { toast.error("El mensaje está vacío."); return; }
    setEnviando(true);
    const res = await fetch("/api/correos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ para: para.trim(), asunto: asunto.trim(), cuerpo, contactoId, empresaId, oportunidadId }),
    });
    setEnviando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo enviar el correo.");
      return;
    }
    toast.success("Correo enviado.");
    setAsunto(""); setCuerpo(""); setRedactando(false);
    cargar();
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <IconMail size={16} stroke={1.75} />Correos {correos.length > 0 && <span className="text-slate-400 font-normal">({correos.length})</span>}
        </h2>
        <button onClick={() => setRedactando(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-700">
          {redactando ? <><IconX size={14} stroke={2} />Cerrar</> : <><IconSend size={14} stroke={1.75} />Redactar</>}
        </button>
      </div>

      {redactando && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 mb-4">
          <div className="flex flex-col gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Para</label>
              <input type="email" value={para} onChange={e => setPara(e.target.value)}
                placeholder="cliente@empresa.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Asunto</label>
              <input value={asunto} onChange={e => setAsunto(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Mensaje</label>
              <textarea value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={enviar} disabled={enviando}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                <IconSend size={15} stroke={1.75} />{enviando ? "Enviando..." : "Enviar"}
              </button>
              <span className="text-[11px] text-slate-400">Se envía desde tu CRM; las respuestas quedan registradas aquí y te llegan a tu correo.</span>
            </div>
          </div>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : correos.length === 0 ? (
        <p className="text-xs text-slate-400">Sin correos registrados. Usa &ldquo;Redactar&rdquo; para enviar el primero.</p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {correos.map(c => {
            const abierto = expandido === c.id;
            return (
              <div key={c.id} className="py-2.5">
                <button onClick={() => setExpandido(abierto ? null : c.id)} className="w-full text-left flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${c.direccion === "ENVIADO" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-700"}`}>
                    {c.direccion === "ENVIADO" ? "Enviado" : "Recibido"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.asunto}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {c.direccion === "ENVIADO" ? `Para ${c.para}` : `De ${c.de}`} · {new Date(c.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {abierto ? <IconChevronUp size={15} className="text-slate-300 shrink-0 mt-1" /> : <IconChevronDown size={15} className="text-slate-300 shrink-0 mt-1" />}
                </button>
                {abierto && (
                  <div className="mt-2 ml-1 whitespace-pre-wrap text-sm text-slate-600 border-l-2 border-slate-100 pl-3">
                    {c.cuerpo}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
