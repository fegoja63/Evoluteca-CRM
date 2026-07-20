"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { KpiCard } from "@/components/kpi-card";
import {
  IconPinned,
  IconChevronLeft, IconChevronRight, IconTrash, IconLayoutList, IconCalendar,
  IconFileExport, IconFileSpreadsheet, IconPlus, IconBell, IconCircleCheck,
  IconAlertTriangle, IconPencil, IconUsers,
} from "@tabler/icons-react";
import { tiposActividadVisibles, tipoActividadDef, type TipoActividadDef } from "@/lib/tipos-actividad";

// Convierte una fecha ISO al formato que espera <input type="datetime-local">
// (YYYY-MM-DDTHH:mm) en hora local, para precargarla al editar.
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Actividad = {
  id: string;
  tipo: string;
  titulo: string;
  fecha: string;
  notas: string | null;
  completada: boolean;
  estado: string;
  creadoBy: string | null;
  empresa: { id: string; nombre: string } | null;
  contacto: { id: string; nombre: string } | null;
  oportunidad: { id: string; titulo: string } | null;
  responsable: { id: string; nombre: string } | null;
};

type UsuarioEquipo = { id: string; nombre: string; activo: boolean };

const ESTADOS_ACTIVIDAD = [
  { key: "PENDIENTE", label: "Pendiente", badge: "bg-slate-100 text-slate-600" },
  { key: "EN_PROGRESO", label: "En progreso", badge: "bg-amber-100 text-amber-700" },
  { key: "COMPLETADA", label: "Completada", badge: "bg-emerald-100 text-emerald-700" },
] as const;

function estadoDef(estado: string) {
  return ESTADOS_ACTIVIDAD.find((e) => e.key === estado) ?? ESTADOS_ACTIVIDAD[0];
}

type Empresa = { id: string; nombre: string };
type Contacto = { id: string; nombre: string; empresa?: { id: string; nombre: string } | null };
type Oportunidad = { id: string; titulo: string; empresa?: { id: string; nombre: string } | null };

