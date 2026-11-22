import Link from "next/link";
import { redirect } from "next/navigation";
import { IconMessageCircle, IconArrowRight } from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatoFechaHora } from "@/lib/fecha-bogota";
import { configAgente, datosDe, etiquetaCalificacion, mensajesDe } from "@/lib/agente-web";
import { insignia, tarjeta, type TonoInsignia } from "@/components/ui/estilos";
import { AgenteWebConfig } from "@/components/agente-web-config";

export const dynamic = "force-dynamic";

// Chat web: el asistente con IA que atiende la página del cliente. Arriba la
// configuración (administradores); abajo las conversaciones, con el
// prospecto que dejaron en el Pipeline.

const TONO: Record<string, TonoInsignia> = { ALTA: "exito", MEDIA: "alerta", BAJA: "neutro", SIN_DATOS: "neutro" };

export default async function AgenteWebPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tenantId = session.user.tenantId;
  const esAdmin = session.user.rol === "ADMINISTRADOR";

  const [tenant, conversaciones, usuarios] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { agenteWebConfig: true, agenteWebToken: true } }),
    prisma.conversacionAgente.findMany({
      where: { tenantId }, orderBy: { actualizadoEn: "desc" }, take: 50,
      select: {
        id: true, mensajes: true, datos: true, calificacion: true, paginaOrigen: true, actualizadoEn: true,
        oportunidad: { select: { id: true, titulo: true, eliminadoEn: true } },
      },
    }),
    esAdmin
      ? prisma.usuario.findMany({ where: { tenantId, activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, tokenAgenda: true } })
      : Promise.resolve([]),
  ]);
  const activo = configAgente(tenant?.agenteWebConfig).activo && !!tenant?.agenteWebToken;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <IconMessageCircle size={22} stroke={1.75} className="text-brand-600" />Chat web
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Un asistente con IA atiende a los visitantes de su página web a cualquier hora: responde con la información de su empresa,
          pide los datos del interesado, lo califica y, cuando deja su correo o celular, crea la oportunidad en el Pipeline y le avisa.
        </p>
      </div>

      {esAdmin && <AgenteWebConfig usuarios={usuarios.map(u => ({ id: u.id, nombre: u.nombre, tieneAgenda: !!u.tokenAgenda }))} />}
      {!esAdmin && !activo && (
        <p className={tarjeta("p-5 text-sm text-slate-500")}>El chat web no está activo. Un administrador lo puede activar en esta misma pantalla.</p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-slate-700">Conversaciones recientes</h2>
        {conversaciones.length === 0 ? (
          <p className={tarjeta("p-5 text-sm text-slate-400")}>Todavía no hay conversaciones.</p>
        ) : (
          <ul className="space-y-2">
            {conversaciones.map(c => {
              const d = datosDe(c.datos);
              const mensajes = mensajesDe(c.mensajes);
              const primero = mensajes.find(m => m.rol === "visitante")?.texto ?? "";
              return (
                <li key={c.id} className={tarjeta()}>
                  <details>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 p-4">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {d.nombre ?? "Visitante sin identificar"}{d.empresa ? ` · ${d.empresa}` : ""}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{d.necesidad ?? primero}</span>
                      </span>
                      <span className={insignia(TONO[c.calificacion ?? ""] ?? "neutro")}>Interés {etiquetaCalificacion(c.calificacion)}</span>
                      <span className="text-xs text-slate-400">{formatoFechaHora(c.actualizadoEn)} · {mensajes.length} mensajes</span>
                    </summary>
                    <div className="space-y-3 border-t border-slate-100 p-4">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                        {d.email && <span>✉ {d.email}</span>}
                        {d.telefono && <span>☎ {d.telefono}</span>}
                        {d.cantidad && <span>Cantidad: {d.cantidad}</span>}
                        {d.plazo && <span>Plazo: {d.plazo}</span>}
                        {c.paginaOrigen && <span className="truncate">Desde: {c.paginaOrigen}</span>}
                      </div>
                      {c.oportunidad && !c.oportunidad.eliminadoEn && (
                        <Link href={`/dashboard/pipeline/${c.oportunidad.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                          Ver oportunidad: {c.oportunidad.titulo}<IconArrowRight size={14} stroke={2} />
                        </Link>
                      )}
                      <div className="space-y-2">
                        {mensajes.map((m, i) => (
                          <div key={i} className={m.rol === "visitante" ? "flex justify-end" : "flex justify-start"}>
                            <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.rol === "visitante" ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-800"}`}>
                              {m.texto}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
