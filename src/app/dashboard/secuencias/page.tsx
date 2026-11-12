"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { IconPlus, IconX, IconMailFast, IconPencil, IconTrash, IconPlayerStop, IconArrowDown } from "@tabler/icons-react";
import { boton, campo, tarjeta, insignia } from "@/components/ui/estilos";
import { SkeletonTarjetas, EstadoVacio } from "@/components/ui/estados";
import { formatoFecha } from "@/lib/fecha-bogota";
import { toast } from "@/lib/toast";

type Paso = { diasEspera: number; asunto: string; cuerpo: string };
type Secuencia = { id: string; nombre: string; descripcion: string | null; pasos: Paso[]; activa: boolean; activas: number };
type Inscripcion = {
  id: string; pasoSiguiente: number; proximoEnvio: string | null; enviados: number;
  secuencia: { nombre: string; pasos: Paso[] };
  contacto: { id: string; nombre: string; email: string | null };
  oportunidad: { id: string; titulo: string } | null;
  usuario: { nombre: string };
};

const VARIABLES = ["{{nombre}}", "{{empresa}}", "{{vendedor}}", "{{negocio}}"];

// Punto de partida para la primera secuencia (de "usted", español LATAM).
const SUGERIDA: Omit<Secuencia, "id" | "activas" | "activa"> = {
  nombre: "Seguimiento de propuesta",
  descripcion: "Para clientes a los que ya se les envió una propuesta y no han respondido.",
  pasos: [
    { diasEspera: 2, asunto: "¿Pudo revisar la propuesta, {{nombre}}?", cuerpo: "Hola {{nombre}},\n\nQuería confirmar que recibió la propuesta que le enviamos y saber si tiene alguna pregunta. Con gusto la revisamos juntos en una llamada corta.\n\nQuedo atento,\n{{vendedor}}" },
    { diasEspera: 4, asunto: "Una idea para {{empresa}}", cuerpo: "Hola {{nombre}},\n\nSé que el día a día no da tregua. Le comparto que empresas como {{empresa}} suelen ver resultados en las primeras semanas. ¿Le sirve que conversemos 15 minutos esta semana?\n\nSaludos,\n{{vendedor}}" },
    { diasEspera: 7, asunto: "¿Cerramos el tema por ahora?", cuerpo: "Hola {{nombre}},\n\nNo quiero llenarle el correo. Si en este momento no es prioridad, lo entiendo perfectamente; solo dígame y lo retomamos más adelante.\n\nUn saludo,\n{{vendedor}}" },
  ],
};

const PASO_VACIO: Paso = { diasEspera: 3, asunto: "", cuerpo: "" };

