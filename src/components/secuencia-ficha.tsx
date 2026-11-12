"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMailFast, IconPlayerStop } from "@tabler/icons-react";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { formatoFecha } from "@/lib/fecha-bogota";
import { toast } from "@/lib/toast";

type Secuencia = { id: string; nombre: string; activa: boolean; pasos: unknown[] };
type Inscripcion = {
  id: string; estado: "ACTIVA" | "COMPLETADA" | "DETENIDA"; motivoFin: string | null;
  enviados: number; proximoEnvio: string | null; creadoEn: string; finalizadoEn: string | null;
  secuencia: { nombre: string; pasos: unknown[] };
  usuario: { nombre: string };
};

const MOTIVO: Record<string, string> = {
  RESPONDIO: "el cliente respondió",
  NEGOCIO_CERRADO: "el negocio se cerró",
  SIN_CORREO: "el contacto no tiene correo",
  MANUAL: "se detuvo a mano",
  SECUENCIA_INACTIVA: "la secuencia se pausó",
  USUARIO_INACTIVO: "el vendedor ya no está activo",
};

/**
 * Tarjeta "Secuencia de seguimiento" en la ficha del contacto o del negocio:
 * inscribir al contacto, ver en qué va y detenerla.
 */
export function SecuenciaFicha({ contactoId, oportunidadId, contactoTieneCorreo }: {
  contactoId?: string | null; oportunidadId?: string | null; contactoTieneCorreo: boolean;
}) {
  const [secuencias, setSecuencias] = useState<Secuencia[]>([]);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [elegida, setElegida] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  function cargar() {
    if (!contactoId) return;
    fetch("/api/secuencias").then(r => r.json()).then(d => {
      const activas = (Array.isArray(d) ? d : []).filter((s: Secuencia) => s.activa);
      setSecuencias(activas);
      setElegida(e => e || activas[0]?.id || "");
    }).catch(() => {});
    fetch(`/api/secuencias/inscripciones?contactoId=${contactoId}`).then(r => r.json())
      .then(d => setInscripciones(Array.isArray(d) ? d : [])).catch(() => {});
  }
  useEffect(cargar, [contactoId]);

  if (!contactoId) return null;
  const activa = inscripciones.find(i => i.estado === "ACTIVA");
  const pasadas = inscripciones.filter(i => i.estado !== "ACTIVA").slice(0, 3);

  async function inscribir() {
    if (!elegida || !contactoId) return;
    setTrabajando(true);
    const res = await fetch("/api/secuencias/inscripciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secuenciaId: elegida, contactoId, oportunidadId: oportunidadId ?? null }),
    }).catch(() => null);
    setTrabajando(false);
    const cuerpo = await res?.json().catch(() => null);
    if (!res?.ok) { toast.error(cuerpo?.error ?? "No se pudo iniciar la secuencia."); return; }
    toast.success(cuerpo?.enviadoAhora ? "Secuencia iniciada: el primer correo ya salió." : "Secuencia iniciada.");
    cargar();
  }

  async function detener(id: string) {
    if (!confirm("¿Detener la secuencia? No saldrán más correos.")) return;
    const res = await fetch(`/api/secuencias/inscripciones/${id}`, { method: "DELETE" });
    if (!res.ok) toast.error("No se pudo detener.");
    cargar();
  }

  return (
    <div className={tarjeta("p-5")}>
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 mb-1">
        <IconMailFast size={16} stroke={1.75} /> Secuencia de seguimiento
      </h2>
      {activa ? (
        <div className="mt-2 rounded-xl bg-brand-50 px-4 py-3">
          <p className="text-sm font-medium text-slate-800">{activa.secuencia.nombre}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            {activa.enviados} de {activa.secuencia.pasos.length} correos enviados
            {activa.proximoEnvio ? ` · próximo: ${formatoFecha(activa.proximoEnvio, { weekday: "long", day: "numeric", month: "long" })}` : ""}
            {` · inició ${activa.usuario.nombre}`}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Se detiene sola si el cliente responde o el negocio se gana o se pierde.</p>
          <button onClick={() => detener(activa.id)} className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800">
            <IconPlayerStop size={14} stroke={1.75} /> Detener
          </button>
        </div>
      ) : !contactoTieneCorreo ? (
        <p className="text-xs text-slate-500">El contacto no tiene correo: agréguelo para poder usar una secuencia.</p>
      ) : secuencias.length === 0 ? (
        <p className="text-xs text-slate-500">
          No hay secuencias activas. <Link href="/dashboard/secuencias" className="text-brand-600 hover:underline">Crear una</Link>
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          <select value={elegida} onChange={e => setElegida(e.target.value)} className={campo("md", "flex-1 min-w-0")}>
            {secuencias.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.pasos.length} correos)</option>)}
          </select>
          <button onClick={inscribir} disabled={trabajando || !elegida} className={boton("primario", "md", "shrink-0 flex")}>
            {trabajando ? "Iniciando…" : "Iniciar"}
          </button>
        </div>
      )}
      {pasadas.length > 0 && (
        <ul className="mt-3 space-y-1 text-[11px] text-slate-400">
          {pasadas.map(p => (
            <li key={p.id}>
              {p.secuencia.nombre}: {p.estado === "COMPLETADA" ? "completada" : `detenida (${MOTIVO[p.motivoFin ?? ""] ?? "detenida"})`}
              {p.finalizadoEn ? ` · ${formatoFecha(p.finalizadoEn, { day: "numeric", month: "short" })}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
