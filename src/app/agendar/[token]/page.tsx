"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { IconCalendarEvent, IconClock, IconCircleCheck, IconArrowLeft } from "@tabler/icons-react";
import { paletaMarca } from "@/lib/color-marca";
import { campo } from "@/components/ui/estilos";

type Horario = { inicio: string; etiqueta: string };
type Dia = { etiqueta: string; horarios: Horario[] };
type Datos = {
  vendedor: string;
  empresa: { nombre: string; logoUrl: string | null; colorMarca: string | null };
  duracion: number;
  dias: Dia[];
};

/** Página pública: el cliente elige una hora libre y agenda la reunión. */
export default function AgendarPage() {
  const { token } = useParams<{ token: string }>();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState("");
  const [dia, setDia] = useState(0);
  const [horario, setHorario] = useState<Horario | null>(null);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", empresa: "", motivo: "" });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [confirmada, setConfirmada] = useState<string | null>(null);

  function cargar() {
    fetch(`/api/publica/agendar/${token}`)
      .then(async r => (r.ok ? r.json() : Promise.reject((await r.json().catch(() => ({}))).error)))
      .then((d: Datos) => { setDatos(d); setDia(0); setHorario(null); })
      .catch((e: unknown) => setError(typeof e === "string" ? e : "Este enlace no es válido."));
  }
  useEffect(cargar, [token]);

  async function agendar(e: React.FormEvent) {
    e.preventDefault();
    if (!horario) return;
    setEnviando(true);
    setAviso("");
    const res = await fetch(`/api/publica/agendar/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, inicio: horario.inicio }),
    }).catch(() => null);
    setEnviando(false);
    const cuerpo = await res?.json().catch(() => ({}));
    if (res?.ok) { setConfirmada(cuerpo.etiqueta); return; }
    setAviso(cuerpo?.error ?? "No se pudo agendar. Inténtalo de nuevo.");
    if (res?.status === 409) cargar();
  }

  if (error) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <p className="text-slate-500 text-sm">{error}</p>
    </main>
  );
  if (!datos) return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex gap-1">{[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}</div>
    </main>
  );

  const marca = paletaMarca(datos.empresa.colorMarca);
  const diaActual = datos.dias[dia];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        <header className="px-6 py-5 flex items-center gap-4" style={{ backgroundColor: marca.oscuro }}>
          {datos.empresa.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={datos.empresa.logoUrl} alt="" className="h-12 w-auto max-w-[120px] rounded-lg bg-white p-1 object-contain" />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: marca.sobreOscuroSuave }}>{datos.empresa.nombre}</p>
            <h1 className="text-lg font-bold text-white">Agenda una reunión con {datos.vendedor}</h1>
            <p className="flex items-center gap-1 text-xs" style={{ color: marca.sobreOscuro }}>
              <IconClock size={13} stroke={2} /> {datos.duracion} minutos · hora de Colombia
            </p>
          </div>
        </header>

        <div className="p-6">
          {confirmada ? (
            <div className="text-center py-6">
              <IconCircleCheck size={48} stroke={1.5} className="mx-auto mb-3 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900 mb-1">¡Reunión agendada!</h2>
              <p className="text-sm text-slate-600 first-letter:uppercase">{confirmada}</p>
              <p className="mt-3 text-xs text-slate-500">Te enviamos un correo con la invitación para tu calendario.</p>
            </div>
          ) : datos.dias.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No hay horarios disponibles en este momento. Escríbele directamente a {datos.vendedor}.</p>
          ) : !horario ? (
            <>
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 mb-3">
                <IconCalendarEvent size={16} stroke={1.75} /> Elige el día
              </h2>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {datos.dias.map((d, i) => (
                  <button key={d.etiqueta} type="button" onClick={() => setDia(i)}
                    className="shrink-0 rounded-xl border px-3 py-2 text-xs font-medium first-letter:uppercase transition-colors"
                    style={i === dia
                      ? { backgroundColor: marca.oscuro, borderColor: marca.oscuro, color: "#fff" }
                      : { borderColor: "#e2e8f0", color: "#334155" }}>
                    {d.etiqueta}
                  </button>
                ))}
              </div>
              <h2 className="text-sm font-semibold text-slate-700 mt-5 mb-3">Elige la hora</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {diaActual.horarios.map(h => (
                  <button key={h.inicio} type="button" onClick={() => setHorario(h)}
                    className="rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors">
                    {h.etiqueta}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={agendar} className="space-y-3">
              <button type="button" onClick={() => setHorario(null)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                <IconArrowLeft size={13} stroke={2} /> Cambiar hora
              </button>
              <p className="rounded-xl px-4 py-3 text-sm font-semibold first-letter:uppercase" style={{ backgroundColor: marca.claro, color: marca.textoSobreClaro }}>
                {diaActual.etiqueta} · {horario.etiqueta}
              </p>
              <input required placeholder="Tu nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={campo("md", "w-full")} />
              <input required type="email" placeholder="Tu correo" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={campo("md", "w-full")} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Teléfono (opcional)" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className={campo("md", "w-full")} />
                <input placeholder="Empresa (opcional)" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className={campo("md", "w-full")} />
              </div>
              <textarea rows={3} placeholder="¿De qué quieres hablar? (opcional)" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} className={campo("md", "w-full")} />
              {aviso && <p className="text-sm text-red-600">{aviso}</p>}
              <button type="submit" disabled={enviando}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: marca.oscuro }}>
                {enviando ? "Agendando…" : "Confirmar reunión"}
              </button>
            </form>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-[11px] text-slate-400">Agenda gestionada con Evoluteca CRM</p>
    </main>
  );
}
