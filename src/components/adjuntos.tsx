"use client";

import { useEffect, useRef, useState } from "react";
import { IconPaperclip, IconFile, IconFileTypePdf, IconPhoto, IconDownload, IconTrash, IconLoader2 } from "@tabler/icons-react";

type Adjunto = { id: string; nombre: string; tipo: string; tamano: number; creadoEn: string };

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function iconoPara(tipo: string) {
  if (tipo.startsWith("image/")) return IconPhoto;
  if (tipo === "application/pdf") return IconFileTypePdf;
  return IconFile;
}

function fmtTamano(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

interface AdjuntosProps {
  empresaId?: string;
  contactoId?: string;
  oportunidadId?: string;
}

export function Adjuntos({ empresaId, contactoId, oportunidadId }: AdjuntosProps) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [descargandoId, setDescargandoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const param = empresaId
    ? `empresaId=${empresaId}`
    : contactoId
    ? `contactoId=${contactoId}`
    : `oportunidadId=${oportunidadId}`;

  async function cargar() {
    setCargando(true);
    const res = await fetch(`/api/adjuntos?${param}`);
    setAdjuntos(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, [empresaId, contactoId, oportunidadId]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > MAX_BYTES) {
      setError("El archivo no puede pesar más de 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setSubiendo(true);
      const res = await fetch("/api/adjuntos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: file.name,
          tipo: file.type || "application/octet-stream",
          tamano: file.size,
          datos: String(reader.result),
          empresaId, contactoId, oportunidadId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo subir el archivo.");
      } else {
        await cargar();
      }
      setSubiendo(false);
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsDataURL(file);
  }

  async function descargar(id: string, nombre: string) {
    setDescargandoId(id);
    const res = await fetch(`/api/adjuntos/${id}`);
    const data = await res.json();
    setDescargandoId(null);
    if (!data.datos) return;
    const a = document.createElement("a");
    a.href = data.datos;
    a.download = nombre;
    a.click();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este archivo? Esta acción no se puede deshacer.")) return;
    setAdjuntos(prev => prev.filter(a => a.id !== id));
    await fetch(`/api/adjuntos/${id}`, { method: "DELETE" });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
          <IconPaperclip size={16} stroke={1.75} />Archivos adjuntos
        </h3>
        <button onClick={() => inputRef.current?.click()} disabled={subiendo}
          className="text-xs text-brand-600 hover:text-brand-800 font-medium disabled:opacity-50">
          {subiendo ? "Subiendo..." : "+ Subir archivo"}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {cargando ? (
        <p className="text-xs text-slate-400">Cargando...</p>
      ) : adjuntos.length === 0 ? (
        <p className="text-sm text-slate-400 italic">Sin archivos adjuntos.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {adjuntos.map(a => {
            const Icono = iconoPara(a.tipo);
            return (
              <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50">
                <Icono size={18} stroke={1.75} className="text-slate-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">{a.nombre}</p>
                  <p className="text-xs text-slate-400">{fmtTamano(a.tamano)} · {new Date(a.creadoEn).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
                <button onClick={() => descargar(a.id, a.nombre)} disabled={descargandoId === a.id}
                  className="text-slate-400 hover:text-brand-600 p-1 shrink-0" title="Descargar">
                  {descargandoId === a.id ? <IconLoader2 size={16} stroke={1.75} className="animate-spin" /> : <IconDownload size={16} stroke={1.75} />}
                </button>
                <button onClick={() => eliminar(a.id)} className="text-slate-400 hover:text-red-500 p-1 shrink-0" title="Eliminar">
                  <IconTrash size={16} stroke={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
