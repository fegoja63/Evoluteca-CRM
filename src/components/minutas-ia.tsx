"use client";

// Minutas de reunión con IA, para la ficha de una oportunidad o de un cliente.
//
// Flujo: 1) el usuario pega las notas o la transcripción → 2) la IA propone la
// minuta (resumen, asistentes, acuerdos, compromisos, próximos pasos, riesgos)
// → 3) el usuario la REVISA Y EDITA → 4) al guardar se registra la reunión y
// se crean las tareas de los compromisos de nuestro lado que marque.
// Nada se guarda sin la revisión del usuario.

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import {
  IconNotes, IconSparkles, IconPlus, IconTrash, IconCopy, IconChevronDown, IconChevronUp, IconX, IconCheck,
} from "@tabler/icons-react";
import { minutaATexto, MAX_TEXTO_MINUTA, MIN_TEXTO_MINUTA, type MinutaIA } from "@/lib/minutas";

type Asistente = MinutaIA["asistentes"][number];
type Compromiso = MinutaIA["compromisos"][number] & { crearTarea: boolean };
type Borrador = Omit<MinutaIA, "compromisos"> & { compromisos: Compromiso[] };

type MinutaGuardada = {
  id: string; titulo: string; fecha: string; resumen: string;
  asistentes: Asistente[]; acuerdos: string[]; compromisos: MinutaIA["compromisos"];
  proximosPasos: string[]; riesgos: string[]; creadoEn: string;
  oportunidad: { id: string; titulo: string } | null;
};

type Props = {
  oportunidadId?: string;
  empresaId?: string;
  empresaNombre?: string | null;
  // Para que la ficha recargue sus actividades después de guardar.
  onGuardada?: () => void | Promise<void>;
};

