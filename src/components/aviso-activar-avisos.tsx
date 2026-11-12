"use client";

import { useEffect, useState } from "react";
import { IconBell, IconCircleCheck, IconX } from "@tabler/icons-react";
import { boton } from "@/components/ui/estilos";
import { toast } from "@/lib/toast";
import { activarAvisos, esAppInstalada, esCelular, navegadorAdmiteAvisos } from "@/lib/push-cliente";

const CLAVE_DESCARTE = "evoluteca-aviso-avisos-descartado";

type Paso = "oculto" | "instalar-iphone" | "activar" | "bloqueado" | "listo";

/**
 * Inicio, solo en el celular: invita a activar los avisos en este dispositivo
 * con un botón a la vista, sin tener que buscar "Mi perfil › App en tu
 * celular". Desaparece cuando ya están activos o si el usuario dice "Ahora no".
 */
export function AvisoActivarAvisos() {
  const [paso, setPaso] = useState<Paso>("oculto");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    if (!esCelular()) return;
    try { if (localStorage.getItem(CLAVE_DESCARTE)) return; } catch { /* sin almacenamiento: se muestra */ }
    (async () => {
      const iphone = /iPhone|iPad/.test(navigator.userAgent);
      if (!navegadorAdmiteAvisos()) {
        // En iPhone, Safari no tiene avisos: solo la app instalada.
        if (iphone && !esAppInstalada()) setPaso("instalar-iphone");
        return;
      }
      const r = await fetch("/api/push").then(x => x.json()).catch(() => null);
      if (!r?.disponible) return;
      setPublicKey(r.publicKey);
      if (Notification.permission === "denied") { setPaso("bloqueado"); return; }
      const reg = await navigator.serviceWorker.ready;
      if (await reg.pushManager.getSubscription()) return; // ya activos
      setPaso("activar");
    })();
  }, []);

  function descartar() {
    try { localStorage.setItem(CLAVE_DESCARTE, "1"); } catch { /* nada */ }
    setPaso("oculto");
  }

  async function activar() {
    if (!publicKey) return;
    setTrabajando(true);
    try {
      const resultado = await activarAvisos(publicKey);
      setPaso(resultado === "activo" ? "listo" : resultado === "bloqueado" ? "bloqueado" : "activar");
    } catch {
      toast.error("No se pudieron activar los avisos. Inténtalo de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  async function probar() {
    setTrabajando(true);
    const res = await fetch("/api/push/prueba", { method: "POST" }).catch(() => null);
    setTrabajando(false);
    if (res?.ok) toast.success("Aviso enviado. Debe llegarte en unos segundos.");
    else toast.error("No se pudo enviar el aviso de prueba.");
  }

  if (paso === "oculto") return null;

  return (
    <div className="relative rounded-2xl border border-brand-200 bg-brand-50 p-4 pr-10 dark:border-brand-800 dark:bg-brand-950/40">
      {paso !== "listo" && (
        <button type="button" onClick={descartar} aria-label="Ahora no"
          className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600">
          <IconX size={16} stroke={1.75} />
        </button>
      )}

      {paso === "activar" && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <IconBell size={18} stroke={1.75} className="text-brand-600" /> Activa los avisos en este celular
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Te avisamos cuando un cliente abra una cotización o te asignen una tarea.
          </p>
          <button type="button" onClick={activar} disabled={trabajando} className={boton("primario", "md", "mt-3 flex w-full justify-center")}>
            <IconBell size={16} stroke={1.75} /> {trabajando ? "Activando…" : "Activar avisos"}
          </button>
          <p className="mt-2 text-[11px] text-slate-400">Cuando el celular pregunte, toca &quot;Permitir&quot;.</p>
        </>
      )}

      {paso === "listo" && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            <IconCircleCheck size={18} stroke={2} /> ¡Avisos activados en este celular!
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={probar} disabled={trabajando} className={boton("secundario", "md", "flex flex-1 justify-center")}>
              <IconBell size={16} stroke={1.75} /> Enviar aviso de prueba
            </button>
            <button type="button" onClick={() => setPaso("oculto")} className={boton("secundario", "md")}>Listo</button>
          </div>
        </>
      )}

      {paso === "instalar-iphone" && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <IconBell size={18} stroke={1.75} className="text-brand-600" /> Para recibir avisos, usa la app
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            En iPhone los avisos solo funcionan desde la app. Toca Compartir (el cuadrito con la flecha) › &quot;Agregar a inicio&quot;,
            y abre el CRM desde ese ícono: ahí te aparecerá el botón para activarlos.
          </p>
        </>
      )}

      {paso === "bloqueado" && (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            <IconBell size={18} stroke={1.75} className="text-amber-600" /> Los avisos están bloqueados en este celular
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            En iPhone: Ajustes › Notificaciones › Evoluteca › activa &quot;Permitir notificaciones&quot;.
            En Android: mantén presionado el ícono › Información de la app › Notificaciones. Luego vuelve a abrir el CRM.
          </p>
        </>
      )}
    </div>
  );
}
