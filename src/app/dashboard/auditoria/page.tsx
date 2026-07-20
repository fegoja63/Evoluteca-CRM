"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { IconHistory, IconChevronDown, IconChevronRight, IconLock } from "@tabler/icons-react";

type Registro = {
  id: string;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  usuarioRol: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  descripcion: string | null;
  antes: unknown;
  despues: unknown;
  ip: string | null;
  creadoEn: string;
};

const ETIQUETA_ACCION: Record<string, string> = {
  CREAR: "Creó",
  ACTUALIZAR: "Editó",
  ELIMINAR: "Envió a la papelera",
  RESTAURAR: "Restauró",
  ELIMINAR_DEFINITIVO: "Borró definitivamente",
  CAMBIAR_ROL: "Cambió el rol",
  DESACTIVAR_USUARIO: "Desactivó un usuario",
  ACTIVAR_USUARIO: "Reactivó un usuario",
  CAMBIAR_CONFIGURACION: "Cambió configuración",
  INICIAR_SESION: "Inició sesión",
};

// Rojo para lo irreversible, ámbar para lo que toca permisos, gris para el
// resto: en una lista larga el color hace el trabajo de la lectura.
const COLOR_ACCION: Record<string, string> = {
  ELIMINAR_DEFINITIVO: "bg-rose-50 text-rose-700",
  ELIMINAR: "bg-amber-50 text-amber-700",
  CAMBIAR_ROL: "bg-violet-50 text-violet-700",
  DESACTIVAR_USUARIO: "bg-violet-50 text-violet-700",
  ACTIVAR_USUARIO: "bg-violet-50 text-violet-700",
  CREAR: "bg-emerald-50 text-emerald-700",
};

const ACCIONES = Object.keys(ETIQUETA_ACCION);

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditoriaPage() {
  const { data: session } = useSession();
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);

  const TAMANO = 50;

  const cargar = useCallback(async () => {
    setCargando(true);
    const params = new URLSearchParams({ page: String(pagina), take: String(TAMANO) });
    if (accion) params.set("accion", accion);
    if (entidad) params.set("entidad", entidad);

    const res = await fetch(`/api/auditoria?${params}`);

    if (res.status === 403) {
      setSinPermiso(true);
      setCargando(false);
      return;
    }

    setTotal(Number(res.headers.get("X-Total-Count") ?? 0));
    setRegistros(res.ok ? await res.json() : []);
    setCargando(false);
  }, [pagina, accion, entidad]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (sinPermiso || (session?.user && session.user.rol !== "ADMINISTRADOR")) {
    return (
      <div className="max-w-lg">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <IconLock size={32} className="mx-auto text-slate-300" />
          <h1 className="mt-3 text-lg font-semibold text-slate-900">Solo para administradores</h1>
          <p className="mt-1 text-sm text-slate-500">
            El registro de auditoría contiene la actividad de todo el equipo, así que solo puede consultarlo un
            administrador.
          </p>
        </div>
      </div>
    );
  }

  const paginas = Math.max(1, Math.ceil(total / TAMANO));

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <IconHistory size={24} stroke={1.75} /> Registro de auditoría
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Quién hizo qué, cuándo y desde dónde. Este registro solo se agrega: nadie puede editarlo ni borrarlo,
          tampoco un administrador.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={accion}
          onChange={(e) => {
            setPagina(1);
            setAccion(e.target.value);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todas las acciones</option>
          {ACCIONES.map((a) => (
            <option key={a} value={a}>
              {ETIQUETA_ACCION[a]}
            </option>
          ))}
        </select>

        <select
          value={entidad}
          onChange={(e) => {
            setPagina(1);
            setEntidad(e.target.value);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Todo</option>
          {["Usuario", "Empresa", "Contacto", "Oportunidad", "Cotizacion"].map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>

        <span className="ml-auto self-center text-xs text-slate-400">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {cargando ? (
          <p className="p-8 text-center text-sm text-slate-400">Cargando…</p>
        ) : registros.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">Todavía no hay registros con estos filtros.</p>
            <p className="text-xs text-slate-400 mt-1">
              Se irán llenando a medida que el equipo cree, edite o borre información.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {registros.map((r) => {
              const expandido = abierto === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setAbierto(expandido ? null : r.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="mt-0.5 text-slate-300 shrink-0">
                      {expandido ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${COLOR_ACCION[r.accion] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {ETIQUETA_ACCION[r.accion] ?? r.accion}
                        </span>
                        <span className="text-sm text-slate-800 truncate">
                          {r.descripcion ?? `${r.entidad} ${r.entidadId ?? ""}`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {r.usuarioNombre ?? r.usuarioEmail ?? "Usuario desconocido"} · {fecha(r.creadoEn)}
                        {r.ip ? ` · ${r.ip}` : ""}
                      </p>
                    </div>
                  </button>

                  {expandido && (
                    <div className="px-11 pb-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Antes</p>
                        <pre className="text-[11px] bg-slate-50 rounded-xl p-3 overflow-x-auto text-slate-700">
                          {r.antes ? JSON.stringify(r.antes, null, 2) : "—"}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Después</p>
                        <pre className="text-[11px] bg-slate-50 rounded-xl p-3 overflow-x-auto text-slate-700">
                          {r.despues ? JSON.stringify(r.despues, null, 2) : "—"}
                        </pre>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => p - 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-500">
            Página {pagina} de {paginas}
          </span>
          <button
            type="button"
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => p + 1)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
