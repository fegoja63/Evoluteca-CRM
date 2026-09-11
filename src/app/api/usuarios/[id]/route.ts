import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { operacionAuditoria, type AccionAuditada } from "@/lib/auditoria";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo un administrador puede editar usuarios" }, { status: 403 });
  }

  const existente = await prisma.usuario.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const body = await request.json();
  const { nombre, rol, activo, nuevaPassword } = body;

  // Puedes editar tu propio NOMBRE, pero no cambiarte a ti mismo el rol o el
  // estado (evita que un admin se quite permisos o se desactive por error).
  if (existente.id === session.user.id && (rol !== undefined || activo !== undefined)) {
    return NextResponse.json({ error: "No puedes cambiar tu propio rol o estado" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (nombre !== undefined) {
    if (typeof nombre !== "string" || !nombre.trim()) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    data.nombre = nombre.trim();
  }
  if (rol !== undefined) {
    if (!["ADMINISTRADOR", "GERENTE", "COMERCIAL"].includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    data.rol = rol;
  }
  if (activo !== undefined) {
    // Reactivar a alguien también consume un cupo del límite de usuarios —
    // sin este chequeo, desactivar y reactivar sería una forma de sortear el
    // tope fijado por el plan.
    if (activo === true && !existente.activo) {
      const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { limiteUsuarios: true } });
      if (tenant?.limiteUsuarios != null) {
        const activos = await prisma.usuario.count({ where: { tenantId: session.user.tenantId, activo: true } });
        if (activos >= tenant.limiteUsuarios) {
          return NextResponse.json(
            { error: `Tu plan permite hasta ${tenant.limiteUsuarios} usuario${tenant.limiteUsuarios !== 1 ? "s" : ""} activo${tenant.limiteUsuarios !== 1 ? "s" : ""}. Contacta a tu asesor Evoluteca para ampliar el límite.` },
            { status: 403 }
          );
        }
      }
    }
    data.activo = activo;
  }
  if (nuevaPassword !== undefined) {
    if (typeof nuevaPassword !== "string" || nuevaPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(nuevaPassword, 12);
    // Es una clave temporal que pone el administrador y comparte por un canal
    // externo: el usuario debe cambiarla en su próximo ingreso.
    data.debeCambiarPassword = true;
  }

  // El cambio de rol y la baja/alta se registran con su propia acción, no como
  // un "ACTUALIZAR" genérico: son las dos preguntas que de verdad se hacen en
  // una auditoría ("¿quién le dio permisos de administrador a esta persona?").
  const accion: AccionAuditada =
    rol !== undefined && rol !== existente.rol
      ? "CAMBIAR_ROL"
      : activo === false && existente.activo
        ? "DESACTIVAR_USUARIO"
        : activo === true && !existente.activo
          ? "ACTIVAR_USUARIO"
          : "ACTUALIZAR";

  const cambios = Object.keys(data);
  const descripcion =
    accion === "CAMBIAR_ROL"
      ? `Cambió el rol de ${existente.email} de ${existente.rol} a ${rol}`
      : accion === "DESACTIVAR_USUARIO"
        ? `Desactivó al usuario ${existente.email}`
        : accion === "ACTIVAR_USUARIO"
          ? `Reactivó al usuario ${existente.email}`
          : `Editó al usuario ${existente.email} (${cambios.join(", ") || "sin cambios"})`;

  // En la misma transacción que el cambio: o quedan las dos cosas o ninguna.
  // Un registro de auditoría que puede faltar justo cuando algo salió mal no
  // sirve de nada.
  const [actualizado] = await prisma.$transaction([
    prisma.usuario.update({
      where: { id: params.id },
      data,
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
    }),
    operacionAuditoria({
      tenantId: session.user.tenantId,
      usuario: session.user,
      accion,
      entidad: "Usuario",
      entidadId: existente.id,
      descripcion,
      antes: { nombre: existente.nombre, email: existente.email, rol: existente.rol, activo: existente.activo },
      despues: { ...data, passwordHash: undefined },
      peticion: request,
    }),
  ]);

  return NextResponse.json(actualizado);
}

/**
 * Elimina a un usuario del tenant de forma DEFINITIVA.
 *
 * A diferencia de "desactivar" (PATCH activo:false), esto borra la cuenta. Se
 * usa cuando la persona ya no debe quedar ni en la lista del equipo. Antes de
 * borrar hay que decidir qué pasa con lo que esa persona "creó": clientes,
 * oportunidades, actividades, expedientes y términos gobiernan lo que ve un
 * COMERCIAL, y si se quedaran apuntando al id borrado quedarían con un dueño
 * fantasma —invisibles hasta para el panel de "asignar sin dueño", que solo
 * busca creadoBy:null—. Por eso:
 *   - ?reasignarA=<id>  → se traspasan a ese vendedor.
 *   - sin parámetro     → se dejan en null ("sin dueño"), recuperables desde el
 *                         panel de Equipo.
 * El resto de columnas creadoBy (adjuntos, cambios de etapa, correos, eventos)
 * son rastro histórico de "quién hizo esto" y se dejan como están: reescribir
 * la historia para tapar a alguien que se fue sería peor que un dato viejo.
 *
 * Las relaciones con llave foránea se resuelven solas por el schema: las metas
 * del vendedor caen en cascada, y las horas y actividades asignadas quedan en
 * null (onDelete: SetNull).
 */
export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (session.user.rol !== "ADMINISTRADOR") {
    return NextResponse.json({ error: "Solo un administrador puede eliminar usuarios" }, { status: 403 });
  }

  const existente = await prisma.usuario.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  });
  if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Dos candados contra el disparo en el pie: nadie borra su propia cuenta (se
  // quedaría sin sesión a media operación) ni la del titular (el único que
  // puede aceptar el Acuerdo de Licencia por la empresa).
  if (existente.id === session.user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }
  if (existente.esTitular) {
    return NextResponse.json({ error: "No se puede eliminar al titular de la cuenta" }, { status: 400 });
  }

  // A quién se le traspasan los registros. null = dejarlos "sin dueño".
  const { searchParams } = new URL(request.url);
  const reasignarA = searchParams.get("reasignarA");
  if (reasignarA) {
    const destino = await prisma.usuario.findFirst({
      where: { id: reasignarA, tenantId: session.user.tenantId, activo: true },
    });
    if (!destino) {
      return NextResponse.json({ error: "El vendedor destino no existe o está inactivo" }, { status: 400 });
    }
    if (destino.id === existente.id) {
      return NextResponse.json({ error: "El vendedor destino no puede ser el mismo que se elimina" }, { status: 400 });
    }
  }

  // Solo las 5 tablas que definen la visibilidad por dueño; el where filtra por
  // los registros que esta persona tenía a su nombre.
  const dueno = { tenantId: session.user.tenantId, creadoBy: existente.id };
  const nuevoDueno = { creadoBy: reasignarA ?? null };

  const [, , , , , eliminado] = await prisma.$transaction([
    prisma.empresa.updateMany({ where: dueno, data: nuevoDueno }),
    prisma.oportunidad.updateMany({ where: dueno, data: nuevoDueno }),
    prisma.actividad.updateMany({ where: dueno, data: nuevoDueno }),
    prisma.expediente.updateMany({ where: dueno, data: nuevoDueno }),
    prisma.terminoExpediente.updateMany({ where: dueno, data: nuevoDueno }),
    prisma.usuario.delete({ where: { id: existente.id } }),
    operacionAuditoria({
      tenantId: session.user.tenantId,
      usuario: session.user,
      accion: "ELIMINAR_USUARIO",
      entidad: "Usuario",
      entidadId: existente.id,
      descripcion: reasignarA
        ? `Eliminó al usuario ${existente.email} y reasignó sus registros`
        : `Eliminó al usuario ${existente.email} (sus registros quedaron sin dueño)`,
      antes: { nombre: existente.nombre, email: existente.email, rol: existente.rol, activo: existente.activo },
      peticion: request,
    }),
  ]);

  return NextResponse.json({ ok: true, id: eliminado.id });
}
