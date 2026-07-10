"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { BitacoraExpediente } from "@/components/bitacora-expediente";
import { plazoVencido, plazoProximo } from "@/lib/plazo-legal";
import { IconAlertTriangle } from "@tabler/icons-react";

type Termino = {
  id: string;
  descripcion: string;
  fechaLimite: string;
  estado: "PENDIENTE" | "CUMPLIDO" | "VENCIDO";
  notas: string | null;
};

type RegistroHoras = {
  id: string;
  fecha: string;
  horas: string;
  descripcion: string | null;
  usuarioId: string | null;
  usuario: { id: string; nombre: string } | null;
};

type Detalle = {
  id: string;
  numeroRadicado: string;
  juzgado: string | null;
  tipoProceso: string | null;
  contraparte: string;
  estado: "ACTIVO" | "ARCHIVADO" | "GANADO" | "PERDIDO";
  notas: string | null;
  empresaId: string | null;
  empresa: { id: string; nombre: string } | null;
  terminos: Termino[];
  registrosHoras: RegistroHoras[];
};

const ESTADOS: Detalle["estado"][] = ["ACTIVO", "ARCHIVADO", "GANADO", "PERDIDO"];

function terminoUrgencia(t: Termino): "vencido" | "proximo" | "normal" | "cumplido" {
  if (t.estado === "CUMPLIDO") return "cumplido";
  if (plazoVencido(t.fechaLimite)) return "vencido";
  if (plazoProximo(t.fechaLimite)) return "proximo";
  return "normal";
}

const URGENCIA_STYLE: Record<string, string> = {
  vencido: "border-red-200 bg-red-50",
  proximo: "border-amber-200 bg-amber-50",
  normal: "border-slate-200 bg-white",
  cumplido: "border-slate-100 bg-slate-50",
};

type Coincidencia = { id: string; nombre: string };
type Conflicto = { empresas: Coincidencia[]; contactos: Coincidencia[] };

