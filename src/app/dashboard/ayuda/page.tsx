"use client";

import { useState } from "react";
import { IconBug, IconBulb, IconQuestionMark, IconPinned, IconCircleCheck, type Icon } from "@tabler/icons-react";

const TIPOS: { value: string; label: string; icon: Icon; desc: string }[] = [
  { value: "error",   label: "Error / Bug",            icon: IconBug,          desc: "Algo no funciona como debería" },
  { value: "mejora",  label: "Sugerencia de mejora",   icon: IconBulb,         desc: "Una idea para mejorar la app" },
  { value: "duda",    label: "Duda o consulta",         icon: IconQuestionMark, desc: "No entiendo cómo funciona algo" },
  { value: "otro",    label: "Otro",                   icon: IconPinned,       desc: "Cualquier otro comentario" },
];

export default function AyudaPage() {
  const [tipo, setTipo]               = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando]       = useState(false);
  const [enviado, setEnviado]         = useState(false);
  const [error, setError]             = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo || !descripcion.trim()) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, descripcion }),
      });
      if (!res.ok) throw new Error();
      setEnviado(true);
      setTipo("");
      setDescripcion("");
    } catch {
      setError("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Ayuda y soporte</h1>
        <p className="text-slate-500 text-sm mt-1">¿Encontraste un problema o tienes una sugerencia? Escríbenos.</p>
      </div>

      {enviado ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <IconCircleCheck size={40} stroke={1.5} className="mx-auto mb-3 text-emerald-500" />
          <h2 className="text-lg font-semibold text-emerald-800 mb-1">¡Mensaje enviado!</h2>
          <p className="text-sm text-emerald-700 mb-4">
            Recibimos tu reporte. Nos pondremos en contacto pronto.
          </p>
          <button
            onClick={() => setEnviado(false)}
            className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Enviar otro reporte
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">¿De qué se trata?</h2>
            <div className="grid grid-cols-2 gap-3">
              {TIPOS.map(t => {
                const Icono = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`text-left rounded-xl border-2 p-4 transition-all ${
                      tipo === t.value
                        ? "border-accent-500 bg-accent-50"
                        : "border-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${tipo === t.value ? "bg-accent-100" : "bg-brand-50"}`}>
                      <Icono size={18} stroke={1.75} className={tipo === t.value ? "text-accent-600" : "text-brand-600"} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Describe el problema o sugerencia
            </label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              rows={6}
              placeholder="Cuéntanos qué pasó, en qué página ocurrió, qué pasos seguiste y qué esperabas que sucediera..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-brand-500 resize-none"
              required
            />
            <p className="text-xs text-slate-400 mt-1">{descripcion.length} caracteres</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={!tipo || !descripcion.trim() || enviando}
            className="w-full rounded-xl bg-accent-600 px-6 py-3 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {enviando ? "Enviando..." : "Enviar reporte"}
          </button>

          <p className="text-xs text-slate-400 text-center">
            Tu reporte será enviado a <span className="font-medium">felipe.gomez@evoluteca.com</span>
          </p>
        </form>
      )}
    </div>
  );
}
