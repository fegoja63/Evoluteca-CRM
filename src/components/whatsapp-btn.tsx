"use client";

import { useState, useRef, useEffect } from "react";

const PLANTILLAS_DEFAULT = [
  { label: "Saludo inicial",       msg: (nombre: string) => `Hola ${nombre}, espero que estés muy bien. Me comunico desde Evoluteca para hacer seguimiento a tu solicitud. ¿Tienes un momento para hablar?` },
  { label: "Seguimiento cotización", msg: (nombre: string) => `Hola ${nombre}, quería hacer seguimiento a la cotización que te enviamos. ¿Tuviste oportunidad de revisarla? Con gusto resuelvo cualquier duda.` },
  { label: "Confirmar reunión",    msg: (nombre: string) => `Hola ${nombre}, te escribo para confirmar nuestra reunión. Por favor avísame si necesitas cambiar la hora o fecha.` },
  { label: "Recordatorio evento",  msg: (nombre: string) => `Hola ${nombre}, te recuerdo que se acerca la fecha de tu evento. ¿Todo va bien con los preparativos? Estamos a tu disposición.` },
  { label: "Cierre de negocio",    msg: (nombre: string) => `Hola ${nombre}, ¿cómo vas con la decisión sobre nuestra propuesta? Queremos asegurarnos de que tengas toda la información necesaria para avanzar.` },
  { label: "Mensaje libre",        msg: () => "" },
];

interface Props {
  telefono: string;
  nombre: string;
  plantillas?: { label: string; msg: (nombre: string) => string }[];
  onSend?: () => void;
}

export function WhatsAppBtn({ telefono, nombre, plantillas, onSend }: Props) {
  const PLANTILLAS = plantillas ?? PLANTILLAS_DEFAULT;
  const [abierto, setAbierto] = useState(false);
  const [plantilla, setPlantilla] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMensaje(PLANTILLAS[plantilla].msg(nombre));
  }, [plantilla, nombre]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const numero = telefono.replace(/\D/g, "");
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)}
        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
        💬 WhatsApp
      </button>
    );
  }

  return (
    <div ref={ref} className="relative z-30">
      <div className="absolute right-0 top-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-700">💬 Enviar por WhatsApp</p>
          <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {PLANTILLAS.map((p, i) => (
            <button key={i} onClick={() => setPlantilla(i)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${plantilla === i ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-emerald-400 resize-none"
          placeholder="Escribe tu mensaje..."
        />
        <a href={url} target="_blank" rel="noopener noreferrer"
          onClick={() => { setAbierto(false); onSend?.(); }}
          className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors">
          💬 Abrir WhatsApp
        </a>
      </div>
    </div>
  );
}
