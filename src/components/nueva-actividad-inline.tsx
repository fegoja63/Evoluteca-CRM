"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { tiposActividadVisibles } from "@/lib/tipos-actividad";

type Props = {
  empresaId?: string;
  contactoId?: string;
  oportunidadId?: string;
  onGuardado?: () => void;
  tipoInicial?: string;
  autoAbrir?: boolean;
};

function fechaLocalDefault() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

export function NuevaActividadInline({ empresaId, contactoId, oportunidadId, onGuardado, tipoInicial, autoAbrir }: Props) {
  const [abierto, setAbierto] = useState(autoAbrir ?? false);
  const [guardando, setGuardando] = useState(false);
  const [modulos, setModulos] = useState<Record<string, boolean>>({});

  // Las visitas comercial/técnica solo se ofrecen en el vertical de
  // teatros/alquileres; se decide según los módulos del tenant.
  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setModulos((data.modulos as Record<string, boolean>) ?? {}))
      .catch(() => {});
  }, []);
  const tipos = tiposActividadVisibles(modulos);
  const [form, setForm] = useState({
    tipo: tipoInicial ?? "TAREA",
    titulo: "",
    fecha: fechaLocalDefault(),
    notas: "",
  });

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch("/api/actividades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        empresaId: empresaId ?? null,
        contactoId: contactoId ?? null,
        oportunidadId: oportunidadId ?? null,
      }),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "No se pudo crear la actividad. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setForm({ tipo: tipoInicial ?? "TAREA", titulo: "", fecha: fechaLocalDefault(), notas: "" });
    setAbierto(false);
    onGuardado?.();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors w-full"
      >
        <span className="text-base leading-none">+</span>
        Nueva actividad
      </button>
    );
  }

  return (
    <form onSubmit={handleGuardar} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
      <div className="flex gap-2">
        <select
          value={form.tipo}
          onChange={e => setForm({ ...form, tipo: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500"
        >
          {tipos.map(t => <option key={t.key} value={t.key}>{t.emoji} {t.label}</option>)}
        </select>
        <input
          required
          value={form.titulo}
          onChange={e => setForm({ ...form, titulo: e.target.value })}
          placeholder="Título de la actividad *"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-2">
        <input
          required
          type="datetime-local"
          value={form.fecha}
          onChange={e => setForm({ ...form, fecha: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
        />
        <input
          value={form.notas}
          onChange={e => setForm({ ...form, notas: e.target.value })}
          placeholder="Notas (opcional)"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setAbierto(false)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100">
          Cancelar
        </button>
        <button type="submit" disabled={guardando}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {guardando ? "Guardando..." : "Guardar actividad"}
        </button>
      </div>
    </form>
  );
}