export default function DetalleExpedientePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id as string;

  const [expediente, setExpediente] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ numeroRadicado: "", juzgado: "", tipoProceso: "", contraparte: "", estado: "ACTIVO", notas: "" });
  const [mostrarFormTermino, setMostrarFormTermino] = useState(false);
  const [guardandoTermino, setGuardandoTermino] = useState(false);
  const [formTermino, setFormTermino] = useState({ descripcion: "", fechaLimite: "", notas: "" });
  const [mostrarFormHoras, setMostrarFormHoras] = useState(false);
  const [guardandoHoras, setGuardandoHoras] = useState(false);
  const [formHoras, setFormHoras] = useState({ fecha: "", horas: "", descripcion: "" });
  const [conflicto, setConflicto] = useState<Conflicto | null>(null);
  const [error, setError] = useState("");
  const [errorTermino, setErrorTermino] = useState("");
  const [errorHoras, setErrorHoras] = useState("");

  const puedeEliminar = session?.user?.rol === "ADMINISTRADOR" || session?.user?.rol === "GERENTE";

  async function cargar() {
    setCargando(true);
    try {
      const res = await fetch(`/api/expedientes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setExpediente(data);
        setForm({
          numeroRadicado: data.numeroRadicado,
          juzgado: data.juzgado ?? "",
          tipoProceso: data.tipoProceso ?? "",
          contraparte: data.contraparte,
          estado: data.estado,
          notas: data.notas ?? "",
        });
        const confRes = await fetch(`/api/expedientes/conflicto?nombre=${encodeURIComponent(data.contraparte)}`);
        const conf: Conflicto = await confRes.json();
        conf.empresas = conf.empresas.filter(e => e.id !== data.empresaId);
        setConflicto(conf);
      }
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setEditando(false);
    setMostrarFormTermino(false);
    setMostrarFormHoras(false);
    setError("");
    setErrorTermino("");
    setErrorHoras("");
    cargar();
  }, [id]);

  async function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      const res = await fetch(`/api/expedientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo guardar el expediente");
        return;
      }
      setEditando(false);
      await cargar();
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar() {
    if (!confirm("¿Eliminar este expediente? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/expedientes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar el expediente");
      return;
    }
    router.push("/dashboard/expedientes");
  }

  async function handleCrearTermino(e: React.FormEvent) {
    e.preventDefault();
    setErrorTermino("");
    setGuardandoTermino(true);
    try {
      const res = await fetch(`/api/expedientes/${id}/terminos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formTermino),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorTermino(data.error || "No se pudo crear el plazo");
        return;
      }
      setFormTermino({ descripcion: "", fechaLimite: "", notas: "" });
      setMostrarFormTermino(false);
      await cargar();
    } finally {
      setGuardandoTermino(false);
    }
  }

  async function handleMarcarCumplido(terminoId: string) {
    const res = await fetch(`/api/expedientes/terminos/${terminoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "CUMPLIDO" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo actualizar el plazo");
      return;
    }
    cargar();
  }

  async function handleEliminarTermino(terminoId: string) {
    if (!confirm("¿Eliminar este plazo?")) return;
    const res = await fetch(`/api/expedientes/terminos/${terminoId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar el plazo");
      return;
    }
    cargar();
  }

  async function handleCrearRegistroHoras(e: React.FormEvent) {
    e.preventDefault();
    setErrorHoras("");
    setGuardandoHoras(true);
    try {
      const res = await fetch(`/api/expedientes/${id}/horas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formHoras),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorHoras(data.error || "No se pudo registrar las horas");
        return;
      }
      setFormHoras({ fecha: "", horas: "", descripcion: "" });
      setMostrarFormHoras(false);
      await cargar();
    } finally {
      setGuardandoHoras(false);
    }
  }

  async function handleEliminarRegistroHoras(registroId: string) {
    if (!confirm("¿Eliminar este registro de horas?")) return;
    const res = await fetch(`/api/expedientes/horas/${registroId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "No se pudo eliminar el registro de horas");
      return;
    }
    cargar();
  }

  if (cargando) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!expediente) return <p className="text-sm text-slate-400">No encontrado.</p>;

  return (
    <div>
      <Link href="/dashboard/expedientes" className="mb-4 inline-block text-xs text-slate-500 hover:underline">
        ← Volver a Expedientes
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Radicado {expediente.numeroRadicado}</h1>
          <p className="text-sm text-slate-500">{expediente.empresa?.nombre ?? "Sin cliente asociado"}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditando(!editando)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            {editando ? "Cancelar" : "Editar"}
          </button>
          {puedeEliminar && (
            <button onClick={handleEliminar}
              className="rounded-xl border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {editando ? (
          <form onSubmit={handleGuardar} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Número de radicado *</label>
              <input required value={form.numeroRadicado} onChange={e => setForm({ ...form, numeroRadicado: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Estado</label>
              <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 bg-white">
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Juzgado</label>
              <input value={form.juzgado} onChange={e => setForm({ ...form, juzgado: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Tipo de proceso</label>
              <input value={form.tipoProceso} onChange={e => setForm({ ...form, tipoProceso: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Contraparte *</label>
              <input required value={form.contraparte} onChange={e => setForm({ ...form, contraparte: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            {error && (
              <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <div className="col-span-2">
              <button type="submit" disabled={guardando}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-400">Estado</dt>
              <dd className="text-slate-800 font-medium">{expediente.estado}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Juzgado</dt>
              <dd className="text-slate-800">{expediente.juzgado ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Tipo de proceso</dt>
              <dd className="text-slate-800">{expediente.tipoProceso ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400">Contraparte</dt>
              <dd className="text-slate-800">{expediente.contraparte}</dd>
            </div>
            {conflicto && (conflicto.empresas.length > 0 || conflicto.contactos.length > 0) && (
              <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <p className="font-semibold mb-1 flex items-center gap-1.5"><IconAlertTriangle size={14} stroke={1.75} />Posible conflicto de interés:</p>
                <p>La contraparte coincide con registros existentes de tu CRM:</p>
                <ul className="mt-1 list-disc list-inside">
                  {conflicto.empresas.map(e => <li key={e.id}>{e.nombre} (cliente)</li>)}
                  {conflicto.contactos.map(c => <li key={c.id}>{c.nombre} (contacto)</li>)}
                </ul>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-400">Notas</dt>
              <dd className="text-slate-800 whitespace-pre-wrap">{expediente.notas ?? "—"}</dd>
            </div>
          </dl>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900">Términos y plazos</h2>
          <button onClick={() => setMostrarFormTermino(!mostrarFormTermino)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
            {mostrarFormTermino ? "Cancelar" : "+ Nuevo plazo"}
          </button>
        </div>

        {mostrarFormTermino && (
          <form onSubmit={handleCrearTermino} className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Descripción *</label>
              <input required value={formTermino.descripcion} onChange={e => setFormTermino({ ...formTermino, descripcion: e.target.value })}
                placeholder="Ej: Contestar demanda, Presentar recurso de apelación..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha límite *</label>
              <input required type="date" value={formTermino.fechaLimite} onChange={e => setFormTermino({ ...formTermino, fechaLimite: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Notas</label>
              <input value={formTermino.notas} onChange={e => setFormTermino({ ...formTermino, notas: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            {errorTermino && (
              <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorTermino}
              </div>
            )}
            <div className="col-span-2">
              <button type="submit" disabled={guardandoTermino}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardandoTermino ? "Guardando..." : "Crear plazo"}
              </button>
            </div>
          </form>
        )}

        {expediente.terminos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin plazos registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {expediente.terminos.map(t => {
              const urgencia = terminoUrgencia(t);
              return (
                <div key={t.id} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${URGENCIA_STYLE[urgencia]}`}>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${t.estado === "CUMPLIDO" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                      {t.descripcion}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.fechaLimite).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                      {urgencia === "vencido" && <span className="ml-2 font-semibold text-red-600">Vencido</span>}
                      {urgencia === "proximo" && <span className="ml-2 font-semibold text-amber-600">Próximo</span>}
                      {t.notas && <span className="ml-2 text-slate-400">· {t.notas}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.estado !== "CUMPLIDO" && (
                      <button onClick={() => handleMarcarCumplido(t.id)}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                        Marcar cumplido
                      </button>
                    )}
                    {puedeEliminar && (
                      <button onClick={() => handleEliminarTermino(t.id)}
                        className="text-slate-400 hover:text-red-600 text-lg leading-none">
                        ×
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registro de horas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Total acumulado: <span className="font-semibold text-slate-600">
                {Math.round(expediente.registrosHoras.reduce((acc, r) => acc + Number(r.horas), 0) * 100) / 100} h
              </span>
            </p>
          </div>
          <button onClick={() => setMostrarFormHoras(!mostrarFormHoras)}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
            {mostrarFormHoras ? "Cancelar" : "+ Registrar horas"}
          </button>
        </div>

        {mostrarFormHoras && (
          <form onSubmit={handleCrearRegistroHoras} className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Fecha *</label>
              <input required type="date" value={formHoras.fecha} onChange={e => setFormHoras({ ...formHoras, fecha: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Horas *</label>
              <input required type="number" step="0.25" min="0.25" value={formHoras.horas} onChange={e => setFormHoras({ ...formHoras, horas: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Descripción</label>
              <input value={formHoras.descripcion} onChange={e => setFormHoras({ ...formHoras, descripcion: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </div>
            {errorHoras && (
              <div className="col-span-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {errorHoras}
              </div>
            )}
            <div className="col-span-3">
              <button type="submit" disabled={guardandoHoras}
                className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50">
                {guardandoHoras ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </form>
        )}

        {expediente.registrosHoras.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin horas registradas.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-1.5 font-semibold uppercase tracking-wide">Fecha</th>
                  <th className="px-3 py-1.5 font-semibold uppercase tracking-wide">Abogado</th>
                  <th className="px-3 py-1.5 font-semibold uppercase tracking-wide">Horas</th>
                  <th className="px-3 py-1.5 font-semibold uppercase tracking-wide">Descripción</th>
                  <th className="px-3 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expediente.registrosHoras.map(r => {
                  const puedeEliminarRegistro = puedeEliminar || r.usuarioId === session?.user?.id;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-1.5 text-slate-500 whitespace-nowrap">{new Date(r.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}</td>
                      <td className="px-3 py-1.5 text-slate-700">{r.usuario?.nombre ?? "Usuario eliminado"}</td>
                      <td className="px-3 py-1.5 font-medium text-slate-900">{Number(r.horas)} h</td>
                      <td className="px-3 py-1.5 text-slate-500">{r.descripcion ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right">
                        {puedeEliminarRegistro && (
                          <button onClick={() => handleEliminarRegistroHoras(r.id)}
                            className="text-slate-400 hover:text-red-600 text-lg leading-none">
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6">
        <BitacoraExpediente expedienteId={id} puedeEliminar={puedeEliminar} />
      </div>
    </div>
  );
}
