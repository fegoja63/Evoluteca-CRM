import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarClaveAdmin } from "@/lib/admin-evoluteca";
import { editarTenantSchema } from "@/lib/validations/tenants";
import { parseOrError } from "@/lib/validations/helpers";
import { fechaDesdeBogota } from "@/lib/fecha-bogota";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denegado = await verificarClaveAdmin(req);
  if (denegado) return denegado;

  const existente = await prisma.tenant.findUnique({ where: { id: params.id }, select: { modulos: true } });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await req.json();
  const { data, error } = parseOrError(editarTenantSchema, body);
  if (error) return error;
  const { activo, plan, emailsActivos, soloFinanzas, limiteUsuarios, limiteResumenesIA, modulos, licenciaVenceEn, licenciaAvisoEn } = data;
  const dia = (v: string | null) => (v ? fechaDesdeBogota(v) : null);
  // Cambiar cualquiera de las dos fechas re-arma el aviso (se vuelve a enviar
  // el día que corresponda).
  const cambiaLicencia = licenciaVenceEn !== undefined || licenciaAvisoEn !== undefined;

  // Los módulos se fusionan (no se reemplaza el objeto completo) para no
  // desactivar accidentalmente un módulo que no vino en este PATCH.
  const modulosActuales = (existente.modulos as Record<string, boolean> | null) ?? {};
  const modulosNuevos = modulos ? { ...modulosActuales, ...modulos } : undefined;

  // Suspender/reactivar arrastra los correos automáticos: al suspender (activo
  // = false) se apagan, para no seguir escribiéndole a un cliente cortado; al
  // reactivar se reencienden. Si el PATCH trae `emailsActivos` explícito, ese
  // valor manda (permite ajustar los correos sin tocar el estado).
  const emailsFinal = emailsActivos !== undefined
    ? emailsActivos
    : activo !== undefined ? activo : undefined;

  const tenant = await prisma.tenant.update({
    where: { id: params.id },
    data: {
      ...(activo !== undefined && { activo }),
      ...(plan !== undefined && { plan }),
      ...(soloFinanzas !== undefined && { soloFinanzas }),
      ...(emailsFinal !== undefined && { emailsActivos: emailsFinal }),
      ...(limiteUsuarios !== undefined && { limiteUsuarios }),
      ...(limiteResumenesIA !== undefined && { limiteResumenesIA }),
      ...(modulosNuevos !== undefined && { modulos: modulosNuevos }),
      ...(licenciaVenceEn !== undefined && { licenciaVenceEn: dia(licenciaVenceEn) }),
      ...(licenciaAvisoEn !== undefined && { licenciaAvisoEn: dia(licenciaAvisoEn) }),
      ...(cambiaLicencia && { licenciaAvisadaEn: null }),
    },
    select: {
      id: true, nombre: true, slug: true, plan: true, activo: true,
      creadoEn: true, modulos: true, emailsActivos: true, soloFinanzas: true, limiteUsuarios: true,
      limiteResumenesIA: true, licenciaVenceEn: true, licenciaAvisoEn: true, licenciaAvisadaEn: true,
      _count: { select: { usuarios: true, empresas: true, cotizaciones: true } },
    },
  });

  return NextResponse.json(tenant);
}
