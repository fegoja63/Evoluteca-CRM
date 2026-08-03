import { prisma } from "@/lib/prisma";

/**
 * Estado de activación de una cuenta en su primer ingreso.
 *
 * - `necesitaPassword`: la clave la puso quien dio de alta al usuario y aún no
 *   la ha cambiado.
 * - `necesitaTerminos`: es el titular de la cuenta y su empresa todavía no ha
 *   aceptado el Acuerdo de Licencia (el contrato se acepta a nivel de tenant,
 *   una sola vez, en nombre de la empresa).
 * - `necesitaActivar`: cualquiera de las dos.
 */
export async function estadoActivacion(userId: string) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { esTitular: true, debeCambiarPassword: true, tenantId: true },
  });
  if (!usuario) {
    return { necesitaActivar: false, necesitaPassword: false, necesitaTerminos: false };
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: usuario.tenantId },
    select: { terminosAceptadosEn: true },
  });

  const necesitaPassword = usuario.debeCambiarPassword;
  const necesitaTerminos = usuario.esTitular && !tenant?.terminosAceptadosEn;

  return {
    necesitaActivar: necesitaPassword || necesitaTerminos,
    necesitaPassword,
    necesitaTerminos,
  };
}
