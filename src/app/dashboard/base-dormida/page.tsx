"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconZzz, IconSparkles, IconSend, IconMail, IconBrandWhatsapp, IconX } from "@tabler/icons-react";
import { boton, campo, tarjeta, insignia } from "@/components/ui/estilos";
import { SkeletonLista, EstadoVacio } from "@/components/ui/estados";
import { toast } from "@/lib/toast";
import { DIAS_OPCIONES, DIAS_POR_DEFECTO, MAX_LOTE, type ClienteDormido, type Borrador } from "@/lib/base-dormida";

type Canal = "EMAIL" | "WHATSAPP";
type Mensaje = Borrador & { canal: Canal; incluir: boolean };

const ETAPA: Record<string, string> = {
  GANADA: "ganado", PERDIDA: "perdido", PROSPECTO: "prospecto", CALIFICADO: "calificado", PROPUESTA: "propuesta", NEGOCIACION: "negociación",
};
const fmtValor = (v: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);

// Despertar la base dormida (ver lib/base-dormida.ts): elegir clientes quietos,
// la IA redacta un mensaje para cada uno según su historial, el vendedor lo
// revisa y lo envía por correo o lo deja como WhatsApp en su Bandeja Hoy.
export default function BaseDormidaPage() {
  const [dias, setDias] = useState<number>(DIAS_POR_DEFECTO);
  const [clientes, setClientes] = useState<ClienteDormido[] | null>(null);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [mensajes, setMensajes] = useState<Mensaje[] | null>(null);
  const [redactando, setRedactando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function cargar(d: number) {
    setClientes(null);
    fetch(`/api/base-dormida?dias=${d}`, { cache: "no-store" })
      .then(r => r.json())
      .then(x => { setClientes(x.clientes ?? []); setElegidos((x.clientes ?? []).slice(0, Math.min(5, MAX_LOTE)).map((c: ClienteDormido) => c.empresaId)); })
      .catch(() => setClientes([]));
  }
  useEffect(() => cargar(dias), [dias]);

  const porId = new Map((clientes ?? []).map(c => [c.empresaId, c]));

  function alternar(id: string) {
    setElegidos(e => e.includes(id) ? e.filter(x => x !== id) : e.length >= MAX_LOTE ? e : [...e, id]);
  }

  async function redactar() {
    setRedactando(true);
    const res = await fetch("/api/ia/base-dormida", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresaIds: elegidos }),
    }).catch(() => null);
    setRedactando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { toast.error(d?.error ?? "No se pudieron redactar los mensajes."); return; }
    setMensajes((d.borradores as Borrador[]).map(b => {
      const c = porId.get(b.empresaId)?.contacto;
      return { ...b, canal: c?.email ? "EMAIL" : "WHATSAPP", incluir: !!(c?.email || c?.telefono) };
    }));
  }

  function cambiar(id: string, cambio: Partial<Mensaje>) {
    setMensajes(ms => ms && ms.map(m => (m.empresaId === id ? { ...m, ...cambio } : m)));
  }

  async function enviar() {
    if (!mensajes) return;
    const items = mensajes.filter(m => m.incluir).map(m => ({
      empresaId: m.empresaId, contactoId: porId.get(m.empresaId)!.contacto!.id, canal: m.canal,
      asunto: m.canal === "EMAIL" ? m.asunto : "", cuerpo: m.canal === "EMAIL" ? m.correo : m.whatsapp,
    }));
    const correos = items.filter(i => i.canal === "EMAIL").length;
    const was = items.length - correos;
    if (!confirm(`Se enviarán ${correos} correo(s) a los clientes${was ? ` y quedarán ${was} WhatsApp en su Bandeja Hoy para enviar` : ""}. ¿Continuar?`)) return;
    setEnviando(true);
    const res = await fetch("/api/base-dormida/enviar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }),
    }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { toast.error(d?.error ?? "No se pudo enviar."); return; }
    const fallidos = (d.resultados as { empresaId: string; ok: boolean; error?: string }[]).filter(r => !r.ok);
    if (fallidos.length) toast.error(`${fallidos.length} no se enviaron: ${fallidos.map(f => `${porId.get(f.empresaId)?.nombre}: ${f.error}`).join("; ")}`);
    if (d.enviados) toast.success(`Listo: ${d.enviados} mensaje(s). ${was ? "Los WhatsApp están en su Bandeja Hoy." : ""}`);
    setMensajes(null);
    cargar(dias);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <IconZzz size={22} stroke={1.75} className="text-brand-600" />Reactivar clientes
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Clientes sin negocio en curso ni movimiento en un tiempo. La IA le escribe a cada uno según lo que pasó con él;
          usted revisa y envía por correo o por WhatsApp.
        </p>
      </div>

      {!mensajes && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600">Sin movimiento hace más de</label>
            <select value={dias} onChange={e => setDias(Number(e.target.value))} className={campo("sm")}>
              {DIAS_OPCIONES.map(d => <option key={d} value={d}>{d === 365 ? "1 año" : `${d} días`}</option>)}
            </select>
            <span className="ml-auto text-xs text-slate-400">Elija hasta {MAX_LOTE} por vez · {elegidos.length} elegidos</span>
          </div>

          {clientes === null ? <SkeletonLista /> : clientes.length === 0 ? (
            <EstadoVacio icon={IconZzz} titulo="No hay clientes dormidos"
              descripcion="Todos sus clientes tienen un negocio en curso o movimiento reciente. Pruebe con otro plazo." />
          ) : (
            <>
              <ul className={tarjeta("divide-y divide-slate-100")}>
                {clientes.map(c => (
                  <li key={c.empresaId}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50">
                      <input type="checkbox" checked={elegidos.includes(c.empresaId)} onChange={() => alternar(c.empresaId)}
                        disabled={!elegidos.includes(c.empresaId) && elegidos.length >= MAX_LOTE} className="h-4 w-4 accent-brand-700" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Link href={`/dashboard/cuentas/${c.empresaId}`} onClick={e => e.stopPropagation()} className="truncate text-sm font-semibold text-slate-800 hover:text-brand-700">{c.nombre}</Link>
                          {c.compro && <span className={insignia("exito")}>Ya compró</span>}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {c.ultimoNegocio
                            ? `Último negocio: ${c.ultimoNegocio.titulo} (${ETAPA[c.ultimoNegocio.etapa] ?? c.ultimoNegocio.etapa}${c.ultimoNegocio.valor ? ` · ${fmtValor(c.ultimoNegocio.valor)}` : ""})`
                            : "Sin negocios registrados"}
                          {c.contacto ? ` · ${c.contacto.nombre}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{c.diasQuieto} días quieto</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="sticky bottom-0 mt-3 flex justify-end bg-slate-50/90 py-3">
                <button onClick={redactar} disabled={redactando || elegidos.length === 0} className={boton("marca", "md")}>
                  <IconSparkles size={16} stroke={2} />{redactando ? "Redactando…" : `Redactar con IA (${elegidos.length})`}
                </button>
              </div>
              <p className="text-right text-2xs text-slate-400">Usa 1 acción de IA por lote</p>
            </>
          )}
        </>
      )}

      {mensajes && (
        <>
          <div className="space-y-3">
            {mensajes.map(m => {
              const c = porId.get(m.empresaId);
              const contacto = c?.contacto;
              return (
                <div key={m.empresaId} className={tarjeta(`p-4 ${m.incluir ? "" : "opacity-60"}`)}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <input type="checkbox" checked={m.incluir} onChange={e => cambiar(m.empresaId, { incluir: e.target.checked })} className="h-4 w-4 accent-brand-700" />
                      {c?.nombre} <span className="font-normal text-slate-500">· {contacto?.nombre}</span>
                    </label>
                    <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-200">
                      {([["EMAIL", "Correo", IconMail, !!contacto?.email], ["WHATSAPP", "WhatsApp", IconBrandWhatsapp, !!contacto?.telefono]] as const).map(([canal, label, Icono, puede]) => (
                        <button key={canal} type="button" disabled={!puede} onClick={() => cambiar(m.empresaId, { canal })} aria-pressed={m.canal === canal}
                          title={puede ? undefined : canal === "EMAIL" ? "El contacto no tiene correo" : "El contacto no tiene celular"}
                          className={`flex items-center gap-1 px-2 py-1 text-xs disabled:opacity-40 ${m.canal === canal ? "bg-brand-700 text-white" : "bg-white text-slate-600 hover:bg-brand-50"}`}>
                          <Icono size={13} stroke={1.75} />{label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">💡 {m.gancho}</p>
                  {m.canal === "EMAIL" && (
                    <input value={m.asunto} onChange={e => cambiar(m.empresaId, { asunto: e.target.value })} className={campo("md", "mb-2 w-full")} aria-label="Asunto" />
                  )}
                  <textarea rows={m.canal === "EMAIL" ? 6 : 3} aria-label="Mensaje"
                    value={m.canal === "EMAIL" ? m.correo : m.whatsapp}
                    onChange={e => cambiar(m.empresaId, m.canal === "EMAIL" ? { correo: e.target.value } : { whatsapp: e.target.value })}
                    className={campo("md", "w-full")} />
                </div>
              );
            })}
          </div>
          <div className="sticky bottom-0 mt-3 flex flex-wrap items-center justify-end gap-2 bg-slate-50/90 py-3">
            <button onClick={() => setMensajes(null)} disabled={enviando} className={boton("secundario", "md")}>
              <IconX size={16} stroke={1.75} />Volver a la lista
            </button>
            <button onClick={enviar} disabled={enviando || !mensajes.some(m => m.incluir)} className={boton("primario", "md")}>
              <IconSend size={16} stroke={1.75} />{enviando ? "Enviando…" : `Enviar (${mensajes.filter(m => m.incluir).length})`}
            </button>
          </div>
          <p className="text-right text-2xs text-slate-400">Los correos salen a su nombre y las respuestas llegan al CRM. Los WhatsApp quedan en su Bandeja Hoy con el botón para enviarlos.</p>
        </>
      )}
    </div>
  );
}