export default function SecuenciasPage() {
  const { data: session } = useSession();
  const puedeEditar = session?.user?.rol === "ADMINISTRADOR" || session?.user?.rol === "GERENTE";
  const [secuencias, setSecuencias] = useState<Secuencia[] | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [editando, setEditando] = useState<{ id: string | null; nombre: string; descripcion: string; pasos: Paso[] } | null>(null);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    fetch("/api/secuencias").then(r => r.json()).then(d => setSecuencias(Array.isArray(d) ? d : [])).catch(() => setSecuencias([]));
    fetch("/api/secuencias/inscripciones").then(r => r.json()).then(d => setInscripciones(Array.isArray(d) ? d : [])).catch(() => {});
  }
  useEffect(cargar, []);

  function nueva(base?: typeof SUGERIDA) {
    setEditando({ id: null, nombre: base?.nombre ?? "", descripcion: base?.descripcion ?? "", pasos: base ? base.pasos.map(p => ({ ...p })) : [{ ...PASO_VACIO, diasEspera: 0 }] });
  }

  function cambiarPaso(i: number, cambio: Partial<Paso>) {
    if (!editando) return;
    setEditando({ ...editando, pasos: editando.pasos.map((p, j) => (j === i ? { ...p, ...cambio } : p)) });
  }

  async function guardar() {
    if (!editando) return;
    setGuardando(true);
    const res = await fetch(editando.id ? `/api/secuencias/${editando.id}` : "/api/secuencias", {
      method: editando.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editando.nombre, descripcion: editando.descripcion, pasos: editando.pasos }),
    }).catch(() => null);
    setGuardando(false);
    if (!res?.ok) {
      const e = await res?.json().catch(() => null);
      toast.error(e?.error ?? "No se pudo guardar. Revisa que cada correo tenga asunto y texto.");
      return;
    }
    toast.success("Secuencia guardada.");
    setEditando(null);
    cargar();
  }

  async function alternarActiva(s: Secuencia) {
    await fetch(`/api/secuencias/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: s.nombre, descripcion: s.descripcion ?? "", pasos: s.pasos, activa: !s.activa }),
    });
    cargar();
  }

  async function eliminar(s: Secuencia) {
    const aviso = s.activas > 0 ? `\n\n${s.activas} contacto(s) siguen en ella y dejarán de recibir correos.` : "";
    if (!confirm(`¿Eliminar la secuencia "${s.nombre}"?${aviso}`)) return;
    await fetch(`/api/secuencias/${s.id}`, { method: "DELETE" });
    cargar();
  }

  async function detener(ins: Inscripcion) {
    if (!confirm(`¿Detener la secuencia para ${ins.contacto.nombre}? No le saldrán más correos.`)) return;
    const res = await fetch(`/api/secuencias/inscripciones/${ins.id}`, { method: "DELETE" });
    if (!res.ok) toast.error("No se pudo detener.");
    cargar();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Secuencias de seguimiento</h1>
          <p className="text-slate-500 text-sm mt-1">
            Correos que salen solos al cliente, con días de espera entre uno y otro, y se detienen cuando responde.
          </p>
        </div>
        {puedeEditar && !editando && (
          <button onClick={() => nueva()} className={boton("primario", "md", "self-start sm:self-auto")}>
            <IconPlus size={16} stroke={1.75} /> Nueva secuencia
          </button>
        )}
      </div>

      {editando && (
        <div className={tarjeta("p-5 mb-6")}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">{editando.id ? "Editar secuencia" : "Nueva secuencia"}</h2>
            <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-700" title="Cancelar"><IconX size={18} /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <input placeholder="Nombre (ej. Seguimiento de propuesta)" value={editando.nombre}
              onChange={e => setEditando({ ...editando, nombre: e.target.value })} className={campo("md", "w-full")} />
            <input placeholder="¿Para qué sirve? (opcional)" value={editando.descripcion}
              onChange={e => setEditando({ ...editando, descripcion: e.target.value })} className={campo("md", "w-full")} />
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Puede usar {VARIABLES.map(v => <code key={v} className="mx-0.5 rounded bg-slate-100 px-1">{v}</code>)} en el asunto y el texto.
            {" "}<span className="text-slate-400">{"{{nombre}}"} es el primer nombre del contacto.</span>
          </p>

          <div className="space-y-3">
            {editando.pasos.map((p, i) => (
              <div key={i}>
                {i > 0 && <IconArrowDown size={16} className="mx-auto mb-2 text-slate-300" />}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={insignia("marca")}>Correo {i + 1}</span>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      Sale
                      <input type="number" min={i === 0 ? 0 : 1} max={90} value={p.diasEspera}
                        onChange={e => cambiarPaso(i, { diasEspera: Math.max(i === 0 ? 0 : 1, Number(e.target.value) || 0) })}
                        className={campo("sm", "w-16 text-right")} />
                      {i === 0 ? "días después de inscribir (0 = de inmediato)" : "días después del anterior"}
                    </label>
                    {editando.pasos.length > 1 && (
                      <button onClick={() => setEditando({ ...editando, pasos: editando.pasos.filter((_, j) => j !== i) })}
                        className="ml-auto text-xs text-red-500 hover:text-red-700">Quitar</button>
                    )}
                  </div>
                  <input placeholder="Asunto" value={p.asunto} onChange={e => cambiarPaso(i, { asunto: e.target.value })} className={campo("md", "w-full mb-2")} />
                  <textarea rows={5} placeholder="Texto del correo" value={p.cuerpo} onChange={e => cambiarPaso(i, { cuerpo: e.target.value })} className={campo("md", "w-full")} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {editando.pasos.length < 10 && (
              <button onClick={() => setEditando({ ...editando, pasos: [...editando.pasos, { ...PASO_VACIO }] })} className={boton("secundario", "md", "flex")}>
                <IconPlus size={15} stroke={1.75} /> Agregar correo
              </button>
            )}
            <button onClick={guardar} disabled={guardando} className={boton("primario", "md", "flex")}>
              {guardando ? "Guardando…" : "Guardar secuencia"}
            </button>
          </div>
        </div>
      )}

      {secuencias === null ? (
        <SkeletonTarjetas />
      ) : secuencias.length === 0 && !editando ? (
        <EstadoVacio icon={IconMailFast} titulo="Todavía no hay secuencias"
          descripcion="Arme una serie de correos de seguimiento y úsela con cualquier contacto desde su ficha o la del negocio."
          accion={puedeEditar ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => nueva(SUGERIDA)} className={boton("primario", "md", "flex")}>Empezar con la sugerida</button>
              <button onClick={() => nueva()} className={boton("secundario", "md", "flex")}>Desde cero</button>
            </div>
          ) : <p className="text-xs text-slate-400">Pídale a un Administrador o Gerente que cree una.</p>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {secuencias.map(s => (
            <div key={s.id} className={tarjeta("p-4")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{s.nombre}</p>
                  {s.descripcion && <p className="text-xs text-slate-500 mt-0.5">{s.descripcion}</p>}
                </div>
                <span className={insignia(s.activa ? "exito" : "neutro")}>{s.activa ? "Activa" : "Pausada"}</span>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                {s.pasos.length} correo{s.pasos.length === 1 ? "" : "s"} · {s.activas} contacto{s.activas === 1 ? "" : "s"} en curso
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {s.pasos.map((p, i) => (i === 0 ? (p.diasEspera === 0 ? "Al inscribir" : `Día ${p.diasEspera}`) : `+${p.diasEspera} d`)).join(" → ")}
              </p>
              {puedeEditar && (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setEditando({ id: s.id, nombre: s.nombre, descripcion: s.descripcion ?? "", pasos: s.pasos.map(p => ({ ...p })) })}
                    className={boton("secundario", "sm", "flex")}><IconPencil size={14} stroke={1.75} /> Editar</button>
                  <button onClick={() => alternarActiva(s)} className={boton("secundario", "sm", "flex")}>{s.activa ? "Pausar" : "Activar"}</button>
                  <button onClick={() => eliminar(s)} className="ml-auto text-slate-400 hover:text-red-600" title="Eliminar"><IconTrash size={16} stroke={1.75} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-800 mb-1">Contactos en secuencia ahora</h2>
        <p className="text-xs text-slate-400 mb-3">
          Para inscribir a alguien, abra la ficha del contacto o del negocio y use &quot;Secuencia&quot;. Los correos salen los días hábiles en la mañana.
        </p>
        {inscripciones.length === 0 ? (
          <p className="text-sm text-slate-400">Nadie está en una secuencia en este momento.</p>
        ) : (
          <div className={tarjeta("divide-y divide-slate-100")}>
            {inscripciones.map(ins => (
              <div key={ins.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <Link href={`/dashboard/contactos/${ins.contacto.id}`} className="font-medium text-slate-900 hover:text-brand-700">{ins.contacto.nombre}</Link>
                <span className="text-slate-500">{ins.secuencia.nombre}</span>
                <span className="text-xs text-slate-400">
                  {ins.enviados} de {ins.secuencia.pasos.length} enviados
                  {ins.proximoEnvio ? ` · próximo: ${formatoFecha(ins.proximoEnvio, { weekday: "short", day: "numeric", month: "short" })}` : ""}
                  {` · ${ins.usuario.nombre}`}
                </span>
                <button onClick={() => detener(ins)} className="ml-auto flex items-center gap-1 text-xs text-red-600 hover:text-red-800">
                  <IconPlayerStop size={14} stroke={1.75} /> Detener
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
