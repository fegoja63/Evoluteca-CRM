"use client";

import { useEffect, useRef, useState } from "react";
import { IconBuildingSkyscraper, IconFileUpload, IconSparkles, IconTrash, IconX } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { formatoDia } from "@/lib/fecha-bogota";
import { MAX_BYTES_ANALISIS, MAX_TEXTO_ANALISIS, MIN_TEXTO_ANALISIS } from "@/lib/analisis-cliente";

type Analisis = {
  fuentes: string; situacion: string; desafios: string[]; objetivos: string[];
  plazo: string | null; exito: string | null; dondeAyudar: string[]; preguntas: string[]; actualizadoEn: string;
};

// Tarjeta "Análisis del negocio" de la ficha del cliente: el vendedor sube un
// documento (informe anual, presentación) o pega noticias y la IA resume su
// situación, desafíos, objetivos, plazo, cómo mide el éxito, dónde podemos
// ayudar y qué validar. Queda guardado y lo usan el Plan para ganar y
// Preparar reunión.
export function AnalisisClienteIA({ empresaId }: { empresaId: string }) {
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [cargado, setCargado] = useState(false);
  const [formulario, setFormulario] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/ia/analisis-cliente/${empresaId}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : { analisis: null }))
      .then(d => setAnalisis(d.analisis ?? null))
      .catch(() => {})
      .finally(() => setCargado(true));
  }, [empresaId]);

  function elegir(f: File | null) {
    if (f && f.size > MAX_BYTES_ANALISIS) { toast.error("El archivo pesa más de 4 MB. Suba solo las páginas más relevantes."); return; }
    setArchivo(f);
  }

  async function analizar() {
    setAnalizando(true);
    const form = new FormData();
    if (archivo) form.append("archivo", archivo);
    if (texto.trim()) form.append("texto", texto.trim());
    try {
      const res = await fetch(`/api/ia/analisis-cliente/${empresaId}`, { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error ?? "No se pudo analizar el material."); return; }
      setAnalisis(d.analisis);
      setFormulario(false); setArchivo(null); setTexto("");
      toast.success("Análisis guardado. El Plan para ganar y Preparar reunión ya lo tienen en cuenta.");
    } catch {
      toast.error("No se pudo analizar el material. Revise su conexión e inténtelo de nuevo.");
    } finally {
      setAnalizando(false);
    }
  }

  async function borrar() {
    if (!confirm("¿Borrar el análisis de este cliente?")) return;
    const res = await fetch(`/api/ia/analisis-cliente/${empresaId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("No se pudo borrar el análisis."); return; }
    setAnalisis(null);
    toast.success("Análisis borrado");
  }

  const puedeAnalizar = !analizando && (!!archivo || texto.trim().length >= MIN_TEXTO_ANALISIS);

  return (
    <div className={tarjeta("p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center">
          <IconBuildingSkyscraper size={20} stroke={1.75} className="text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">Análisis del negocio del cliente</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {analisis
              ? `De ${analisis.fuentes} · ${formatoDia(new Date(analisis.actualizadoEn))}`
              : "Suba su informe anual o presentación, o pegue noticias, y la IA resume qué le importa."}
          </p>
        </div>
        {cargado && !formulario && (
          <button onClick={() => setFormulario(true)} className={boton(analisis ? "secundario" : "primario", "sm", "shrink-0")}>
            <IconSparkles size={14} stroke={2} />{analisis ? "Analizar de nuevo" : "Analizar con IA"}
          </button>
        )}
      </div>

      {formulario && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-600">Documento (opcional)</p>
            <input ref={inputArchivo} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt" className="hidden"
              onChange={e => elegir(e.target.files?.[0] ?? null)} />
            {archivo ? (
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <IconFileUpload size={16} stroke={1.75} className="text-brand-600" />
                <span className="truncate">{archivo.name}</span>
                <button type="button" onClick={() => { setArchivo(null); if (inputArchivo.current) inputArchivo.current.value = ""; }}
                  aria-label="Quitar archivo" className="text-slate-400 hover:text-red-500"><IconX size={15} stroke={2} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => inputArchivo.current?.click()} className={boton("secundario", "sm")}>
                <IconFileUpload size={14} stroke={1.75} />Elegir PDF, foto o texto
              </button>
            )}
            <p className="mt-1 text-2xs text-slate-400">Informe anual, presentación corporativa, informe de sostenibilidad… Máximo 4 MB.</p>
          </div>
          <label className="text-xs font-semibold text-slate-600">
            Noticias, iniciativas o datos del sector (opcional)
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={5} maxLength={MAX_TEXTO_ANALISIS}
              placeholder="Pegue aquí noticias recientes del cliente, lo que dijo en una reunión sobre sus planes, datos de su industria…"
              className={campo("md", "mt-1 w-full resize-y font-normal")} />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={analizar} disabled={!puedeAnalizar} className={boton("marca", "md")}>
              <IconSparkles size={16} stroke={2} />{analizando ? "Analizando…" : "Analizar"}
            </button>
            <button onClick={() => { setFormulario(false); setArchivo(null); setTexto(""); }} disabled={analizando}
              className="text-sm text-slate-500 hover:underline">Cancelar</button>
            <span className="ml-auto text-xs text-slate-400">
              {analisis ? "Reemplaza el análisis actual · " : ""}Usa 1 acción de IA
            </span>
          </div>
        </div>
      )}

      {analisis && !formulario && (
        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <p>{analisis.situacion}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Bloque titulo="Desafíos" items={analisis.desafios} />
            <Bloque titulo="Objetivos" items={analisis.objetivos} />
          </div>
          {(analisis.plazo || analisis.exito) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {analisis.plazo && <p><span className="font-semibold">Plazo:</span> {analisis.plazo}</p>}
              {analisis.exito && <p><span className="font-semibold">Cómo mide el éxito:</span> {analisis.exito}</p>}
            </div>
          )}
          {analisis.dondeAyudar.length > 0 && (
            <div className="rounded-xl bg-brand-50 px-3 py-2">
              <p className="text-xs font-bold text-brand-800">Dónde podemos ayudar</p>
              <ul className="mt-1 list-disc pl-5 text-brand-900">{analisis.dondeAyudar.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          <Bloque titulo="Preguntas para validar con el cliente" items={analisis.preguntas} />
          <div className="flex justify-end">
            <button onClick={borrar} className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline">
              <IconTrash size={13} stroke={1.75} />Borrar análisis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Bloque({ titulo, items }: { titulo: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </div>
  );
}
