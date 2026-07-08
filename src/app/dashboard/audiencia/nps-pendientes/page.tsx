"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { WhatsAppBtn } from "@/components/whatsapp-btn";

type Pendiente = {
  id: string;
  espectador: { id: string; nombre: string; telefono: string | null };
  funcion: { id: string; titulo: string; fecha: string };
};

const PLANTILLA_NPS = [
  {
    label: "Encuesta NPS",
    msg: (nombre: string) =>
      `Hola ${nombre}, gracias por acompañarnos en la función. ¿Nos regalas 1 minuto? Del 1 al 10, ¿qué tan probable es que nos recomiendes a un amigo? Responde con el número y, si quieres, cuéntanos por qué 🙂`,
  },
];

export default function NpsPendientesPage() {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/nps-pendientes");
    setPendientes(await res.json());
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function marcarEnviado(asistenciaId: string) {
    await fetch(`/api/funciones/asistencias/${asistenciaId}/marcar-nps-enviado`, { method: "POST" });
    setPendientes(prev => prev.filter(p => p.id !== asistenciaId));
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Link href="/dashboard/audiencia" className="hover:text-blue-600 transition-colors">← Audiencia</Link>
        <span>/</span>
        <span className="text-slate-600">Cola de NPS pendiente</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Cola de NPS pendiente</h1>
        <p className="text-slate-500 text-sm mt-1">
          Asistentes con función terminada hace 24h+ que aún no recibieron la encuesta. Un clic por persona para enviar por WhatsApp.
        </p>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : pendientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">🎉 Sin pendientes. Todos los asistentes recientes ya recibieron su encuesta.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pendientes.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 truncate">{p.espectador.nombre}</p>
                <p className="text-xs text-slate-400">
                  {p.funcion.titulo} · {new Date(p.funcion.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              {p.espectador.telefono && (
                <WhatsAppBtn
                  telefono={p.espectador.telefono}
                  nombre={p.espectador.nombre}
                  plantillas={PLANTILLA_NPS}
                  onSend={() => marcarEnviado(p.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