const hoyBogota = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const fechaDeIso = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const fmtFecha = (f: string) =>
  new Date(`${f}T12:00:00-05:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

const input = "w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-500";
const LADO_LABEL: Record<string, string> = { NOSOTROS: "Nuestro equipo", CLIENTE: "Cliente", DESCONOCIDO: "Sin definir" };

// Lista editable de textos (acuerdos, próximos pasos, riesgos).
function ListaTextos({ titulo, items, onChange, placeholder }: {
  titulo: string; items: string[]; onChange: (xs: string[]) => void; placeholder: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-1.5">{titulo}</p>
      <div className="flex flex-col gap-1.5">
        {items.map((x, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input className={input} value={x} onChange={e => onChange(items.map((y, j) => (j === i ? e.target.value : y)))} />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Quitar"
              className="text-slate-300 hover:text-red-500 shrink-0"><IconX size={16} stroke={2} /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...items, ""])}
          className="self-start inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
          <IconPlus size={12} stroke={2} />{placeholder}
        </button>
      </div>
    </div>
  );
}

export function MinutasIA({ oportunidadId, empresaId, empresaNombre, onGuardada }: Props) {
  const [minutas, setMinutas] = useState<MinutaGuardada[]>([]);
  const [modo, setModo] = useState<"lista" | "escribir" | "revisar">("lista");
  const [fecha, setFecha] = useState(hoyBogota());
  const [notas, setNotas] = useState("");
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);

  const query = oportunidadId ? `oportunidadId=${oportunidadId}` : `empresaId=${empresaId}`;

  async function cargar() {
    const res = await fetch(`/api/minutas?${query}`, { cache: "no-store" });
    if (res.ok) setMinutas(await res.json());
  }
  useEffect(() => { cargar(); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  async function generar() {
    setGenerando(true);
    const res = await fetch("/api/ia/minuta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: notas, fecha, oportunidadId, empresaId }),
    });
    setGenerando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.error ?? "No se pudo generar la minuta"); return; }
    const m = d as MinutaIA;
    // Por defecto se propone crear la tarea de cada compromiso de nuestro lado.
    setBorrador({ ...m, compromisos: m.compromisos.map(c => ({ ...c, crearTarea: c.lado === "NOSOTROS" })) });
    setModo("revisar");
  }

  async function guardar() {
    if (!borrador) return;
    const limpia = (xs: string[]) => xs.map(x => x.trim()).filter(Boolean);
    setGuardando(true);
    const res = await fetch("/api/minutas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oportunidadId: oportunidadId ?? null,
        empresaId: oportunidadId ? null : empresaId ?? null,
        fecha,
        titulo: borrador.titulo,
        resumen: borrador.resumen,
        asistentes: borrador.asistentes.filter(a => a.nombre.trim()).map(a => ({ ...a, rol: a.rol?.trim() || null })),
        acuerdos: limpia(borrador.acuerdos),
        compromisos: borrador.compromisos
          .filter(c => c.descripcion.trim())
          .map(c => ({ ...c, responsable: c.responsable?.trim() || null, fecha: c.fecha || null, crearTarea: c.lado === "NOSOTROS" && c.crearTarea })),
        proximosPasos: limpia(borrador.proximosPasos),
        riesgos: limpia(borrador.riesgos),
        textoOriginal: notas,
      }),
    });
    setGuardando(false);
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.error ?? "No se pudo guardar la minuta"); return; }
    toast.success(d.tareasCreadas ? `Minuta guardada · ${d.tareasCreadas} tarea${d.tareasCreadas !== 1 ? "s" : ""} creada${d.tareasCreadas !== 1 ? "s" : ""}` : "Minuta guardada");
    setBorrador(null); setNotas(""); setFecha(hoyBogota()); setModo("lista");
    setAbierta(d.id ?? null);
    await cargar();
    await onGuardada?.();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta minuta? La reunión y las tareas que creó se conservan.")) return;
    const res = await fetch(`/api/minutas/${id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(d.error ?? "No se pudo eliminar"); return; }
    toast.success("Minuta eliminada");
    await cargar();
  }

  async function copiar(m: MinutaGuardada) {
    const texto = minutaATexto({ ...m, fecha: fechaDeIso(m.fecha) }, empresaNombre);
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Minuta copiada: pégala en un correo o WhatsApp");
    } catch {
      toast.error("No se pudo copiar. Selecciona el texto y cópialo a mano.");
    }
  }

  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setBorrador(b => (b ? { ...b, [k]: v } : b));

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <IconNotes size={18} stroke={1.75} className="text-brand-600" />Minutas de reunión
          {minutas.length > 0 && <span className="text-xs font-normal text-slate-400">({minutas.length})</span>}
        </h2>
        {modo === "lista" && (
          <button onClick={() => setModo("escribir")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
            <IconSparkles size={14} stroke={2} />Minuta con IA
          </button>
        )}
      </div>

      {/* 1) Pegar notas */}
      {modo === "escribir" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">
            Pega tus notas o la transcripción de la reunión, como estén. La IA propone la minuta y tú la revisas antes de guardarla.
          </p>
          <label className="text-xs font-semibold text-slate-600">
            Fecha de la reunión
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={`${input} mt-1 max-w-[180px] block`} />
          </label>
          <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={9} maxLength={MAX_TEXTO_MINUTA}
            placeholder="Ej.: Reunión con Ana (gerente) y Luis (compras). Les preocupa el precio frente a la competencia. Quedamos en enviar propuesta ajustada el viernes; ellos confirman presupuesto la próxima semana…"
            className={`${input} resize-y`} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={generar} disabled={generando || notas.trim().length < MIN_TEXTO_MINUTA || !fecha}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
              <IconSparkles size={16} stroke={2} />{generando ? "Preparando la minuta…" : "Generar minuta"}
            </button>
            <button onClick={() => { setModo("lista"); setNotas(""); }} disabled={generando}
              className="text-sm text-slate-500 hover:underline">Cancelar</button>
            <span className="text-[11px] text-slate-400 ml-auto">Usa 1 acción de IA de tu plan</span>
          </div>
        </div>
      )}

      {/* 2) Revisar y editar lo que propuso la IA */}
      {modo === "revisar" && borrador && (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Revisa la propuesta de la IA: corrige lo que haga falta. Nada se guarda hasta que pulses &quot;Guardar minuta&quot;.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="text-xs font-semibold text-slate-600">Título
              <input className={`${input} mt-1`} value={borrador.titulo} onChange={e => set("titulo", e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-600">Fecha
              <input type="date" className={`${input} mt-1`} value={fecha} onChange={e => setFecha(e.target.value)} />
            </label>
          </div>
          <label className="text-xs font-semibold text-slate-600">Resumen
            <textarea rows={4} className={`${input} mt-1 resize-y`} value={borrador.resumen} onChange={e => set("resumen", e.target.value)} />
          </label>

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Asistentes</p>
            <div className="flex flex-col gap-1.5">
              {borrador.asistentes.map((a, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_140px_auto] gap-1.5 items-center">
                  <input className={input} placeholder="Nombre" value={a.nombre}
                    onChange={e => set("asistentes", borrador.asistentes.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} />
                  <input className={input} placeholder="Cargo o rol" value={a.rol ?? ""}
                    onChange={e => set("asistentes", borrador.asistentes.map((x, j) => (j === i ? { ...x, rol: e.target.value } : x)))} />
                  <select className={input} value={a.lado}
                    onChange={e => set("asistentes", borrador.asistentes.map((x, j) => (j === i ? { ...x, lado: e.target.value as Asistente["lado"] } : x)))}>
                    {Object.entries(LADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button type="button" onClick={() => set("asistentes", borrador.asistentes.filter((_, j) => j !== i))} title="Quitar"
                    className="text-slate-300 hover:text-red-500"><IconX size={16} stroke={2} /></button>
                </div>
              ))}
              <button type="button" onClick={() => set("asistentes", [...borrador.asistentes, { nombre: "", rol: null, lado: "CLIENTE" }])}
                className="self-start inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <IconPlus size={12} stroke={2} />Agregar asistente
              </button>
            </div>
          </div>

          <ListaTextos titulo="Acuerdos" items={borrador.acuerdos} onChange={xs => set("acuerdos", xs)} placeholder="Agregar acuerdo" />

          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">Compromisos</p>
            <p className="text-[11px] text-slate-400 mb-1.5">Los de nuestro equipo marcados con &quot;Crear tarea&quot; quedan como tareas pendientes a tu nombre (sin fecha: para mañana).</p>
            <div className="flex flex-col gap-2">
              {borrador.compromisos.map((c, i) => {
                const upd = (patch: Partial<Compromiso>) => set("compromisos", borrador.compromisos.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-2 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <input className={input} placeholder="Qué hay que hacer" value={c.descripcion} onChange={e => upd({ descripcion: e.target.value })} />
                      <button type="button" onClick={() => set("compromisos", borrador.compromisos.filter((_, j) => j !== i))} title="Quitar"
                        className="text-slate-300 hover:text-red-500 shrink-0"><IconX size={16} stroke={2} /></button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-[1fr_140px_150px_auto] gap-1.5 items-center">
                      <input className={input} placeholder="Responsable" value={c.responsable ?? ""} onChange={e => upd({ responsable: e.target.value })} />
                      <select className={input} value={c.lado} onChange={e => upd({ lado: e.target.value as Compromiso["lado"], crearTarea: e.target.value === "NOSOTROS" })}>
                        <option value="NOSOTROS">Nuestro equipo</option>
                        <option value="CLIENTE">Cliente</option>
                      </select>
                      <input type="date" className={input} value={c.fecha ?? ""} onChange={e => upd({ fecha: e.target.value || null })} />
                      {c.lado === "NOSOTROS" ? (
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                          <input type="checkbox" checked={c.crearTarea} onChange={e => upd({ crearTarea: e.target.checked })} className="accent-brand-600" />
                          Crear tarea
                        </label>
                      ) : <span className="text-[11px] text-slate-400">Lo hace el cliente</span>}
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={() => set("compromisos", [...borrador.compromisos, { descripcion: "", responsable: null, lado: "NOSOTROS", fecha: null, crearTarea: true }])}
                className="self-start inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                <IconPlus size={12} stroke={2} />Agregar compromiso
              </button>
            </div>
          </div>

          <ListaTextos titulo="Próximos pasos" items={borrador.proximosPasos} onChange={xs => set("proximosPasos", xs)} placeholder="Agregar próximo paso" />
          <ListaTextos titulo="Riesgos y objeciones (nota interna, no se incluye al copiar)" items={borrador.riesgos} onChange={xs => set("riesgos", xs)} placeholder="Agregar riesgo" />

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button onClick={guardar} disabled={guardando || !borrador.titulo.trim() || !borrador.resumen.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700 disabled:opacity-50">
              <IconCheck size={16} stroke={2} />{guardando ? "Guardando…" : "Guardar minuta"}
            </button>
            <button onClick={() => setModo("escribir")} disabled={guardando} className="text-sm text-slate-500 hover:underline">Volver a las notas</button>
            <button onClick={() => { setBorrador(null); setModo("lista"); setNotas(""); }} disabled={guardando}
              className="text-sm text-red-500 hover:underline ml-auto">Descartar</button>
          </div>
        </div>
      )}

      {/* 3) Minutas guardadas */}
      {modo === "lista" && (
        minutas.length === 0 ? (
          <p className="text-xs text-slate-400">
            Aún no hay minutas. Después de una reunión, pega tus notas y la IA arma la minuta con acuerdos, compromisos y próximos pasos.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {minutas.map(m => {
              const open = abierta === m.id;
              return (
                <div key={m.id} className="rounded-xl border border-slate-100 bg-slate-50">
                  <button onClick={() => setAbierta(open ? null : m.id)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
                    <span className="text-xs text-slate-400 shrink-0">{fmtFecha(fechaDeIso(m.fecha))}</span>
                    <span className="text-sm font-semibold text-slate-800 truncate flex-1">{m.titulo}</span>
                    {!oportunidadId && m.oportunidad && <span className="text-[11px] text-slate-400 truncate max-w-[160px] hidden sm:inline">{m.oportunidad.titulo}</span>}
                    {open ? <IconChevronUp size={16} className="text-slate-400" /> : <IconChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {open && (
                    <div className="px-3 pb-3 text-sm text-slate-700 flex flex-col gap-2">
                      <p>{m.resumen}</p>
                      {m.asistentes.length > 0 && (
                        <p className="text-xs text-slate-500"><span className="font-semibold">Asistentes:</span> {m.asistentes.map(a => `${a.nombre}${a.rol ? ` (${a.rol})` : ""}`).join(", ")}</p>
                      )}
                      {[["Acuerdos", m.acuerdos], ["Próximos pasos", m.proximosPasos]].map(([t, xs]) =>
                        (xs as string[]).length > 0 && (
                          <div key={t as string}>
                            <p className="text-xs font-semibold text-slate-600">{t as string}</p>
                            <ul className="list-disc pl-5 text-xs">{(xs as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul>
                          </div>
                        ))}
                      {m.compromisos.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Compromisos</p>
                          <ul className="list-disc pl-5 text-xs">
                            {m.compromisos.map((c, i) => (
                              <li key={i}>{c.descripcion} — {c.responsable ?? LADO_LABEL[c.lado]}{c.fecha ? `, ${fmtFecha(c.fecha)}` : ""}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.riesgos.length > 0 && (
                        <div className="rounded-lg bg-amber-50 px-2.5 py-1.5">
                          <p className="text-xs font-semibold text-amber-800">Riesgos y objeciones (interno)</p>
                          <ul className="list-disc pl-5 text-xs text-amber-900">{m.riesgos.map((x, i) => <li key={i}>{x}</li>)}</ul>
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <button onClick={() => copiar(m)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">
                          <IconCopy size={13} stroke={2} />Copiar para enviar
                        </button>
                        <button onClick={() => eliminar(m.id)} className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline ml-auto">
                          <IconTrash size={13} stroke={1.75} />Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
