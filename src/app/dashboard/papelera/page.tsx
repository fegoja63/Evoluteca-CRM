"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { IconRestore, IconTrash, IconInboxOff } from "@tabler/icons-react";
import { numeroCotizacion } from "@/lib/cotizaciones";

type Item = { id: string; nombre: string; email: string | null; eliminadoEn: string };
type ItemEmpresa = Item & { sector: string | null };
type ItemContacto = Item & { cargo: string | null };
type ItemOportunidad = { id: string; titulo: string; valor: string | null; etapa: string; empresa: { nombre: string } | null; eliminadoEn: string };
type ItemCotizacion = { id: string; numero: number; numeroManual: string | null; estado: string; empresa: { nombre: string } | null; eliminadoEn: string };

type Tipo = "empresa" | "contacto" | "oportunidad" | "cotizacion";

const ETAPA_LABEL: Record<string, string> = {
  PROSPECTO: "Prospecto", CALIFICADO: "Calificado", PROPUESTA: "Cotización",
  NEGOCIACION: "Negociación", GANADA: "Ganada", PERDIDA: "Perdida",
};

function fmtMoneda(v: string | null) {
  if (!v) return "—";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(v));
}

export default function PapeleraPage() {
  const { data: sesion } = useSession();
  const [empresas, setEmpresas] = useState<ItemEmpresa[]>([]);
  const [contactos, setContactos] = useState<ItemContacto[]>([]);
  const [oportunidades, setOportunidades] = useState<ItemOportunidad[]>([]);
  const [cotizaciones, setCotizaciones] = useState<ItemCotizacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

  const esAdministrador = sesion?.user?.rol === "ADMINISTRADOR";

  async function cargar() {
    setCargando(true);
    const res = await fetch("/api/papelera");
    const data = await res.json();
    setEmpresas(data.empresas ?? []);
    setContactos(data.contactos ?? []);
    setOportunidades(data.oportunidades ?? []);
    setCotizaciones(data.cotizaciones ?? []);
    setCargando(false);
  }

  useEffect(() => { cargar(); }, []);

  async function restaurar(tipo: Tipo, id: string) {
    setProcesando(id);
    await fetch("/api/papelera/restaurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, id }),
    });
    await cargar();
    setProcesando(null);
  }

  async function borrarDefinitivo(tipo: Tipo, id: string, nombre: string) {
    if (!confirm(`¿Borrar "${nombre}" definitivamente? Esta acción no se puede deshacer.`)) return;
    setProcesando(id);
    await fetch(`/api/papelera/${tipo}/${id}`, { method: "DELETE" });
    await cargar();
    setProcesando(null);
  }

  function fmt(fecha: string) {
    return new Date(fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Papelera</h1>
        <p className="text-slate-500 text-sm mt-1">Clientes, contactos, oportunidades y cotizaciones eliminados — puedes restaurarlos o borrarlos definitivamente</p>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Clientes eliminados ({empresas.length})</h2>
            {empresas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <IconInboxOff size={24} stroke={1.5} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No hay clientes en la papelera.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Email</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Sector</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Eliminado</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {empresas.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{e.nombre}</td>
                        <td className="px-4 py-2 text-slate-500">{e.email ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500">{e.sector ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmt(e.eliminadoEn)}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={procesando === e.id}
                              onClick={() => restaurar("empresa", e.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <IconRestore size={13} stroke={1.75} />
                              Restaurar
                            </button>
                            {esAdministrador && (
                              <button
                                disabled={procesando === e.id}
                                onClick={() => borrarDefinitivo("empresa", e.id, e.nombre)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                <IconTrash size={13} stroke={1.75} />
                                Borrar definitivamente
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Contactos eliminados ({contactos.length})</h2>
            {contactos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <IconInboxOff size={24} stroke={1.5} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No hay contactos en la papelera.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Email</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Cargo</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Eliminado</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contactos.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{c.nombre}</td>
                        <td className="px-4 py-2 text-slate-500">{c.email ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500">{c.cargo ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmt(c.eliminadoEn)}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={procesando === c.id}
                              onClick={() => restaurar("contacto", c.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <IconRestore size={13} stroke={1.75} />
                              Restaurar
                            </button>
                            {esAdministrador && (
                              <button
                                disabled={procesando === c.id}
                                onClick={() => borrarDefinitivo("contacto", c.id, c.nombre)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                <IconTrash size={13} stroke={1.75} />
                                Borrar definitivamente
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Oportunidades eliminadas ({oportunidades.length})</h2>
            {oportunidades.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <IconInboxOff size={24} stroke={1.5} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No hay oportunidades en la papelera.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Título</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Cliente</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Etapa</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Valor</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Eliminado</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {oportunidades.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{o.titulo}</td>
                        <td className="px-4 py-2 text-slate-500">{o.empresa?.nombre ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500">{ETAPA_LABEL[o.etapa] ?? o.etapa}</td>
                        <td className="px-4 py-2 text-slate-500">{fmtMoneda(o.valor)}</td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmt(o.eliminadoEn)}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={procesando === o.id}
                              onClick={() => restaurar("oportunidad", o.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <IconRestore size={13} stroke={1.75} />
                              Restaurar
                            </button>
                            {esAdministrador && (
                              <button
                                disabled={procesando === o.id}
                                onClick={() => borrarDefinitivo("oportunidad", o.id, o.titulo)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                <IconTrash size={13} stroke={1.75} />
                                Borrar definitivamente
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Cotizaciones eliminadas ({cotizaciones.length})</h2>
            {cotizaciones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <IconInboxOff size={24} stroke={1.5} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No hay cotizaciones en la papelera.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">N°</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Cliente</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Estado</th>
                      <th className="px-4 py-2 font-semibold uppercase tracking-wide">Eliminado</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cotizaciones.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-900">{numeroCotizacion(c)}</td>
                        <td className="px-4 py-2 text-slate-500">{c.empresa?.nombre ?? "—"}</td>
                        <td className="px-4 py-2 text-slate-500">{c.estado}</td>
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{fmt(c.eliminadoEn)}</td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={procesando === c.id}
                              onClick={() => restaurar("cotizacion", c.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              <IconRestore size={13} stroke={1.75} />
                              Restaurar
                            </button>
                            {esAdministrador && (
                              <button
                                disabled={procesando === c.id}
                                onClick={() => borrarDefinitivo("cotizacion", c.id, `Cotización ${numeroCotizacion(c)}`)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                              >
                                <IconTrash size={13} stroke={1.75} />
                                Borrar definitivamente
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