const DIAS_SEMANA = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
const MESES_NOMBRE = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function CalendarioActividades({
  actividades, mes, setMes, diaSeleccionado, setDiaSeleccionado, onToggle, onEditar, onEliminar, formatoFecha, tipos,
}: {
  actividades: Actividad[];
  mes: { anio: number; mes: number };
  setMes: (m: { anio: number; mes: number }) => void;
  diaSeleccionado: string | null;
  setDiaSeleccionado: (d: string | null) => void;
  onToggle: (id: string, completada: boolean) => void;
  onEditar: (a: Actividad) => void;
  onEliminar: (id: string) => void;
  formatoFecha: (f: string) => string;
  tipos: TipoActividadDef[];
}) {
  const hoy = new Date();
  const primerDia = new Date(mes.anio, mes.mes, 1);
  const ultimoDia = new Date(mes.anio, mes.mes + 1, 0);

  // lunes=0 ... domingo=6
  const offsetInicio = (primerDia.getDay() + 6) % 7;
  const totalCeldas = Math.ceil((offsetInicio + ultimoDia.getDate()) / 7) * 7;

  function keyDia(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  // Agrupar actividades por día
  const porDia: Record<string, Actividad[]> = {};
  for (const a of actividades) {
    const k = keyDia(new Date(a.fecha));
    if (!porDia[k]) porDia[k] = [];
    porDia[k].push(a);
  }

  const actsDia = diaSeleccionado ? (porDia[diaSeleccionado] ?? []) : [];

  function navMes(delta: number) {
    const d = new Date(mes.anio, mes.mes + delta, 1);
    setMes({ anio: d.getFullYear(), mes: d.getMonth() });
    setDiaSeleccionado(null);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {/* Navegación mes */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navMes(-1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1">
            <IconChevronLeft size={14} stroke={1.75} />Ant.
          </button>
          <h2 className="text-sm font-bold text-slate-900">{MESES_NOMBRE[mes.mes]} {mes.anio}</h2>
          <button onClick={() => navMes(1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1">
            Sig.<IconChevronRight size={14} stroke={1.75} />
          </button>
        </div>

        {/* Cabecera días */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: totalCeldas }).map((_, i) => {
            const numDia = i - offsetInicio + 1;
            if (numDia < 1 || numDia > ultimoDia.getDate()) {
              return <div key={i} />;
            }
            const fecha = new Date(mes.anio, mes.mes, numDia);
            const k = keyDia(fecha);
            const acts = porDia[k] ?? [];
            const esHoy = keyDia(hoy) === k;
            const esSeleccionado = diaSeleccionado === k;
            const tieneVencidas = acts.some(a => !a.completada && new Date(a.fecha) < hoy);

            return (
              <button key={i} onClick={() => setDiaSeleccionado(esSeleccionado ? null : k)}
                className={`rounded-xl p-1.5 min-h-[56px] flex flex-col items-center transition-all border ${
                  esSeleccionado ? "border-brand-400 bg-brand-50" :
                  esHoy ? "border-brand-200 bg-brand-50" :
                  acts.length > 0 ? "border-slate-200 hover:border-brand-200 hover:bg-slate-50" :
                  "border-transparent hover:bg-slate-50"
                }`}>
                <span className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  esHoy ? "bg-accent-600 text-white" : "text-slate-700"
                }`}>{numDia}</span>
                {/* Puntos de actividades (max 3) */}
                {acts.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {acts.slice(0, 3).map(a => {
                      const dot = tipoActividadDef(a.tipo)?.dot ?? "bg-slate-400";
                      return (
                        <span key={a.id}
                          className={`w-1.5 h-1.5 rounded-full ${a.completada ? "bg-slate-200" : tieneVencidas && !a.completada ? "bg-red-400" : dot}`} />
                      );
                    })}
                    {acts.length > 3 && <span className="text-xs text-slate-400 leading-none">+{acts.length-3}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-slate-100 flex-wrap">
          {tipos.map(t => (
            <span key={t.key} className="flex items-center gap-1 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full ${t.dot}`} />{t.label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-red-400" />Vencida
          </span>
        </div>
      </div>

      {/* Panel del día seleccionado */}
      {diaSeleccionado && (
        <div className="bg-white rounded-2xl border border-brand-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            {new Date(diaSeleccionado + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
            <span className="ml-2 text-xs text-slate-400 font-normal">{actsDia.length} actividad{actsDia.length !== 1 ? "es" : ""}</span>
          </h3>
          {actsDia.length === 0 ? (
            <p className="text-xs text-slate-400">Sin actividades este día.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {actsDia.sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()).map(a => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
                  <label className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer"
                    title="Marca la tarea como completada. No la borra.">
                    <input type="checkbox" checked={a.completada}
                      onChange={e => onToggle(a.id, e.target.checked)} className="h-4 w-4" />
                    <span className="text-[10px] leading-none text-slate-400">Hecha</span>
                  </label>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${tipoActividadDef(a.tipo)?.dot ?? "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className={a.completada ? "text-slate-400 line-through text-xs" : "font-medium text-slate-900 text-xs"}>
                      {a.titulo}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatoFecha(a.fecha)}
                      {a.empresa && ` · ${a.empresa.nombre}`}
                    </p>
                  </div>
                  <button onClick={() => onEditar(a)} title="Editar"
                    className="text-slate-300 hover:text-brand-600 shrink-0">
                    <IconPencil size={14} stroke={1.75} />
                  </button>
                  <button onClick={() => onEliminar(a.id)} title="Borrar tarea"
                    className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-1.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 shrink-0">
                    <IconTrash size={12} stroke={1.75} />
                    Borrar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AgendaContent() {
  const { data: session } = useSession();
  const miId = session?.user?.id;
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioEquipo[]>([]);
  const [modulos, setModulos] = useState<Record<string, boolean>>({});
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const searchParams = useSearchParams();
  const [filtro, setFiltro] = useState<"pendientes" | "todas" | "vencidas" | "asignadas">(
    searchParams.get("vencidas") === "1" ? "vencidas" : "pendientes"
  );
  const [vista, setVista] = useState<"lista" | "calendario">("lista");

  // Al abrir el formulario de edición se desliza suavemente hasta él. En la
  // vista de lista el formulario queda justo debajo de la actividad editada,
  // así que el usuario no pierde de vista qué está editando (antes saltaba al
  // tope de la página y era fácil no notar que el formulario se habia abierto).
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mostrarForm && editandoId) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [mostrarForm, editandoId]);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const h = new Date(); return { anio: h.getFullYear(), mes: h.getMonth() };
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [notificando, setNotificando] = useState<string | null>(null);
  const [notifOk, setNotifOk] = useState<string | null>(null);
  // Id de la tarea cuyo menú de "Reasignar" está abierto (null = ninguno).
  const [reasignandoId, setReasignandoId] = useState<string | null>(null);

  async function exportarExcel() {
    setExportando(true);
    const res = await fetch("/api/exportar/agenda");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agenda-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    setExportando(false);
  }
  const [form, setForm] = useState({
    tipo: "TAREA", titulo: "", fecha: "", notas: "", empresaId: "", contactoId: "", oportunidadId: "",
    responsableId: "", estado: "PENDIENTE",
  });
  const [nuevoContacto, setNuevoContacto] = useState(false);
  const [nuevoContactoNombre, setNuevoContactoNombre] = useState("");
  const [creandoContacto, setCreandoContacto] = useState(false);

  async function crearContactoRapido() {
    const nombre = nuevoContactoNombre.trim();
    if (!nombre) return;
    setCreandoContacto(true);
    try {
      const res = await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, empresaId: form.empresaId || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No se pudo crear el contacto. Inténtalo de nuevo.");
        return;
      }
      const creado: Contacto = await res.json();
      setContactos((prev) => [creado, ...prev]);
      setForm((f) => ({ ...f, contactoId: creado.id }));
      setNuevoContacto(false);
      setNuevoContactoNombre("");
    } catch {
      toast.error("No se pudo crear el contacto. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setCreandoContacto(false);
    }
  }

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/actividades");
    const data = await res.json();
    setActividades(data);
    setCargando(false);
  }

  async function cargarRelaciones() {
    const [resEmp, resCon, resOp, resUsr] = await Promise.all([
      fetch("/api/empresas"),
      fetch("/api/contactos"),
      fetch("/api/oportunidades"),
      fetch("/api/usuarios"),
    ]);
    setEmpresas(await resEmp.json());
    setContactos(await resCon.json());
    setOportunidades(await resOp.json());
    const usr: UsuarioEquipo[] = await resUsr.json();
    // Solo usuarios activos como posibles responsables.
    setUsuarios(Array.isArray(usr) ? usr.filter((u) => u.activo) : []);
  }

  useEffect(() => {
    cargar();
    cargarRelaciones();
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setModulos((data.modulos as Record<string, boolean>) ?? {}))
      .catch(() => {});
  }, []);

  // Tipos ofrecidos en el selector: las visitas comercial/técnica solo aparecen
  // en el vertical de teatros/alquileres.
  const tiposVisibles = tiposActividadVisibles(modulos);

  function cerrarForm() {
    setMostrarForm(false);
    setEditandoId(null);
    setForm({ tipo: "TAREA", titulo: "", fecha: "", notas: "", empresaId: "", contactoId: "", oportunidadId: "", responsableId: "", estado: "PENDIENTE" });
    setNuevoContacto(false);
    setNuevoContactoNombre("");
  }

  function iniciarEdicion(a: Actividad) {
    setEditandoId(a.id);
    setForm({
      tipo: a.tipo,
      titulo: a.titulo,
      fecha: toLocalInput(a.fecha),
      notas: a.notas ?? "",
      empresaId: a.empresa?.id ?? "",
      contactoId: a.contacto?.id ?? "",
      oportunidadId: a.oportunidad?.id ?? "",
      responsableId: a.responsable?.id ?? "",
      estado: a.estado ?? "PENDIENTE",
    });
    setMostrarForm(true);
    // No se salta al tope de la página: en la vista de lista el formulario se
    // inserta justo debajo de la actividad que se está editando (ver
    // filasAntes/filasDespues) y el efecto de abajo lo desliza a la vista.
  }

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(
        editandoId ? `/api/actividades/${editandoId}` : "/api/actividades",
        {
          method: editandoId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // No se cierra ni se limpia el formulario si falló: así el usuario no
        // pierde lo que escribió y puede reintentar.
        toast.error(data.error ?? "No se pudo guardar la actividad. Revisa tu conexión e inténtalo de nuevo.");
        setGuardando(false);
        return;
      }
    } catch {
      toast.error("No se pudo guardar la actividad. Revisa tu conexión e inténtalo de nuevo.");
      setGuardando(false);
      return;
    }
    cerrarForm();
    setGuardando(false);
    cargar();
  }

  async function toggleCompletada(id: string, completada: boolean) {
    const previas = actividades;
    // `estado` y `completada` van juntos (igual que en el backend).
    const estado = completada ? "COMPLETADA" : "PENDIENTE";
    setActividades((prev) => prev.map((a) => (a.id === id ? { ...a, completada, estado } : a)));
    try {
      const res = await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setActividades(previas);
      toast.error("No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function reasignar(id: string, nuevoResponsableId: string) {
    setReasignandoId(null);
    const nuevo = usuarios.find((u) => u.id === nuevoResponsableId);
    if (!nuevo) return;
    const previas = actividades;
    setActividades((prev) =>
      prev.map((a) => (a.id === id ? { ...a, responsable: { id: nuevo.id, nombre: nuevo.nombre } } : a))
    );
    try {
      const res = await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsableId: nuevoResponsableId }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        nuevo.id === miId ? "Tarea reasignada a ti." : `Tarea reasignada a ${nuevo.nombre}.`
      );
    } catch {
      setActividades(previas);
      toast.error("No se pudo reasignar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function cambiarEstado(id: string, estado: string) {
    const previas = actividades;
    setActividades((prev) =>
      prev.map((a) => (a.id === id ? { ...a, estado, completada: estado === "COMPLETADA" } : a))
    );
    try {
      const res = await fetch(`/api/actividades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setActividades(previas);
      toast.error("No se pudo guardar el cambio. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  async function enviarRecordatorio(a: Actividad) {
    setNotificando(a.id);
    await fetch("/api/notificaciones/enviar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "RECORDATORIO_ACTIVIDAD",
        datos: {
          titulo: a.titulo,
          tipo: tipoActividadDef(a.tipo)?.label ?? a.tipo,
          fecha: new Date(a.fecha).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          notas: "",
        },
      }),
    });
    setNotificando(null);
    setNotifOk(a.id);
    setTimeout(() => setNotifOk(null), 3000);
  }

  async function eliminarActividad(id: string) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    const previas = actividades;
    setActividades((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(`/api/actividades/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setActividades(previas);
      toast.error("No se pudo eliminar. Revisa tu conexión e inténtalo de nuevo.");
    }
  }

  function formatoFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-ES", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }

  const visibles = actividades.filter((a) => {
    if (filtro === "vencidas") return !a.completada && new Date(a.fecha) < new Date();
    if (filtro === "pendientes") return !a.completada;
    if (filtro === "asignadas") return a.responsable?.id === miId && !a.completada;
    return true;
  });

  // Cuántas tareas pendientes me asignaron otros (para el badge del filtro).
  const asignadasAmi = actividades.filter(
    (a) => a.responsable?.id === miId && a.creadoBy !== miId && !a.completada
  ).length;

  // Al editar desde la vista de lista, la lista se parte en dos alrededor del
  // formulario: así este aparece justo debajo de la actividad que se edita, en
  // lugar de al inicio de la página. Al crear una actividad nueva (o en la
  // vista de calendario) no se parte y el formulario queda arriba como siempre.
  const idxEdicion =
    mostrarForm && editandoId && vista === "lista"
      ? visibles.findIndex((a) => a.id === editandoId)
      : -1;
  const filasAntes = idxEdicion >= 0 ? visibles.slice(0, idxEdicion + 1) : [];
  const filasDespues = idxEdicion >= 0 ? visibles.slice(idxEdicion + 1) : visibles;

  // Se extrae a función porque ahora la fila se dibuja en dos lugares: en el
  // trozo de lista anterior al formulario y en el posterior.
  function renderFila(a: Actividad) {
    const IconoTipo = tipoActividadDef(a.tipo)?.icon ?? IconPinned;
    // "Hoy" se resalta en rojo aunque aún no esté vencida — es la alerta
    // del día, para que no se pierda entre el resto de la lista.
    const esHoy = !a.completada && new Date(a.fecha).toDateString() === new Date().toDateString();
    return (
      <div key={a.id}
        className={`flex items-center gap-3 rounded-xl border p-3 text-sm hover:bg-neutral-50 ${esHoy ? "border-red-200 bg-red-50" : "border-neutral-200"}`}>
        {/* Casilla para marcar COMPLETADA (no borra ni selecciona). El
            rótulo debajo y el tooltip evitan que se confunda con borrar. */}
        <label className="flex flex-col items-center gap-0.5 shrink-0 cursor-pointer"
          title="Marca la tarea como completada. No la borra.">
          <input type="checkbox" checked={a.completada}
            onChange={(e) => toggleCompletada(a.id, e.target.checked)} className="h-4 w-4" />
          <span className="text-[10px] leading-none text-neutral-400">Hecha</span>
        </label>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 flex items-center gap-1">
          <IconoTipo size={12} stroke={1.75} />
          {tipoActividadDef(a.tipo)?.label}
        </span>
        {esHoy && (
          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            Hoy
          </span>
        )}
        <div className="flex-1">
          <p className={a.completada ? "text-neutral-400 line-through" : esHoy ? "font-semibold text-red-700" : "font-medium text-neutral-900"}>
            {a.titulo}
          </p>
          <p className={`text-xs ${esHoy ? "text-red-500" : "text-neutral-500"}`}>
            {formatoFecha(a.fecha)}
            {a.responsable && ` · 👤 ${a.responsable.id === miId ? "Yo" : a.responsable.nombre}`}
            {a.empresa && ` · ${a.empresa.nombre}`}
            {a.contacto && ` · ${a.contacto.nombre}`}
            {a.oportunidad && ` · ${a.oportunidad.titulo}`}
          </p>
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setReasignandoId(reasignandoId === a.id ? null : a.id)}
            title="Reasignar a otra persona"
            className="flex items-center gap-1 rounded-md border border-brand-300 bg-white px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
          >
            <IconUsers size={13} stroke={1.75} />
            Reasignar
          </button>
          {reasignandoId === a.id && (
            <>
              {/* Capa invisible para cerrar el menú al hacer clic fuera */}
              <div className="fixed inset-0 z-10" onClick={() => setReasignandoId(null)} />
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Asignar a</p>
                {usuarios.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => reasignar(a.id, u.id)}
                    className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-brand-50 ${a.responsable?.id === u.id ? "font-semibold text-brand-700" : "text-neutral-700"}`}
                  >
                    <span>{u.id === miId ? `${u.nombre} (yo)` : u.nombre}</span>
                    {a.responsable?.id === u.id && <IconCircleCheck size={13} stroke={1.75} className="text-brand-600" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <select
          value={a.estado}
          onChange={(e) => cambiarEstado(a.id, e.target.value)}
          title="Cambiar estado"
          className={`shrink-0 rounded-full border-0 px-2 py-1 text-xs font-semibold cursor-pointer outline-none ${estadoDef(a.estado).badge}`}
        >
          {ESTADOS_ACTIVIDAD.map((e) => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>
        {!a.completada && new Date(a.fecha) < new Date() && (
          <button onClick={() => enviarRecordatorio(a)} disabled={notificando === a.id}
            className="text-amber-400 hover:text-amber-600 disabled:opacity-50" title="Enviarme recordatorio">
            {notifOk === a.id ? <IconCircleCheck size={16} stroke={1.75} className="text-emerald-500" /> : notificando === a.id ? "..." : <IconBell size={16} stroke={1.75} />}
          </button>
        )}
        <button onClick={() => iniciarEdicion(a)}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium shrink-0 ${editandoId === a.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600"}`} title="Editar tarea">
          <IconPencil size={13} stroke={1.75} />
          Editar
        </button>
        <button onClick={() => eliminarActividad(a.id)}
          className="flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 shrink-0" title="Borrar tarea">
          <IconTrash size={13} stroke={1.75} />
          Borrar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Agenda</h1>
        <p className="text-slate-500 text-sm mt-1">Tareas, llamadas y reuniones</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total actividades" valor={actividades.length} icon={IconCalendar} color="bg-brand-500" iconBg="bg-brand-50" iconColor="text-brand-600" />
        <KpiCard label="Pendientes" valor={actividades.filter(a => !a.completada).length} icon={IconBell} color="bg-amber-500" iconBg="bg-amber-50" iconColor="text-amber-600" />
        <KpiCard label="Completadas" valor={actividades.filter(a => a.completada).length} icon={IconCircleCheck} color="bg-emerald-500" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <KpiCard
          label="Vencidas"
          valor={actividades.filter(a => !a.completada && new Date(a.fecha) < new Date()).length}
          icon={IconAlertTriangle} color="bg-red-400" iconBg="bg-red-50" iconColor="text-red-500"
          sub="Sin completar y pasadas"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        {/* Toggle vista */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm w-fit">
          <button onClick={() => setVista("lista")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-1.5 ${vista === "lista" ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <IconLayoutList size={15} stroke={1.75} />Lista
          </button>
          <button onClick={() => setVista("calendario")}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-1.5 ${vista === "calendario" ? "bg-accent-600 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"}`}>
            <IconCalendar size={15} stroke={1.75} />Calendario
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/api/exportar/actividades-ics"
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-1.5">
            <IconFileExport size={15} stroke={1.75} />iCal
          </a>
          <button onClick={exportarExcel} disabled={exportando}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5">
            {exportando ? "Exportando..." : (<><IconFileSpreadsheet size={15} stroke={1.75} />Excel</>)}
          </button>
          <button onClick={() => { setEditandoId(null); setForm({ tipo: "TAREA", titulo: "", fecha: "", notas: "", empresaId: "", contactoId: "", oportunidadId: "", responsableId: miId ?? "", estado: "PENDIENTE" }); setMostrarForm(true); }}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 flex items-center gap-1.5">
            <IconPlus size={15} stroke={1.75} />Nueva actividad
          </button>
        </div>
      </div>

      {vista === "lista" && (
        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={() => setFiltro("pendientes")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filtro === "pendientes" ? "bg-brand-50 text-brand-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}>
            Pendientes
          </button>
          <button onClick={() => setFiltro("asignadas")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 ${filtro === "asignadas" ? "bg-brand-50 text-brand-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}>
            Asignadas a mí
            {asignadasAmi > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold leading-none">
                {asignadasAmi}
              </span>
            )}
          </button>
          <button onClick={() => setFiltro("todas")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filtro === "todas" ? "bg-brand-50 text-brand-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}>
            Todas
          </button>
          <button onClick={() => setFiltro("vencidas")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filtro === "vencidas" ? "bg-red-50 text-red-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}>
            Vencidas
          </button>
        </div>
      )}

      {/* Trozo de la lista que va ANTES del formulario: termina justo en la
          actividad que se está editando, para que el formulario aparezca
          inmediatamente debajo de ella. Vacío si no se está editando. */}
      {filasAntes.length > 0 && (
        <div className="mb-2 flex flex-col gap-2">
          {filasAntes.map(renderFila)}
        </div>
      )}

      {mostrarForm && (
        <div ref={formRef} className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <h2 className="mb-4 text-sm font-medium text-neutral-900">{editandoId ? "Editar actividad" : "Nueva actividad"}</h2>
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Título *</label>
              <input
                required
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {tiposVisibles.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Fecha y hora *</label>
              <input
                required
                type="datetime-local"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Responsable</label>
              <select
                value={form.responsableId}
                onChange={(e) => setForm({ ...form, responsableId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Yo mismo</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id === miId ? `${u.nombre} (yo)` : u.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                {ESTADOS_ACTIVIDAD.map((e) => (
                  <option key={e.key} value={e.key}>{e.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Empresa</label>
              <select
                value={form.empresaId}
                onChange={(e) => {
                  const nuevaEmpresa = e.target.value;
                  const contactoValido =
                    !nuevaEmpresa ||
                    contactos.find((c) => c.id === form.contactoId)?.empresa?.id === nuevaEmpresa;
                  const oportunidadValida =
                    !nuevaEmpresa ||
                    oportunidades.find((o) => o.id === form.oportunidadId)?.empresa?.id === nuevaEmpresa;
                  setForm({
                    ...form,
                    empresaId: nuevaEmpresa,
                    contactoId: contactoValido ? form.contactoId : "",
                    oportunidadId: oportunidadValida ? form.oportunidadId : "",
                  });
                }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Sin empresa</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-neutral-500">Contacto</label>
                <button
                  type="button"
                  onClick={() => { setNuevoContacto((v) => !v); setNuevoContactoNombre(""); }}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {nuevoContacto ? "Cancelar" : "+ Nuevo contacto"}
                </button>
              </div>
              {nuevoContacto ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nuevoContactoNombre}
                    onChange={(e) => setNuevoContactoNombre(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); crearContactoRapido(); } }}
                    placeholder="Nombre del contacto"
                    autoFocus
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={crearContactoRapido}
                    disabled={creandoContacto || !nuevoContactoNombre.trim()}
                    className="whitespace-nowrap rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {creandoContacto ? "Guardando…" : "Agregar"}
                  </button>
                </div>
              ) : (
                <select
                  value={form.contactoId}
                  onChange={(e) => setForm({ ...form, contactoId: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">Sin contacto</option>
                  {contactos
                    .filter((c) => !form.empresaId || c.empresa?.id === form.empresaId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
              )}
              {nuevoContacto && form.empresaId && (
                <p className="mt-1 text-xs text-neutral-400">
                  Se asignará a {empresas.find((e) => e.id === form.empresaId)?.nombre}.
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Oportunidad</label>
              <select
                value={form.oportunidadId}
                onChange={(e) => setForm({ ...form, oportunidadId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              >
                <option value="">Sin oportunidad</option>
                {oportunidades
                  .filter((o) => !form.empresaId || o.empresa?.id === form.empresaId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>{o.titulo}</option>
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
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
              >
                {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={cerrarForm}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-neutral-400">Cargando...</p>
      ) : vista === "calendario" ? (
        <CalendarioActividades
          actividades={actividades}
          mes={mesCalendario}
          setMes={setMesCalendario}
          diaSeleccionado={diaSeleccionado}
          setDiaSeleccionado={setDiaSeleccionado}
          onToggle={toggleCompletada}
          onEditar={iniciarEdicion}
          onEliminar={eliminarActividad}
          formatoFecha={formatoFecha}
          tipos={tiposVisibles}
        />
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {filtro === "asignadas"
              ? "No tienes tareas asignadas pendientes."
              : filtro === "pendientes"
              ? "No tienes actividades pendientes."
              : "Aún no tienes actividades."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filasDespues.map(renderFila)}
        </div>
      )}
    </div>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-400 p-6">Cargando...</p>}>
      <AgendaContent />
    </Suspense>
  );
}
