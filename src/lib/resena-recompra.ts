/**
 * Reseña y recompra después de ganar un negocio.
 *
 * El administrador las activa en Configuración › Reseñas y recompra. Cada día
 * hábil (con el cron de secuencias) se revisan los negocios GANADOS:
 *   - `resena.dias` días después del cierre: se le deja al dueño del negocio
 *     la tarea "Pedir reseña a …" con el mensaje listo y el enlace de reseñas
 *     (Google, por ejemplo).
 *   - `recompra.dias` días después del cierre: la tarea "Ofrecer recompra a …"
 *     con el mensaje listo. Si el cliente ya tiene otro negocio en curso no se
 *     crea (ya lo están atendiendo).
 * La tarea queda en la Bandeja Hoy; si el contacto tiene celular trae el botón
 * "Enviar WhatsApp" (igual que los pasos de las secuencias). Cada negocio se
 * marca (resenaPedidaEn / recompraAvisadaEn) para no repetirla.
 *
 * Solo se miran los cierres de las últimas VENTANA_DIAS después del plazo:
 * al activarlo no le llegan tareas por negocios de hace años.
 */
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aplicarVariables, enlaceWhatsApp } from "@/lib/secuencias";
import { enviarPush } from "@/lib/push";

export const VENTANA_DIAS = 14;
const DIA = 86_400_000;

export const RESENA_POR_DEFECTO =
  "Hola {{nombre}}, le escribe {{vendedor}}. Gracias por confiar en nosotros con {{negocio}}. ¿Nos ayudaría con una reseña corta de su experiencia? Le toma un minuto: {{enlace}}";
export const RECOMPRA_POR_DEFECTO =
  "Hola {{nombre}}, le escribe {{vendedor}}. Hace un tiempo trabajamos juntos en {{negocio}}. ¿Cómo le ha ido? Si necesita reponer o ampliar, con gusto le preparo una propuesta.";

export const configSchema = z.object({
  resena: z.object({
    activa: z.boolean(),
    dias: z.number().int().min(1).max(365),
    enlace: z.string().trim().max(500),
    mensaje: z.string().trim().min(1, "Escriba el mensaje de la reseña").max(1000),
  }).refine(r => !r.activa || /^https:\/\/\S+$/.test(r.enlace), { message: "Ponga el enlace de reseñas (empieza por https://)", path: ["enlace"] }),
  recompra: z.object({
    activa: z.boolean(),
    dias: z.number().int().min(7).max(730),
    mensaje: z.string().trim().min(1, "Escriba el mensaje de recompra").max(1000),
  }),
});
export type ConfigResenaRecompra = z.infer<typeof configSchema>;

export const CONFIG_POR_DEFECTO: ConfigResenaRecompra = {
  resena: { activa: false, dias: 15, enlace: "", mensaje: RESENA_POR_DEFECTO },
  recompra: { activa: false, dias: 90, mensaje: RECOMPRA_POR_DEFECTO },
};

export function configDe(json: unknown): ConfigResenaRecompra {
  const r = configSchema.safeParse(json);
  return r.success ? r.data : CONFIG_POR_DEFECTO;
}

/** Desde / hasta qué fecha de cierre toca hoy un recordatorio de `dias` días. */
export function ventanaCierre(dias: number, ahora: Date): { desde: Date; hasta: Date } {
  const hasta = new Date(ahora.getTime() - dias * DIA);
  return { desde: new Date(hasta.getTime() - VENTANA_DIAS * DIA), hasta };
}

type Tipo = "resena" | "recompra";

type Negocio = {
  id: string; tenantId: string; titulo: string; empresaId: string | null; creadoBy: string | null;
  contacto: { id: string; nombre: string; telefono: string | null; email: string | null } | null;
  empresa: {
    nombre: string; telefono: string | null;
    contactos: { id: string; nombre: string; telefono: string | null; email: string | null }[];
  } | null;
};

/** El texto de la tarea: mensaje con variables + enlace de WhatsApp si hay celular. */
export function notasTarea(tipo: Tipo, mensaje: string, contacto: { telefono: string | null; email: string | null } | null, telEmpresa: string | null): string {
  const wa = enlaceWhatsApp(contacto?.telefono || telEmpresa, mensaje);
  return [
    tipo === "resena" ? "Pedirle al cliente una reseña de su experiencia." : "Ofrecerle al cliente una nueva compra.",
    `Mensaje para enviar:\n${mensaje}`,
    contacto?.email ? `Correo del contacto: ${contacto.email}` : null,
    !wa ? "El contacto no tiene celular: envíelo por correo o agréguelo en su ficha." : null,
    wa ? `Abrir WhatsApp: ${wa}` : null,
  ].filter(Boolean).join("\n\n");
}

