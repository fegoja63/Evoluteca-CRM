"use client";

import { useEffect, useState } from "react";
import { IconMailForward, IconCopy, IconCheck, IconRefresh, IconTrash } from "@tabler/icons-react";
import { boton, tarjeta } from "@/components/ui/estilos";
import { SkeletonLista } from "@/components/ui/estados";
import { toast } from "@/lib/toast";

type Estado = { disponible: boolean; direccion: string | null };

/** Mi perfil › Registrar correos con CCO: la dirección personal para poner en copia oculta. */
export default function CorreoCco() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/perfil/cco").then(r => r.json()).then(setEstado).catch(() => setEstado({ disponible: false, direccion: null }));
  }, []);

  async function llamar(method: "POST" | "DELETE") {
    if (method === "POST" && estado?.direccion && !confirm("Se creará una dirección nueva y la anterior dejará de funcionar. ¿Continuar?")) return;
    if (method === "DELETE" && !confirm("Los correos que envíes con la dirección actual en copia oculta dejarán de registrarse. ¿Desactivarla?")) return;
    setTrabajando(true);
    const res = await fetch("/api/perfil/cco", { method }).catch(() => null);
    setTrabajando(false);
    if (!res?.ok) { toast.error("No se pudo actualizar. Inténtalo de nuevo."); return; }
    setEstado(await res.json());
  }

  async function copiar() {
    if (!estado?.direccion) return;
    await navigator.clipboard.writeText(estado.direccion).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className={tarjeta("p-5 mt-6")}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
        <IconMailForward size={16} stroke={1.75} /> Registrar correos con CCO
      </h2>
      <p className="text-xs text-slate-400 mb-4">
        Cuando le escribas a un cliente desde tu propio correo (Gmail, Outlook o el celular), pon esta dirección en
        <span className="font-medium text-slate-500"> CCO (copia oculta)</span>. El correo queda registrado solo en la ficha
        del contacto y en su negocio abierto, sin que el CRM lea tu buzón. El cliente no la ve.
      </p>

      {!estado ? (
        <SkeletonLista filas={1} />
      ) : !estado.disponible ? (
        <p className="text-xs text-slate-500">El registro de correos todavía no está habilitado en tu cuenta.</p>
      ) : estado.direccion ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input type="text" readOnly value={estado.direccion} onFocus={e => e.target.select()}
              className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 outline-none" />
            <button type="button" onClick={copiar} className={boton("primario", "lg", "shrink-0 flex")}>
              {copiado ? <><IconCheck size={15} stroke={2} /> Copiada</> : <><IconCopy size={15} stroke={1.75} /> Copiar</>}
            </button>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-500">
            <li>Se registra en cada contacto del CRM cuyo correo vaya en el mensaje. Si el destinatario aún no es contacto, créalo primero.</li>
            <li>Guárdala como contacto en tu correo (por ejemplo &quot;CRM&quot;) para ponerla en CCO con dos letras.</li>
            <li>Los correos aparecen en la ficha unas horas después: el CRM revisa el buzón varias veces al día.</li>
          </ul>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => llamar("POST")} disabled={trabajando} className={boton("secundario", "md", "flex")}>
              <IconRefresh size={15} stroke={1.75} /> Generar una nueva
            </button>
            <button type="button" onClick={() => llamar("DELETE")} disabled={trabajando}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
              <IconTrash size={15} stroke={1.75} /> Desactivar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => llamar("POST")} disabled={trabajando} className={boton("primario", "lg", "flex")}>
          <IconMailForward size={16} stroke={1.75} /> {trabajando ? "Generando..." : "Activar mi dirección CCO"}
        </button>
      )}
    </div>
  );
}
