"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";

const SECTORES = [
  "Arte y Cultura", "Educación", "Entretenimiento", "Eventos corporativos",
  "Gobierno", "Hospitalidad y Turismo", "Medios y Comunicación", "Música",
  "Religioso", "Salud", "Teatro y Artes escénicas", "Tecnología",
  "Otro",
];
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ExtrasPanel } from "@/components/extras-panel";
import { CamposPersonalizadosForm } from "@/components/campos-personalizados-form";
import { CamposPersonalizadosVista } from "@/components/campos-personalizados-vista";
import { esClaveCampoPersonalizado } from "@/lib/campos-personalizados";
import { NuevaActividadInline } from "@/components/nueva-actividad-inline";
import { TimelineCliente } from "@/components/timeline-cliente";
import { NotasRapidas } from "@/components/notas-rapidas";
import { numeroCotizacion } from "@/lib/cotizaciones";
import { Adjuntos } from "@/components/adjuntos";
import { Etiquetas } from "@/components/etiquetas";
import { guardarJson } from "@/lib/guardar";
import { WhatsAppBtn } from "@/components/whatsapp-btn";
import { ResumenIA } from "@/components/resumen-ia";
import { CrecimientoClienteIA } from "@/components/crecimiento-cliente-ia";
import { MinutasIA } from "@/components/minutas-ia";
import { CorreosPanel } from "@/components/correos-panel";
import {
  IconPhone, IconMail, IconUsers, IconPencil, IconTrash, IconPlus, IconCheck,
  IconBriefcase, IconFilePlus, IconSend,
} from "@tabler/icons-react";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { SkeletonDetalle } from "@/components/ui/estados";
import { useEscape } from "@/lib/use-escape";
import { mapaEtapas } from "@/lib/etapas-color";
import { tipoActividadDef } from "@/lib/tipos-actividad";
import { formatoFecha } from "@/lib/fecha-bogota";

type Detalle = {
  id: string;
  nombre: string;
  email: string | null;
  sector: string | null;
  extras: Record<string, string> | null;
  sitioWeb: string | null;
  telefono: string | null;
  notas: string | null;
  condicionesComerciales: string | null;
  etiquetas: string[];
  contactos: { id: string; nombre: string; cargo: string | null; telefono: string | null; email: string | null }[];
  oportunidades: { id: string; titulo: string; etapa: string; valor: string | null; motivoPerdida: string | null }[];
  actividades: { id: string; titulo: string; tipo: string; fecha: string; completada: boolean }[];
  cotizaciones: { id: string; numero: number; numeroManual: string | null; estado: string; items: { cantidad: number; precioUnit: string }[] }[];
};

type Pestana = "actividad" | "resumen" | "oportunidades" | "cotizaciones" | "archivos";

const ETAPA_COLOR: Record<string, string> = mapaEtapas("texto");

