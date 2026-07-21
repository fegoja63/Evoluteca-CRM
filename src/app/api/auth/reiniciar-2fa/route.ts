import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";

/**
 * El usuario confirma, desde su propio correo, la desactivación de su segundo
 * factor. Es la otra mitad del rescate que inicia un administrador.
 *
 * Sin sesión a propósito: quien llega aquí precisamente NO puede iniciar
 * sesión, porque perdió el acceso a su aplicación de códigos. La credencial es
 * el token del enlace, que solo existe en su buzón.
 *
 * GET  ?token=...  comprueba si el enlace sirve (para pintar la página)
 * POST { token }   desactiva de verdad
 */

/** Busca el usuario del token, si el token existe y no ha vencido. */
async function usuarioDelToken(token: string) {
  if (!token || token.length < 32) return null;

  const usuario = await prisma.usuario.findUnique({
    where: { reset2faToken: token },
    select: { id: true, nombre: true, email: true, tenantId: true, reset2faExpiry: true },
  });

  if (!usuario) return null;
  if (!usuario.reset2faExpiry || usuario.reset2faExpiry < new Date()) return null;
  return usuario;
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const usuario = await usuarioDelToken(token);

  if (!usuario) {
    return NextResponse.json({ valido: false, error: "El enlace no es válido o ya expiró" }, { status: 400 });
  }

  // Se devuelve el correo para que la persona confirme que es su cuenta, pero
  // solo a quien ya tiene el token: no es un buscador de usuarios.
  return NextResponse.json({ valido: true, email: usuario.email, nombre: usuario.nombre });
}

export async function POST(req: NextRequest) {
  // Límite por IP: el token es largo y de un solo uso, pero esto cierra la
  // puerta a probar tokens a lo bruto.
  if (!(await permitirYRegistrar(`reiniciar2fa:${obtenerIp(req)}`, 10, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  const cuerpo = await req.json().catch(() => ({}));
  const token = typeof cuerpo?.token === "string" ? cuerpo.token : "";
  const usuario = await usuarioDelToken(token);

  if (!usuario) {
    return NextResponse.json({ error: "El enlace no es válido o ya expiró" }, { status: 400 });
  }

  // Se limpia TODO de una vez: secreto, fecha de activación, códigos de
  // respaldo y el propio token. Dejar cualquier resto convertiría el enlace en
  // reutilizable.
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      totpSecret: null,
      totpActivadoEn: null,
      codigosRespaldo: [],
      reset2faToken: null,
      reset2faExpiry: null,
    },
  });

  // Se audita como el propio usuario, no como el administrador: fue él quien
  // lo confirmó, y así queda claro en el registro.
  await registrarAuditoria({
    tenantId: usuario.tenantId,
    usuario: { id: usuario.id, email: usuario.email, name: usuario.nombre },
    accion: "CAMBIAR_CONFIGURACION",
    entidad: "Usuario",
    entidadId: usuario.id,
    descripcion: "Confirmó por correo la desactivación de su verificación en dos pasos",
    peticion: req,
  });

  return NextResponse.json({
    ok: true,
    mensaje: "Listo. Ya puedes entrar solo con tu contraseña. Vuelve a activar la verificación en dos pasos cuando tengas tu teléfono.",
  });
}