async function crearTarea(tipo: Tipo, n: Negocio, mensajeBase: string, enlace: string, duenoId: string, vendedor: string, ahora: Date) {
  const contacto = n.contacto ?? n.empresa?.contactos[0] ?? null;
  const mensaje = aplicarVariables(mensajeBase, {
    nombre: contacto?.nombre ?? "", empresa: n.empresa?.nombre ?? null, vendedor, negocio: n.titulo,
  }).replace(/\{\{\s*enlace\s*\}\}/gi, enlace);
  const quien = contacto?.nombre ?? n.empresa?.nombre ?? "el cliente";
  await prisma.actividad.create({
    data: {
      tenantId: n.tenantId, tipo: "TAREA",
      titulo: (tipo === "resena" ? `Pedir reseña a ${quien}` : `Ofrecer recompra a ${quien}`).slice(0, 200),
      fecha: ahora,
      notas: notasTarea(tipo, mensaje, contacto, n.empresa?.telefono ?? null).slice(0, 8000),
      creadoBy: duenoId, responsableId: duenoId,
      contactoId: contacto?.id ?? null, empresaId: n.empresaId, oportunidadId: n.id,
    },
  });
  await enviarPush(n.tenantId, [duenoId], {
    titulo: tipo === "resena" ? `⭐ Pídale una reseña a ${quien}` : `🔁 Buen momento para ofrecerle a ${quien} una nueva compra`,
    cuerpo: `${n.titulo} · está en su Bandeja Hoy`,
    url: "/dashboard/hoy",
    etiqueta: `${tipo}-${n.id}`,
  });
}

/** Revisa todos los tenants con reseña o recompra activas (lo llama el cron diario). */
export async function procesarResenaRecompra(ahora = new Date()) {
  const conteo = { resenas: 0, recompras: 0, omitidas: 0 };
  const tenants = await prisma.tenant.findMany({
    where: { activo: true, NOT: { resenaRecompraConfig: { equals: Prisma.AnyNull } } },
    select: { id: true, resenaRecompraConfig: true },
  });

  for (const t of tenants) {
    const config = configDe(t.resenaRecompraConfig);
    const admins = await prisma.usuario.findMany({
      where: { tenantId: t.id, activo: true, rol: "ADMINISTRADOR" }, orderBy: { creadoEn: "asc" }, select: { id: true, nombre: true },
    });
    const usuarios = new Map((await prisma.usuario.findMany({
      where: { tenantId: t.id, activo: true }, select: { id: true, nombre: true },
    })).map(u => [u.id, u.nombre]));
    // El dueño del negocio; si ya no está activo, el primer administrador.
    const duenoDe = (n: Negocio) => (n.creadoBy && usuarios.has(n.creadoBy) ? { id: n.creadoBy, nombre: usuarios.get(n.creadoBy)! } : admins[0] ?? null);

    for (const tipo of ["resena", "recompra"] as const) {
      const c = config[tipo];
      if (!c.activa) continue;
      const { desde, hasta } = ventanaCierre(c.dias, ahora);
      const marca = tipo === "resena" ? "resenaPedidaEn" : "recompraAvisadaEn";
      const negocios = await prisma.oportunidad.findMany({
        where: { tenantId: t.id, eliminadoEn: null, etapa: "GANADA", fechaCierre: { gt: desde, lte: hasta }, [marca]: null },
        take: 100,
        select: {
          id: true, tenantId: true, titulo: true, empresaId: true, creadoBy: true,
          contacto: { select: { id: true, nombre: true, telefono: true, email: true } },
          empresa: {
            select: {
              nombre: true, telefono: true,
              contactos: { where: { eliminadoEn: null }, orderBy: { creadoEn: "asc" }, take: 1, select: { id: true, nombre: true, telefono: true, email: true } },
              _count: { select: { oportunidades: { where: { eliminadoEn: null, etapa: { in: ["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION"] } } } } },
            },
          },
        },
      });
      for (const n of negocios) {
        const dueno = duenoDe(n);
        // Recompra: si ya hay otro negocio en curso con el cliente, no hace falta.
        const yaEnCurso = tipo === "recompra" && (n.empresa?._count.oportunidades ?? 0) > 0;
        if (dueno && !yaEnCurso) {
          await crearTarea(tipo, n, c.mensaje, tipo === "resena" ? config.resena.enlace : "", dueno.id, dueno.nombre, ahora);
          conteo[tipo === "resena" ? "resenas" : "recompras"]++;
        } else {
          conteo.omitidas++;
        }
        await prisma.oportunidad.update({ where: { id: n.id, tenantId: t.id }, data: { [marca]: ahora } });
      }
    }
  }
  return conteo;
}
