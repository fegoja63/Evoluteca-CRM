"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconCopy, IconExternalLink, IconRefresh, IconSettings } from "@tabler/icons-react";
import { toast } from "@/lib/toast";
import { boton, campo, tarjeta } from "@/components/ui/estilos";
import { MAX_INFO, type AgenteConfig } from "@/lib/agente-web";

type Usuario = { id: string; nombre: string; tieneAgenda: boolean };

// Configuración del Chat web (solo administradores): qué sabe el asistente,
// quién recibe los prospectos y el código para pegar en la página.
export function AgenteWebConfig({ usuarios }: { usuarios: Usuario[] }) {
  const [config, setConfig] = useState<AgenteConfig | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState<"" | "codigo" | "enlace">("");
  const [origen, setOrigen] = useState("");

  useEffect(() => {
    setOrigen(window.location.origin);
    fetch("/api/agente-web", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setConfig(d.config); setToken(d.token); if (!d.config?.activo) setAbierto(true); })
      .catch(() => toast.error("No se pudo cargar la configuración del chat."));
  }, []);

  if (!config) return <div className={tarjeta("p-5 text-sm text-slate-400")}>Cargando configuración…</div>;

  const cambiar = <K extends keyof AgenteConfig>(k: K, v: AgenteConfig[K]) => setConfig({ ...config, [k]: v });

  async function guardar(siguiente: AgenteConfig) {
    setGuardando(true);
    const res = await fetch("/api/agente-web", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(siguiente),
    }).catch(() => null);
    setGuardando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { toast.error(d?.error ?? "No se pudo guardar."); return; }
    setConfig(d.config); setToken(d.token);
    toast.success(d.config.activo ? "Chat web guardado y activo." : "Chat web guardado (apagado).");
  }

  async function cambiarCodigo() {
    if (!confirm("¿Cambiar el código? El chat que ya está pegado en su página dejará de funcionar hasta que pegue el nuevo.")) return;
    const res = await fetch("/api/agente-web", { method: "POST" }).catch(() => null);
    if (!res?.ok) { toast.error("No se pudo cambiar el código."); return; }
    setToken((await res.json()).token);
    toast.success("Código nuevo listo. Péguelo en su página.");
  }

  function copiar(texto: string, cual: "codigo" | "enlace") {
    navigator.clipboard.writeText(texto).then(() => { setCopiado(cual); setTimeout(() => setCopiado(""), 2000); });
  }

  const enlace = token ? `${origen}/chat/${token}` : "";
  const codigo = token ? `<script src="${origen}/agente-web.js" data-chat="${token}" async></script>` : "";
  const responsable = usuarios.find(u => u.id === config.responsableId);

  return (
    <div className={tarjeta("p-5")}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">Configuración del chat</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {config.activo ? "Activo: responde en su página a cualquier hora." : "Apagado: actívelo para que atienda a los visitantes de su página."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={config.activo} disabled={guardando}
            onChange={e => guardar({ ...config, activo: e.target.checked })} className="h-4 w-4 accent-brand-700" />
          Activo
        </label>
        <button onClick={() => setAbierto(!abierto)} className={boton("secundario", "sm")}>
          <IconSettings size={14} stroke={1.75} />{abierto ? "Ocultar ajustes" : "Ajustes"}
        </button>
      </div>

      {abierto && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Nombre del asistente
            <input value={config.nombre} maxLength={60} onChange={e => cambiar("nombre", e.target.value)} className={campo("md", "mt-1 w-full font-normal")} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Quién recibe los prospectos
            <select value={config.responsableId ?? ""} onChange={e => cambiar("responsableId", e.target.value || null)} className={campo("md", "mt-1 w-full font-normal")}>
              <option value="">Repartir entre los comerciales</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}{u.tieneAgenda ? " (con enlace para agendar)" : ""}</option>)}
            </select>
            <span className="mt-1 block font-normal text-2xs text-slate-400">
              {responsable?.tieneAgenda
                ? "El asistente ofrecerá agendar una reunión en su agenda."
                : "Si elige a alguien con su enlace para agendar activo (Mi perfil), el asistente ofrecerá reuniones."}
            </span>
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Saludo
            <input value={config.saludo} maxLength={300} onChange={e => cambiar("saludo", e.target.value)} className={campo("md", "mt-1 w-full font-normal")} />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Lo que el asistente debe saber de su empresa
            <textarea value={config.info} maxLength={MAX_INFO} rows={7} onChange={e => cambiar("info", e.target.value)}
              placeholder={"Qué venden y a quién, horarios, ciudades donde atienden, tiempos de entrega, formas de pago, preguntas frecuentes…\nSi pone precios aquí, el asistente los podrá decir. Si no, dirá que un asesor los confirma."}
              className={campo("md", "mt-1 w-full resize-y font-normal")} />
            <span className="mt-1 block font-normal text-2xs text-slate-400">
              También usa los productos activos de su Catálogo. {config.info.length}/{MAX_INFO}
            </span>
          </label>
          <div className="sm:col-span-2">
            <button onClick={() => guardar(config)} disabled={guardando} className={boton("marca", "md")}>
              {guardando ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {token && config.activo && (
        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <div>
            <p className="text-xs font-semibold text-slate-600">Para su página web: pegue este código antes de &lt;/body&gt;</p>
            <div className="mt-1 flex items-start gap-2">
              <code className="flex-1 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">{codigo}</code>
              <button onClick={() => copiar(codigo, "codigo")} className={boton("secundario", "sm", "shrink-0")} aria-label="Copiar código">
                {copiado === "codigo" ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={1.75} />}
              </button>
            </div>
            <p className="mt-1 text-2xs text-slate-400">Aparece un botón de chat en la esquina de su página. Funciona en WordPress, Wix y cualquier sitio que permita pegar código.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">Enlace directo (para Instagram, WhatsApp o un correo)</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">{enlace}</code>
              <button onClick={() => copiar(enlace, "enlace")} className={boton("secundario", "sm")} aria-label="Copiar enlace">
                {copiado === "enlace" ? <IconCheck size={14} stroke={2} /> : <IconCopy size={14} stroke={1.75} />}
              </button>
              <a href={enlace} target="_blank" rel="noopener noreferrer" className={boton("secundario", "sm")}>
                <IconExternalLink size={14} stroke={1.75} />Probar
              </a>
            </div>
          </div>
          <button onClick={cambiarCodigo} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline">
            <IconRefresh size={13} stroke={1.75} />Cambiar código
          </button>
        </div>
      )}
    </div>
  );
}
