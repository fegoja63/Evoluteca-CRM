import { prisma } from "@/lib/prisma";

// Registra un error del SERVIDOR en error_logs (la misma tabla que alimenta el
// panel de errores). Pensado para fallos de tareas de fondo —correo, crons—
// que antes solo iban a console.error y quedaban invisibles fuera de los logs
// de Vercel.
//
// Best-effort: NUNCA lanza. Si el propio registro falla, se ignora, para no
// romper la operación que lo llamó.

const cap = (v: unknown, n: number): string | null =>
  typeof v === "string" && v.trim() ? v.slice(0, n) : null;

export async function registrarErrorServidor(params: {
  mensaje: string;
  stack?: string | null;
  /** Categoría libre; ej. "email", "cron". Por defecto "server". */
  tipo?: string;
  tenantId?: string | null;
  tenantNombre?: string | null;
  usuarioEmail?: string | null;
  url?: string | null;
}): Promise<void> {
  try {
    const mensaje = cap(params.mensaje, 2000);
    if (!mensaje) return;
    await prisma.errorLog.create({
      data: {
        mensaje,
        stack: cap(params.stack, 8000),
        url: cap(params.url, 500),
        tipo: params.tipo ?? "server",
        tenantId: params.tenantId ?? null,
        tenantNombre: params.tenantNombre ?? null,
        usuarioEmail: params.usuarioEmail ?? null,
      },
    });
  } catch {
    /* el registrador jamás debe romper la operación que lo llama */
  }
}