export default function FichaClientePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [empresa, setEmpresa] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", sector: "", sitioWeb: "", telefono: "", notas: "", condicionesComerciales: "" });
  // Valores de los campos personalizados (clave cp_* -> valor). Se separan de
  // los extras importados de Excel, que no se editan aquí.
  const [camposValores, setCamposValores] = useState<Record<string, string>>({});

  // Pestaña del centro. Arranca en "Actividad": es lo que se usa a diario.
  const [tab, setTab] = useState<Pestana>("actividad");
  // Los botones de la barra de acciones vuelven a montar el formulario de
  // actividad (o el de correo) ya abierto, con el tipo elegido.
  const [quickTipo, setQuickTipo] = useState<string | undefined>(undefined);
  const [quickKey, setQuickKey] = useState(0);
  const [correoKey, setCorreoKey] = useState(0);

  // Crear/editar un contacto del cliente desde su propia ficha. El mismo modal
  // sirve para ambos: "nuevo" → POST; editando uno existente → PATCH.
  const [editContacto, setEditContacto] = useState<Detalle["contactos"][number] | null>(null);
  const [nuevoContacto, setNuevoContacto] = useState(false);
  const [formContacto, setFormContacto] = useState({ nombre: "", cargo: "", email: "", telefono: "" });
  const [guardandoContacto, setGuardandoContacto] = useState(false);
  const modalContactoAbierto = nuevoContacto || !!editContacto;
  useEscape(modalContactoAbierto, () => cerrarModalContacto());

  function abrirNuevoContacto() {
    setEditContacto(null);
    setNuevoContacto(true);
    setFormContacto({ nombre: "", cargo: "", email: "", telefono: "" });
  }

  function abrirEdicionContacto(c: Detalle["contactos"][number]) {
    setNuevoContacto(false);
    setEditContacto(c);
    setFormContacto({ nombre: c.nombre, cargo: c.cargo ?? "", email: c.email ?? "", telefono: c.telefono ?? "" });
  }

  function cerrarModalContacto() {
    setEditContacto(null);
    setNuevoContacto(false);
  }

  function irA(elementoId: string) {
    setTimeout(() => document.getElementById(elementoId)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function nuevaActividad(tipo: string) {
    setTab("actividad");
    setQuickTipo(tipo);
    setQuickKey(k => k + 1);
    irA("tab-panel");
  }

  function nuevoCorreo() {
    setTab("actividad");
    setCorreoKey(k => k + 1);
    irA("panel-correos");
  }

  async function handleGuardarContacto(e: React.FormEvent) {
    e.preventDefault();
    if (!modalContactoAbierto) return;
    setGuardandoContacto(true);
    try {
      const res = nuevoContacto
        ? await fetch(`/api/contactos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formContacto, empresaId: id }),
          })
        : await fetch(`/api/contactos/${editContacto!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formContacto),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo guardar el contacto. Revisa tu conexión e inténtalo de nuevo.");
        setGuardandoContacto(false);
        return;
      }
    } catch {
      toast.error("No se pudo guardar el contacto. Revisa tu conexión e inténtalo de nuevo.");
      setGuardandoContacto(false);
      return;
    }
    cerrarModalContacto();
    setGuardandoContacto(false);
    cargar(true);
  }

  async function handleEliminarContacto() {
    if (!editContacto) return;
    if (!confirm(`¿Eliminar el contacto "${editContacto.nombre}"? Se moverá a la Papelera.`)) return;
    try {
      const res = await fetch(`/api/contactos/${editContacto.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo eliminar el contacto. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    setEditContacto(null);
    cargar(true);
  }

  async function cargar(silencioso = false) {
    if (!silencioso) setCargando(true);
    const res = await fetch(`/api/empresas/${id}`);
    if (res.ok) {
      const data = await res.json();
      setEmpresa(data);
      setForm({
        nombre: data.nombre,
        email: data.email ?? "",
        sector: data.sector ?? "",
        sitioWeb: data.sitioWeb ?? "",
        telefono: data.telefono ?? "",
        notas: data.notas ?? "",
        condicionesComerciales: data.condicionesComerciales ?? "",
      });
      const cp: Record<string, string> = {};
      for (const [k, v] of Object.entries((data.extras ?? {}) as Record<string, unknown>)) {
        if (esClaveCampoPersonalizado(k)) cp[k] = String(v ?? "");
      }
      setCamposValores(cp);
    }
    if (!silencioso) setCargando(false);
  }

  useEffect(() => { cargar(); }, [id]);

  // Al volver a esta pestaña (ej. después de editar el mismo cliente o uno de
  // sus contactos en otra pestaña), refresca en silencio — sin el "Cargando..."
  // de pantalla completa — para no mostrar datos desactualizados. Se omite
  // mientras hay una edición en curso para no pisar cambios sin guardar.
  useEffect(() => {
    function revalidar() {
      if (document.visibilityState === "visible" && !editando && !modalContactoAbierto) cargar(true);
    }
    window.addEventListener("focus", revalidar);
    document.addEventListener("visibilitychange", revalidar);
    return () => {
      window.removeEventListener("focus", revalidar);
      document.removeEventListener("visibilitychange", revalidar);
    };
  }, [editando, modalContactoAbierto, id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`/api/empresas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, extras: camposValores }),
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
    if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/empresas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    router.push("/dashboard/cuentas");
  }

  function fmt(valor: string | null) {
    if (!valor) return null;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor));
  }

  if (cargando) return <SkeletonDetalle />;
  if (!empresa) return <p className="text-sm text-slate-400">No encontrado.</p>;

  // Destinatario sugerido del correo: el del cliente o, si no tiene, el del
  // primer contacto con correo.
  const emailDestino = empresa.email ?? empresa.contactos.find(c => c.email)?.email ?? null;
  // Pendientes primero (la más próxima arriba) y luego las hechas (la más reciente arriba).
  const pendientes = empresa.actividades.filter(a => !a.completada).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hechas = empresa.actividades.filter(a => a.completada).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const ahora = new Date();

  const TABS: { key: Pestana; label: string; n?: number }[] = [
    { key: "actividad", label: "Actividad", n: pendientes.length },
    { key: "resumen", label: "Resumen" },
    { key: "oportunidades", label: "Oportunidades", n: empresa.oportunidades.length },
    { key: "cotizaciones", label: "Cotizaciones", n: empresa.cotizaciones.length },
    { key: "archivos", label: "Archivos" },
  ];

  return (
    <div>
      <Link href="/dashboard/cuentas" className="mb-4 inline-block text-xs text-slate-500 hover:underline">
        ← Volver a Clientes
      </Link>

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{empresa.nombre}</h1>
          <p className="text-sm text-slate-500">{empresa.sector ?? "Sin sector"}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setEditando(!editando)} className={boton("fantasma", "md")} title="Editar cliente">
            <IconPencil size={16} stroke={1.75} />{editando ? "Cancelar" : "Editar"}
          </button>
          <button onClick={handleEliminar} title="Eliminar cliente"
            className="rounded-xl px-2.5 py-2 text-sm text-red-500 hover:bg-red-50">
            <IconTrash size={16} stroke={1.75} />
          </button>
        </div>
      </div>

      {/* Barra de acciones: todo lo que se hace con este cliente, a la vista y con nombre. */}
      <div className="mb-6 flex flex-wrap gap-2" aria-label="Acciones con este cliente">
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
        <Link href={`/dashboard/pipeline?cliente=${empresa.id}`} className={boton("secundario", "md")}>
          <IconBriefcase size={16} stroke={1.75} />Oportunidad
        </Link>
        <Link href={`/dashboard/cotizaciones-formales/nueva?cliente=${empresa.id}`} className={boton("secundario", "md")}>
          <IconFilePlus size={16} stroke={1.75} />Cotización
        </Link>
      </div>

      {editando && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
              <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                className={campo("md", "w-full")} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className={campo("md", "w-full")} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
              <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                className={campo("md", "w-full")} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sector</label>
              <select value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })}
                className={campo("md", "w-full")}>
                <option value="">Sin sector</option>
                {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Sitio web</label>
              <input value={form.sitioWeb} onChange={e => setForm({ ...form, sitioWeb: e.target.value })}
                className={campo("md", "w-full")} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
                className={campo("md", "w-full")} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Condiciones comerciales</label>
              <textarea value={form.condicionesComerciales} onChange={e => setForm({ ...form, condicionesComerciales: e.target.value })} rows={4}
                placeholder="Forma de pago, plazos de entrega, cláusulas negociadas con este cliente..."
                className={campo("md", "w-full")} />
              <p className="mt-1 text-xs text-slate-400">Se precargan al crear una cotización para este cliente (editables por cotización) y salen en el PDF y el enlace público.</p>
            </div>
            <CamposPersonalizadosForm entidad="EMPRESA" valores={camposValores}
              onChange={(clave, valor) => setCamposValores(prev => ({ ...prev, [clave]: valor }))} />
            <div className="sm:col-span-2">
              <button type="submit" disabled={guardando}
                className={boton("primario", "md")}>
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── CUERPO: pestañas (centro) y panel lateral (derecha) ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 min-w-0">
          <div className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200" role="tablist">
            {TABS.map(t => (
              <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
                className={`-mb-px shrink-0 inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}>
                {t.label}
                {!!t.n && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-500">{t.n}</span>}
              </button>
            ))}
          </div>

          <div id="tab-panel" className="flex flex-col gap-5 scroll-mt-4">
            {tab === "actividad" && (
              <>
                <div className={tarjeta("p-5")}>
                  <h2 className="mb-3 text-sm font-bold text-slate-900">Tareas y actividades</h2>
                  <NuevaActividadInline key={quickKey} empresaId={empresa.id}
                    onGuardado={() => { setQuickTipo(undefined); cargar(true); }}
                    tipoInicial={quickTipo} autoAbrir={!!quickTipo} />
                  {empresa.actividades.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">Aún no hay actividades con este cliente.</p>
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
                                      {vencida && "Vencida · "}{formatoFecha(new Date(a.fecha))}
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
                  <CorreosPanel key={correoKey} empresaId={empresa.id} emailDestino={emailDestino}
                    abrirRedactando={correoKey > 0} />
                </div>

                <MinutasIA empresaId={empresa.id} empresaNombre={empresa.nombre} onGuardada={() => cargar(true)} />
              </>
            )}

            {tab === "resumen" && (
              <>
                <NotasRapidas
                  valor={empresa.notas}
                  onGuardar={async (notas) => {
                    await guardarJson(`/api/empresas/${empresa.id}`, "PATCH", { notas });
                    cargar(true);
                  }}
                />
                <ResumenIA empresaId={empresa.id} />
                {empresa.oportunidades.some(o => o.etapa === "GANADA") && <CrecimientoClienteIA empresaId={empresa.id} />}
                {empresa.condicionesComerciales && (
                  <div className={tarjeta("p-5")}>
                    <h2 className="mb-2 text-sm font-bold text-slate-900">Condiciones comerciales</h2>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{empresa.condicionesComerciales}</p>
                  </div>
                )}
                <CamposPersonalizadosVista entidad="EMPRESA" extras={empresa.extras} />
                <ExtrasPanel extras={empresa.extras} />
                <TimelineCliente
                  empresaId={empresa.id}
                  contactos={empresa.contactos.map(c => ({ id: c.id, nombre: c.nombre }))}
                />
              </>
            )}

            {tab === "oportunidades" && (
              <div className={tarjeta("p-5")}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Oportunidades de este cliente</h2>
                  <Link href={`/dashboard/pipeline?cliente=${empresa.id}`} className={boton("secundario", "sm")}>
                    <IconPlus size={14} stroke={2} />Nueva oportunidad
                  </Link>
                </div>
                {empresa.oportunidades.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin oportunidades.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                    {empresa.oportunidades.map((o) => (
                      <li key={o.id} className="py-2">
                        <Link href={`/dashboard/pipeline/${o.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                          {o.titulo}
                        </Link>
                        <span className={`ml-1.5 text-xs font-medium ${ETAPA_COLOR[o.etapa] ?? "text-slate-400"}`}>· {o.etapa}</span>
                        {o.valor && <span className="ml-1.5 text-xs font-semibold text-emerald-700">{fmt(o.valor)}</span>}
                        {o.etapa === "PERDIDA" && o.motivoPerdida && (
                          <span className="ml-1.5 text-xs text-red-400 italic">({o.motivoPerdida})</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === "cotizaciones" && (
              <div className={tarjeta("p-5")}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Cotizaciones de este cliente</h2>
                  <Link href={`/dashboard/cotizaciones-formales/nueva?cliente=${empresa.id}`} className={boton("secundario", "sm")}>
                    <IconFilePlus size={14} stroke={1.75} />Nueva cotización
                  </Link>
                </div>
                {empresa.cotizaciones.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin cotizaciones.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                    {empresa.cotizaciones.map((c) => {
                      const total = c.items.reduce((acc, it) => acc + it.cantidad * Number(it.precioUnit), 0);
                      return (
                        <li key={c.id} className="py-2 text-slate-700">
                          <Link href={`/dashboard/cotizaciones-formales/${c.id}`} className="font-medium hover:text-brand-600">
                            {numeroCotizacion(c)}
                          </Link>
                          <span className="text-slate-400 text-xs ml-1">· {c.estado}</span>
                          <span className="text-xs font-semibold text-emerald-700 ml-1">· {fmt(String(total))}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {tab === "archivos" && <Adjuntos empresaId={empresa.id} />}
          </div>
        </div>

        {/* ── Panel lateral: datos del cliente, contactos y etiquetas ── */}
        <aside className="flex flex-col gap-5">
          <div className={tarjeta("p-5")}>
            <h2 className="mb-3 text-sm font-bold text-slate-900">Datos</h2>
            <dl className="flex flex-col gap-2 text-sm">
              {([
                ["Email", empresa.email],
                ["Teléfono", empresa.telefono],
                ["Sitio web", empresa.sitioWeb],
                ["Sector", empresa.sector],
              ] as const).map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex gap-2">
                  <dt className="w-20 shrink-0 text-slate-400">{etiqueta}</dt>
                  <dd className="min-w-0 break-words text-slate-800">{valor ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={tarjeta("p-5")}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Contactos ({empresa.contactos.length})</h2>
              <button onClick={abrirNuevoContacto}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
                <IconPlus size={13} stroke={2} /> Agregar
              </button>
            </div>
            {empresa.contactos.length === 0 ? (
              <p className="text-xs text-slate-400">Sin contactos vinculados. Usa <button onClick={abrirNuevoContacto} className="text-brand-600 hover:underline">Agregar</button> para crear uno.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                {empresa.contactos.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1.5 py-2 first:pt-0 last:pb-0">
                    <Link href={`/dashboard/contactos/${c.id}`} className="min-w-0 text-slate-700 hover:text-brand-600">
                      <span className="block truncate font-medium">{c.nombre}</span>
                      {c.cargo && <span className="block truncate text-xs text-slate-400">{c.cargo}</span>}
                    </Link>
                    <div className="flex items-center gap-3">
                      {c.email && (
                        <a href={`mailto:${c.email}`} title={`Escribir a ${c.email}`} className="text-slate-300 hover:text-brand-600">
                          <IconMail size={15} stroke={1.75} />
                        </a>
                      )}
                      {c.telefono && (
                        <WhatsAppBtn telefono={c.telefono} nombre={c.nombre} />
                      )}
                      <button onClick={() => abrirEdicionContacto(c)} title="Editar contacto"
                        className="text-slate-300 hover:text-brand-600">
                        <IconPencil size={15} stroke={1.75} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={tarjeta("p-5")}>
            <h2 className="text-sm font-bold text-slate-900 mb-3">Etiquetas</h2>
            <Etiquetas
              etiquetas={empresa.etiquetas ?? []}
              onGuardar={async (etiquetas) => {
                await guardarJson(`/api/empresas/${empresa.id}`, "PATCH", { etiquetas });
                cargar(true);
              }}
            />
          </div>
        </aside>
      </div>

      {/* Modal crear / editar contacto */}
      {modalContactoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in"
          onClick={cerrarModalContacto}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl animate-modal-in"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-sm font-semibold text-slate-800">{nuevoContacto ? "Nuevo contacto" : "Editar contacto"}</h2>
            <form onSubmit={handleGuardarContacto} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
                <input required value={formContacto.nombre}
                  onChange={e => setFormContacto(f => ({ ...f, nombre: e.target.value }))}
                  className={campo("md", "w-full")} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Cargo</label>
                <input value={formContacto.cargo}
                  onChange={e => setFormContacto(f => ({ ...f, cargo: e.target.value }))}
                  className={campo("md", "w-full")} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Teléfono</label>
                <input value={formContacto.telefono}
                  onChange={e => setFormContacto(f => ({ ...f, telefono: e.target.value }))}
                  className={campo("md", "w-full")} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-500">Email</label>
                <input type="email" value={formContacto.email}
                  onChange={e => setFormContacto(f => ({ ...f, email: e.target.value }))}
                  className={campo("md", "w-full")} />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                {!nuevoContacto ? (
                  <button type="button" onClick={handleEliminarContacto}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700">
                    <IconTrash size={14} stroke={1.75} /> Eliminar
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button type="button" onClick={cerrarModalContacto}
                    className={boton("secundario", "md")}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={guardandoContacto}
                    className={boton("primario", "md")}>
                    {guardandoContacto ? "Guardando..." : nuevoContacto ? "Crear contacto" : "Guardar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
