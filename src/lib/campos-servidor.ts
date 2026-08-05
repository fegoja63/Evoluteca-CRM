import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  validarValoresCampos,
  mezclarExtras,
  type EntidadCampo,
  type DefinicionCampo,
} from "@/lib/campos-personalizados";

// Puente entre las rutas de escritura de entidades (Empresa, Oportunidad) y la
// lógica pura de campos personalizados: carga las definiciones ACTIVAS del
// tenant, valida los valores entrantes y los mezcla con los `extras` ya
// guardados. Devuelve el objeto `extras` listo para persistir, o un error.
export async function construirExtrasConCampos(params: {
  tenantId: string;
  entidad: EntidadCampo;
  entrantes: Record<string, unknown>;
  extrasActuales: unknown;
}): Promise<{ ok: true; extras: Prisma.InputJsonObject } | { ok: false; error: string }> {
  const defs = (await prisma.campoPersonalizado.findMany({
    where: { tenantId: params.tenantId, entidad: params.entidad, activo: true },
    select: { clave: true, etiqueta: true, tipo: true, opciones: true, obligatorio: true },
  })) as DefinicionCampo[];

  const res = validarValoresCampos(defs, params.entrantes);
  if (!res.ok) return res;

  const extras = mezclarExtras(
    (params.extrasActuales as Record<string, unknown> | null) ?? null,
    defs,
    res.valores
  );
  return { ok: true, extras: extras as Prisma.InputJsonObject };
}
