/**
 * Avisos push (Web Push) al celular o computador del usuario.
 *
 * El usuario los activa en Mi perfil › "Avisos en este dispositivo": el
 * navegador crea una suscripción (endpoint + llaves) que se guarda en
 * SuscripcionPush. Para enviar se firma con las llaves VAPID del servidor.
 *
 * Variables de entorno (si faltan, los avisos quedan apagados sin error):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY  → `npx web-push generate-vapid-keys`
 *   VAPID_SUBJECT                        → mailto: de contacto (opcional)
 *
 * Todo es "best-effort": un aviso que no sale nunca tumba la acción que lo
 * disparó.
 */
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export type AvisoPush = {
  titulo: string;
  cuerpo: string;
  /** Ruta del CRM que abre el aviso al tocarlo (ej. /dashboard/agenda). */
  url: string;
  /** Avisos con la misma etiqueta se reemplazan en vez de apilarse. */
  etiqueta?: string;
};

export function llavePublicaPush(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

let configurado = false;
function configurar(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configurado) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:soporte@evoluteca.com", pub, priv);
    configurado = true;
  }
  return true;
}

/** Envía el aviso a todos los dispositivos donde esos usuarios lo activaron. */
export async function enviarPush(tenantId: string, usuarioIds: string[], aviso: AvisoPush): Promise<number> {
  try {
    const ids = [...new Set(usuarioIds.filter(Boolean))];
    if (ids.length === 0 || !configurar()) return 0;
    const subs = await prisma.suscripcionPush.findMany({
      where: { tenantId, usuarioId: { in: ids }, usuario: { activo: true } },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length === 0) return 0;

    const carga = JSON.stringify({
      titulo: aviso.titulo.slice(0, 120),
      cuerpo: aviso.cuerpo.slice(0, 300),
      url: aviso.url.startsWith("/") ? aviso.url : "/dashboard",
      etiqueta: aviso.etiqueta,
    });
    let enviados = 0;
    const vencidas: string[] = [];
    await Promise.all(subs.map(async s => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          carga,
          { TTL: 60 * 60 * 24, timeout: 10_000 },
        );
        enviados++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: el navegador anuló la suscripción (desinstaló, borró datos…).
        if (status === 404 || status === 410) vencidas.push(s.id);
        else console.error("enviarPush:", status ?? (e instanceof Error ? e.message : String(e)));
      }
    }));
    if (vencidas.length) {
      await prisma.suscripcionPush.deleteMany({ where: { tenantId, id: { in: vencidas } } });
    }
    return enviados;
  } catch (e) {
    console.error("enviarPush:", e instanceof Error ? e.message : String(e));
    return 0;
  }
}
