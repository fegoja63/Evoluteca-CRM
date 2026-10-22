"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconUsersGroup, IconX } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import {
  AVISO_SIN_DECISOR, POSTURA_LABEL, POSTURAS_DECISION, ROL_LABEL, ROLES_DECISION,
  faltaQuienDecide, sugerirRol, type PosturaDecision, type RolDecision,
} from "@/lib/decisores";

type Contacto = { id: string; nombre: string; cargo: string | null };
type Participante = { id: string; rol: RolDecision; postura: PosturaDecision; contacto: Contacto & { email: string | null } };

// Color por postura (estado): verde a favor, ámbar neutral, rojo en contra.
const POSTURA_CLASE: Record<PosturaDecision, string> = {
  A_FAVOR: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NEUTRAL: "bg-amber-50 text-amber-700 border-amber-200",
  EN_CONTRA: "bg-red-50 text-red-600 border-red-200",
  SIN_CONTACTAR: "bg-slate-50 text-slate-500 border-slate-200",
};

// Tarjeta "Personas en esta decisión" de la ficha de una oportunidad: quién
// decide, influye, usa o frena, y su postura. El papel se sugiere por el cargo.
export function MapaDecisores({ oportunidadId, empresaId, etapa }: { oportunidadId: string; empresaId: string | null; etapa: string }) {
  const [participantes, setParticipantes] = useState<Participante[] | null>(null);
  const [contactos, setContactos] = useState<Contacto[] | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [contactoId, setContactoId] = useState("");
  const [rol, setRol] = useState<RolDecision>("INFLUYE");
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    const r = await fetch(`/api/oportunidades/${oportunidadId}/participantes`, { cache: "no-store" });
    if (r.ok) setParticipantes(await r.json());
  }
  useEffect(() => { cargar(); }, [oportunidadId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrirAgregar() {
    setAgregando(true);
    if (contactos || !empresaId) return;
    const r = await fetch(`/api/empresas/${empresaId}`, { cache: "no-store" });
    const e = r.ok ? await r.json() : {};
    setContactos((e.contactos ?? []).map((c: Contacto) => ({ id: c.id, nombre: c.nombre, cargo: c.cargo })));
  }

  function elegirContacto(id: string) {
    setContactoId(id);
    setRol(sugerirRol(contactos?.find(c => c.id === id)?.cargo));
  }

  async function agregar() {
    if (!contactoId) return;
    setGuardando(true);
    const r = await fetch(`/api/oportunidades/${oportunidadId}/participantes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactoId, rol }),
    });
    setGuardando(false);
    if (!r.ok) { toast.error((await r.json().catch(() => ({}))).error ?? "No se pudo agregar"); return; }
    setContactoId("");
    setAgregando(false);
    cargar();
  }

  async function cambiar(id: string, data: { rol?: RolDecision; postura?: PosturaDecision }) {
    setParticipantes(ps => ps?.map(p => (p.id === id ? { ...p, ...data } : p)) ?? ps);
    const r = await fetch(`/api/participantes/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!r.ok) { toast.error("No se pudo guardar el cambio"); cargar(); }
  }

  async function quitar(id: string) {
    setParticipantes(ps => ps?.filter(p => p.id !== id) ?? ps);
    const r = await fetch(`/api/participantes/${id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("No se pudo quitar"); cargar(); }
  }

  const enMapa = new Set(participantes?.map(p => p.contacto.id));
  const disponibles = (contactos ?? []).filter(c => !enMapa.has(c.id));
  const sinDecisor = participantes != null && faltaQuienDecide(participantes, etapa);

  return (
    <div className={tarjeta("p-5")}>
      <h2 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
        <IconUsersGroup size={16} stroke={1.75} className="text-brand-600" /> Personas en esta decisión
      </h2>

      {sinDecisor && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
          <IconAlertTriangle size={14} stroke={2} className="shrink-0" /> {AVISO_SIN_DECISOR}
        </p>
      )}

      {participantes == null ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : participantes.length === 0 ? (
        <p className="text-sm text-slate-400">Agregue a quien firma, a quien influye y a quien va a usar lo que vende.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {participantes.map(p => (
            <li key={p.id} className="py-2 first:pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 text-sm">
                  <Link href={`/dashboard/contactos/${p.contacto.id}`} className="font-semibold text-brand-600 hover:underline">{p.contacto.nombre}</Link>
                  {p.contacto.cargo && <p className="text-xs text-slate-500 truncate">{p.contacto.cargo}</p>}
                </div>
                <button type="button" onClick={() => quitar(p.id)} title="Quitar del mapa" aria-label={`Quitar a ${p.contacto.nombre} del mapa`}
                  className="shrink-0 rounded p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500">
                  <IconX size={14} stroke={2} />
                </button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <select value={p.rol} onChange={e => cambiar(p.id, { rol: e.target.value as RolDecision })}
                  aria-label="Papel en la decisión" title={ROL_LABEL[p.rol].ayuda}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                  {ROLES_DECISION.map(r => <option key={r} value={r}>{ROL_LABEL[r].label}</option>)}
                </select>
                <select value={p.postura} onChange={e => cambiar(p.id, { postura: e.target.value as PosturaDecision })}
                  aria-label="Postura" className={`rounded-lg border px-2 py-1 text-xs font-semibold ${POSTURA_CLASE[p.postura]}`}>
                  {POSTURAS_DECISION.map(x => <option key={x} value={x}>{POSTURA_LABEL[x]}</option>)}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}

      {agregando ? (
        <div className="mt-3 space-y-2">
          {!empresaId ? (
            <p className="text-xs text-slate-500">Asigne un cliente a la oportunidad para elegir a sus contactos.</p>
          ) : contactos == null ? (
            <p className="text-xs text-slate-400">Cargando contactos…</p>
          ) : disponibles.length === 0 ? (
            <p className="text-xs text-slate-500">
              No hay más contactos en este cliente. <Link href={`/dashboard/cuentas/${empresaId}`} className="font-medium text-brand-600 hover:underline">Crear uno en la ficha del cliente</Link>.
            </p>
          ) : (
            <>
              <select value={contactoId} onChange={e => elegirContacto(e.target.value)} className={campo("sm", "w-full")} aria-label="Contacto">
                <option value="">Elija un contacto…</option>
                {disponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.cargo ? ` · ${c.cargo}` : ""}</option>)}
              </select>
              {contactoId && (
                <select value={rol} onChange={e => setRol(e.target.value as RolDecision)} className={campo("sm", "w-full")} aria-label="Papel">
                  {ROLES_DECISION.map(r => <option key={r} value={r}>{ROL_LABEL[r].label} — {ROL_LABEL[r].ayuda}</option>)}
                </select>
              )}
            </>
          )}
          <div className="flex gap-2">
            {disponibles.length > 0 && (
              <button type="button" onClick={agregar} disabled={!contactoId || guardando} className={boton("primario", "sm")}>
                {guardando ? "Agregando…" : "Agregar"}
              </button>
            )}
            <button type="button" onClick={() => { setAgregando(false); setContactoId(""); }} className={boton("secundario", "sm")}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={abrirAgregar} className="mt-2 text-xs font-medium text-brand-600 hover:underline">
          + Agregar persona
        </button>
      )}
    </div>
  );
}
