"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconMessageChatbot } from "@tabler/icons-react";
import { boton, cx, tarjeta } from "@/components/ui/estilos";

// Partes interactivas de la pestaña Asistente IA (la página es de servidor).

type Uso = { limite: number | null; usados: number; iaConfigurada: boolean };

/** Cupo mensual de acciones de IA, en el encabezado oscuro. */
export function UsoMeter({ mes, renovacion }: { mes: string; renovacion: string }) {
  const [uso, setUso] = useState<Uso | null>(null);

  useEffect(() => {
    fetch("/api/ia/uso", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(setUso)
      .catch(() => {});
  }, []);

  const caja = "relative flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 py-2.5 pl-2.5 pr-5 lg:min-w-[320px]";

  if (!uso) return <div className={cx(caja, "h-[76px] animate-pulse")} aria-hidden />;

  if (!uso.iaConfigurada) {
    return (
      <div className={cx(caja, "pl-5")}>
        <div>
          <p className="text-2xs font-bold uppercase tracking-wider text-accent-300">IA no configurada</p>
          <p className="text-sm text-brand-200 mt-0.5">Falta la clave del servidor.</p>
        </div>
      </div>
    );
  }

  const { limite, usados } = uso;
  const ilimitado = limite == null;
  const desactivado = limite === 0;
  const pct = ilimitado || desactivado ? 0 : Math.min(100, (usados / (limite as number)) * 100);
  const tope = !ilimitado && !desactivado && usados >= (limite as number);
  const disponibles = ilimitado || desactivado ? 0 : Math.max(0, (limite as number) - usados);
  const R = 36;
  const circ = 2 * Math.PI * R;

  return (
    <div className={caja}>
      <svg width="56" height="56" viewBox="0 0 88 88" className="shrink-0" role="img"
        aria-label={ilimitado ? `${usados} acciones usadas` : `${usados} de ${limite} acciones usadas`}>
        <circle cx="44" cy="44" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
        {pct > 0 && (
          <circle cx="44" cy="44" r={R} fill="none" strokeWidth="10" strokeLinecap="round"
            className={tope ? "stroke-red-400" : "stroke-accent-500"}
            strokeDasharray={`${(pct / 100) * circ} ${circ}`} transform="rotate(-90 44 44)" />
        )}
        <text x="44" y="53" textAnchor="middle" fontSize="28" fontWeight="800" fill="#ffffff">{usados}</text>
      </svg>
      <div>
        <p className="text-2xs font-bold uppercase tracking-wider text-accent-300">Acciones de IA · {mes}</p>
        {desactivado ? (
          <p className="text-base font-bold mt-0.5">No incluido en tu plan</p>
        ) : ilimitado ? (
          <p className="text-lg font-bold mt-0.5 tabular-nums">Sin límite</p>
        ) : (
          <p className="text-lg font-bold mt-0.5 tabular-nums">
            {tope ? "Cupo agotado" : `${disponibles} de ${limite} disponibles`}
          </p>
        )}
        <p className="text-xs text-brand-200">
          {tope ? `Vuelven el ${renovacion}` : `Se renuevan el ${renovacion}`}
        </p>
      </div>
    </div>
  );
}

/** "Pregúntale a tus datos": se usa desde aquí y abre la respuesta en /dashboard/preguntar. */
export function Preguntar({ ejemplos }: { ejemplos: string[] }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");

  function ir(q: string) {
    router.push(q ? `/dashboard/preguntar?q=${encodeURIComponent(q)}` : "/dashboard/preguntar");
  }
  function enviar(e: FormEvent) {
    e.preventDefault();
    ir(texto.trim());
  }

  return (
    <div className={tarjeta("sm:col-span-2 p-5 flex flex-col gap-4 min-h-[212px]")}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-accent-50 text-accent-700 flex items-center justify-center">
          <IconMessageChatbot size={21} stroke={1.75} />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 leading-tight">Pregúntale a tus datos</h3>
          <p className="text-sm text-slate-500">El dato y su gráfica, al instante.</p>
        </div>
      </div>
      {/* Preguntas de ejemplo: un clic y responde, sin tener que pensar cómo preguntar. */}
      <div className="flex flex-wrap gap-1.5">
        {ejemplos.map(q => (
          <button key={q} type="button" onClick={() => ir(q)}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">
            {q}
          </button>
        ))}
      </div>
      <form onSubmit={enviar}
        className="mt-auto flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-5 pr-1.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <label htmlFor="pregunta-ia" className="sr-only">Tu pregunta</label>
        <input
          id="pregunta-ia"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder="¿Cuánto vendimos este trimestre?"
          className="flex-1 min-w-0 bg-transparent py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
        />
        <button type="submit" aria-label="Preguntar" className={boton("primario", "md", "w-11 h-11 shrink-0 rounded-full p-0")}>
          <IconArrowRight size={18} stroke={2.25} />
        </button>
      </form>
    </div>
  );
}
