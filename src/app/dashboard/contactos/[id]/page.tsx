"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { WhatsAppBtn } from "@/components/whatsapp-btn";
import { ExtrasPanel } from "@/components/extras-panel";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";
import { NotasRapidas } from "@/components/notas-rapidas";
import { guardarJson } from "@/lib/guardar";
import { Adjuntos } from "@/components/adjuntos";
import { CorreosPanel } from "@/components/correos-panel";
import { boton, tarjeta } from "@/components/ui/estilos";
import { SkeletonDetalle } from "@/components/ui/estados";
import { mapaEtapas } from "@/lib/etapas-color";
import { tipoActividadDef } from "@/lib/tipos-actividad";
import {
  IconPhone, IconUsers, IconPencil, IconTrash, IconPlus, IconCheck, IconBriefcase, IconSend,
} from "@tabler/icons-react";

type Empresa = { id: string; nombre: string };

type Detalle = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  notas: string | null;
  extras: Record<string, string> | null;
  empresa: Empresa | null;
  oportunidades: { id: string; titulo: string; etapa: string; valor: string | null; motivoPerdida: string | null }[];
  actividades: { id: string; titulo: string; tipo: string; fecha: string; completada: boolean }[];
};

const ETAPA_COLOR: Record<string, string> = mapaEtapas("texto");

