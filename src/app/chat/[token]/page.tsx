"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { IconSend, IconCalendarEvent } from "@tabler/icons-react";
import { paletaMarca } from "@/lib/color-marca";
import { campo } from "@/components/ui/estilos";
import { MAX_MENSAJE } from "@/lib/agente-web";

type Config = { nombre: string; saludo: string; empresa: { nombre: string; logoUrl: string | null; colorMarca: string | null } };
type Mensaje = { rol: "visitante" | "agente"; texto: string };
type Guardado = { conversacionId?: string; secreto?: string; mensajes: Mensaje[]; agendaUrl?: string | null };

// Chat con IA de la página web del cliente (ver lib/agente-web.ts). Se abre
// directo (/chat/<token>) o dentro del botón que pone /agente-web.js. La
// conversación se recuerda en este navegador para retomarla al volver.
export default function ChatPage() {
  const { token } = useParams<{ token: string }>();
  const clave = `evoluteca-chat:${token}`;
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState("");
  const [estado, setEstado] = useState<Guardado>({ mensajes: [] });
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const g = JSON.parse(localStorage.getItem(clave) ?? "null") as Guardado | null;
      if (g && Array.isArray(g.mensajes)) setEstado(g);
    } catch { /* sin almacenamiento: empieza de cero */ }
    fetch(`/api/publica/agente/${token}`)
      .then(async r => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => ({}))).error)))
      .then(setConfig)
      .catch((e: unknown) => setError(typeof e === "string" ? e : "Este chat no está disponible."));
  }, [token, clave]);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: "smooth" }); }, [estado.mensajes.length, enviando]);

  function guardar(g: Guardado) {
    setEstado(g);
    try { localStorage.setItem(clave, JSON.stringify(g)); } catch { /* sin almacenamiento */ }
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    setAviso("");
    setTexto("");
    const conMio = { ...estado, mensajes: [...estado.mensajes, { rol: "visitante" as const, texto: mensaje }] };
    setEstado(conMio);
    setEnviando(true);
    const res = await fetch(`/api/publica/agente/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversacionId: estado.conversacionId, secreto: estado.secreto, mensaje,
        pagina: (new URLSearchParams(window.location.search).get("pagina") || document.referrer || "").slice(0, 300) || undefined,
      }),
    }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setEstado(estado); // el mensaje no quedó: se devuelve al campo para reintentar
      setTexto(mensaje);
      setAviso(d?.error ?? "No se pudo enviar. Revise su conexión e inténtelo de nuevo.");
      return;
    }
    guardar({
      conversacionId: d.conversacionId, secreto: d.secreto, agendaUrl: d.agendaUrl ?? estado.agendaUrl ?? null,
      mensajes: [...conMio.mensajes, { rol: "agente", texto: d.respuesta }],
    });
  }

  if (error) return (
    <main className="flex h-dvh items-center justify-center bg-white p-6"><p className="text-sm text-slate-500">{error}</p></main>
  );
  if (!config) return <main className="h-dvh bg-white" />;

  const marca = paletaMarca(config.empresa.colorMarca);

  return (
    <main className="flex h-dvh flex-col bg-white">
      <header className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: marca.oscuro }}>
        {config.empresa.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.empresa.logoUrl} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{config.empresa.nombre}</p>
          <p className="truncate text-xs" style={{ color: marca.sobreOscuroSuave }}>{config.nombre} · responde al instante</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-4">
        <Burbuja rol="agente" texto={config.saludo} />
        {estado.mensajes.map((m, i) => <Burbuja key={i} rol={m.rol} texto={m.texto} fondo={marca.oscuro} />)}
        {enviando && (
          <div className="flex gap-1 px-2 py-2">{[0, 1, 2].map(i => (
            <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}</div>
        )}
        {estado.agendaUrl && !enviando && (
          <div className="flex justify-start">
            <a href={estado.agendaUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: marca.oscuro }}>
              <IconCalendarEvent size={16} stroke={2} />Agendar una reunión
            </a>
          </div>
        )}
        <div ref={fin} />
      </div>

      <form onSubmit={enviar} className="border-t border-slate-200 bg-white p-3">
        {aviso && <p className="mb-2 text-xs text-red-600">{aviso}</p>}
        <div className="flex items-end gap-2">
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} maxLength={MAX_MENSAJE}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            placeholder="Escriba su mensaje…" aria-label="Mensaje"
            className={campo("md", "max-h-32 min-h-[42px] flex-1 resize-none")} />
          <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
            style={{ backgroundColor: marca.oscuro }}>
            <IconSend size={18} stroke={2} />
          </button>
        </div>
        <p className="mt-2 text-center text-2xs text-slate-400">
          Asistente con IA. Si deja sus datos, {config.empresa.nombre} los usará solo para contactarlo.
        </p>
      </form>
    </main>
  );
}

function Burbuja({ rol, texto, fondo }: { rol: "visitante" | "agente"; texto: string; fondo?: string }) {
  const mio = rol === "visitante";
  return (
    <div className={mio ? "flex justify-end" : "flex justify-start"}>
      <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${mio ? "text-white" : "border border-slate-200 bg-white text-slate-800"}`}
        style={mio ? { backgroundColor: fondo } : undefined}>
        {texto}
      </p>
    </div>
  );
}