export default function FichaContactoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contacto, setContacto] = useState<Detalle | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  // Los botones de la barra de acciones vuelven a montar el formulario de
  // actividad (o el de correo) ya abierto, con el tipo elegido.
  const [quickTipo, setQuickTipo] = useState<string | undefined>(undefined);
  const [quickKey, setQuickKey] = useState(0);
  const [correoKey, setCorreoKey] = useState(0);

  function irA(elementoId: string) {
    setTimeout(() => document.getElementById(elementoId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function nuevaActividad(tipo: string) {
    setQuickTipo(tipo);
    setQuickKey(k => k + 1);
    irA("panel-actividades");
  }

  function nuevoCorreo() {
    setCorreoKey(k => k + 1);
    irA("panel-correos");
  }
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", cargo: "", notas: "", empresaId: "" });

  async function cargar(silencioso = false) {
    if (!silencioso) setCargando(true);
    const res = await fetch(`/api/contactos/${id}`);
    if (res.ok) {
      const data = await res.json();
      setContacto(data);
      setForm({
        nombre: data.nombre,
        email: data.email ?? "",
        telefono: data.telefono ?? "",
        cargo: data.cargo ?? "",
        notas: data.notas ?? "",
        empresaId: data.empresa?.id ?? "",
      });
    }
    if (!silencioso) setCargando(false);
  }

  async function cargarEmpresas() {
    const res = await fetch("/api/empresas");
    setEmpresas(await res.json());
  }

  useEffect(() => { cargar(); cargarEmpresas(); }, [id]);

  // Al volver a esta pestaña (ej. después de editar el mismo contacto o su
  // empresa en otra pestaña), refresca en silencio — sin el "Cargando..." de
  // pantalla completa — para no mostrar datos desactualizados. Se omite
  // mientras hay una edición en curso para no pisar cambios sin guardar.
  useEffect(() => {
    function revalidar() {
      if (document.visibilityState === "visible" && !editando) cargar(true);
    }
    window.addEventListener("focus", revalidar);
    document.addEventListener("visibilitychange", revalidar);
    return () => {
      window.removeEventListener("focus", revalidar);
      document.removeEventListener("visibilitychange", revalidar);
    };
  }, [editando, id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`/api/contactos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Se mantiene el modo edición abierto para no perder lo escrito.
        toast.error(data.error ?? "No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
        setGuardando(false);
        return;
      }
    } catch {
      toast.error("No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
      setGuardando(false);
      return;
    }
    setEditando(false);
    setGuardando(false);
    cargar();
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este contacto? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/contactos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    router.push("/dashboard/contactos");
  }

  function formatoMoneda(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  if (cargando) return <SkeletonDetalle />;
  if (!contacto) return <p className="text-sm text-neutral-400">No encontrado.</p>;

  // Pendientes primero (la más próxima arriba) y luego las hechas (la más reciente arriba).
  const pendientes = contacto.actividades.filter(a => !a.completada).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hechas = contacto.actividades.filter(a => a.completada).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ahora = new Date();

  return (
    <div>
      <Link href="/dashboard/contactos" className="mb-4 inline-block text-xs text-slate-500 hover:underline">
        ← Volver a Contactos
      </Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{contacto.nombre}</h1>
          <p className="text-sm text-slate-500">
            {contacto.cargo ?? "Sin cargo"}
            {contacto.empresa && <> · <Link href={`/dashboard/cuentas/${contacto.empresa.id}`} className="hover:text-brand-600 hover:underline">{contacto.empresa.nombre}</Link></>}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setEditando(!editando)} className={boton("fantasma", "md")} title="Editar contacto">
            <IconPencil size={16} stroke={1.75} />{editando ? "Cancelar" : "Editar"}
          </button>
          <button onClick={handleEliminar} title="Eliminar contacto"
            className="rounded-xl px-2.5 py-2 text-sm text-red-500 hover:bg-red-50">
            <IconTrash size={16} stroke={1.75} />
          </button>
        </div>
      </div>

      {/* Barra de acciones: todo lo que se hace con este contacto, a la vista y con nombre. */}
      <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Acciones con este contacto">
        <button type="button" onClick={() => nuevaActividad("TAREA")} className={boton("primario", "md")}>
          <IconPlus size={16} stroke={2} />Tarea
        </button>
        <button type="button" onClick={() => nuevaActividad("LLAMADA")} className={boton("secundario", "md")}>
          <IconPhone size={16} stroke={1.75} />Llamada
        </button>
        <button type="button" onClick={() => nuevaActividad("REUNION")} className={boton("secundario", "md")}>
          <IconUsers size={16} stroke={1.75} />Reunión
        </button>
        <button type="button" onClick={nuevoCorreo} className={boton("secundario", "md")}>
          <IconSend size={16} stroke={1.75} />Enviar correo
        </button>
        {contacto.empresa && (
          <Link href={`/dashboard/pipeline?cliente=${contacto.empresa.id}&contacto=${contacto.id}`} className={boton("secundario", "md")}>
            <IconBriefcase size={16} stroke={1.75} />Oportunidad
          </Link>
        )}
        {contacto.telefono && <WhatsAppBtn telefono={contacto.telefono} nombre={contacto.nombre} />}
      </div>

      {editando && (
        <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Cargo</label>
              <input
                value={form.cargo}
                onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Empresa</label>
              <select
                value={form.empresaId}
                onChange={(e) => setForm({ ...form, empresaId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Sin empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Notas</label>
              <textarea
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                disabled={guardando}
                className={boton("primario", "md")}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0 flex flex-col gap-5">
          <div id="panel-actividades" className={tarjeta("p-5 scroll-mt-4")}>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Tareas y actividades</h2>
            <NuevaActividadInline key={quickKey} contactoId={contacto.id} empresaId={contacto.empresa?.id}
              onGuardado={() => { setQuickTipo(undefined); cargar(true); }}
              tipoInicial={quickTipo} autoAbrir={!!quickTipo} />
            {contacto.actividades.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">Aún no hay actividades con este contacto.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-4">
                {[{ titulo: "Pendientes", lista: pendientes }, { titulo: "Hechas", lista: hechas }]
                  .filter(g => g.lista.length > 0)
                  .map(g => (
                    <div key={g.titulo}>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.titulo}</p>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {g.lista.map(a => {
                          const def = tipoActividadDef(a.tipo);
                          const Icono = def?.icon ?? IconCheck;
                          const vencida = !a.completada && new Date(a.fecha) < ahora;
                          return (
                            <li key={a.id} className={`flex items-center gap-2 ${a.completada ? "text-slate-400 line-through" : "text-slate-700"}`}>
                              <Icono size={15} stroke={1.75} className="shrink-0 text-slate-400" aria-label={def?.label ?? a.tipo} />
                              <span className="min-w-0 truncate">{a.titulo}</span>
                              <span className={`ml-auto shrink-0 text-xs ${vencida ? "font-semibold text-red-600" : "text-slate-400"}`}>
                                {vencida && "Vencida · "}{new Date(a.fecha).toLocaleDateString("es-CO")}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div id="panel-correos" className="scroll-mt-4">
            <CorreosPanel key={correoKey} contactoId={contacto.id} empresaId={contacto.empresa?.id}
              emailDestino={contacto.email} abrirRedactando={correoKey > 0} />
          </div>

          <NotasRapidas
            valor={contacto.notas}
            onGuardar={async (notas) => {
              await guardarJson(`/api/contactos/${contacto.id}`, "PATCH", { notas });
              cargar(true);
            }}
          />

          <Adjuntos contactoId={contacto.id} />
        </div>

        {/* ── Panel lateral: datos y oportunidades del contacto ── */}
        <aside className="flex flex-col gap-5">
          <div className={tarjeta("p-5")}>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Datos</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {([
                ["Email", contacto.email],
                ["Teléfono", contacto.telefono],
                ["Cargo", contacto.cargo],
              ] as const).map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex gap-2">
                  <dt className="w-20 shrink-0 text-slate-400">{etiqueta}</dt>
                  <dd className="min-w-0 break-words text-slate-800">{valor ?? "—"}</dd>
                </div>
              ))}
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-slate-400">Empresa</dt>
                <dd className="min-w-0 break-words text-slate-800">
                  {contacto.empresa
                    ? <Link href={`/dashboard/cuentas/${contacto.empresa.id}`} className="hover:text-brand-600 hover:underline">{contacto.empresa.nombre}</Link>
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className={tarjeta("p-5")}>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Oportunidades ({contacto.oportunidades.length})</h2>
            {contacto.oportunidades.length === 0 ? (
              <p className="text-xs text-slate-400">Sin oportunidades.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                {contacto.oportunidades.map((o) => (
                  <li key={o.id} className="py-2 first:pt-0 last:pb-0">
                    <Link href={`/dashboard/pipeline/${o.id}`} className="font-medium text-slate-800 hover:text-brand-600">{o.titulo}</Link>
                    <span className={`ml-1.5 text-xs font-medium ${ETAPA_COLOR[o.etapa] ?? "text-slate-400"}`}>· {o.etapa}</span>
                    {o.valor && <span className="ml-1.5 text-xs font-semibold text-emerald-700">{formatoMoneda(o.valor)}</span>}
                    {o.etapa === "PERDIDA" && o.motivoPerdida && (
                      <span className="ml-1.5 text-xs text-red-400 italic">({o.motivoPerdida})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ExtrasPanel extras={contacto.extras} />
        </aside>
      </div>
    </div>
  );
}
