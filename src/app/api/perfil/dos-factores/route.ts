import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/auditoria";
import {
  generarSecreto,
  uriParaApp,
  codigoValido,
  generarCodigosRespaldo,
  tieneDosFactores,
} from "@/lib/dos-factores";

/**
 * Verificación en dos pasos del propio usuario.
 *
 * Siempre sobre la sesión: nadie configura el segundo factor de otra persona,
 * ni siquiera un administrador. Un segundo factor que un tercero puede poner
 * o quitar no es un segundo factor.
 *
 *   GET    estado actual
 *   POST   empieza la activación (devuelve secreto y URI para el código QR)
 *   PUT    confirma con un código y la deja activa (devuelve los respaldos)
 *   DELETE la desactiva (exige un código válido)
 */

/** El usuario de la sesión, con lo justo para decidir. */
async function usuarioDeSesion(tenantId: string, id: string) {
  return prisma.usuario.findFirst({
    where: { id, tenantId },
    select: { id: true, email: true, totpSecret: true, totpActivadoEn: true, codigosRespaldo: true },
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await usuarioDeSesion(session.user.tenantId, session.user.id);
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({
    activa: tieneDosFactores(usuario),
    activadaEn: usuario.totpActivadoEn,
    codigosRespaldoRestantes: usuario.codigosRespaldo.length,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await usuarioDeSesion(session.user.tenantId, session.user.id);
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (tieneDosFactores(usuario)) {
    return NextResponse.json(
      { error: "Ya tienes la verificación en dos pasos activa. Desactívala primero si quieres cambiar de aplicación." },
      { status: 400 }
    );
  }

  // Se guarda el secreto pero NO se activa: hasta que el usuario no confirme
  // con un código de su app, el login sigue funcionando como siempre. Si se
  // activara aquí, un error a media configuración lo dejaría fuera.
  const secreto = await generarSecreto();
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { totpSecret: secreto, totpActivadoEn: null },
  });

  // El QR se genera aquí y se manda como imagen lista (data URI) en vez de
  // pintarlo en el navegador: así no hace falta una librería más en el bundle
  // del cliente, y el secreto no anda dando vueltas por el DOM más de lo justo.
  const uri = await uriParaApp(usuario.email, secreto);
  const qr = await QRCode.toDataURL(uri, { width: 240, margin: 1 });

  return NextResponse.json({
    secreto,
    uri,
    qr,
    instrucciones:
      "Escanea el código con tu aplicación de autenticación y luego confirma con el código de 6 dígitos que te muestre.",
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await usuarioDeSesion(session.user.tenantId, session.user.id);
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!usuario.totpSecret) {
    return NextResponse.json({ error: "Primero empieza la activación" }, { status: 400 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const codigo = typeof cuerpo?.codigo === "string" ? cuerpo.codigo : "";

  if (!(await codigoValido(codigo, usuario.totpSecret))) {
    return NextResponse.json(
      { error: "El código no es válido. Revisa que la hora de tu teléfono esté correcta." },
      { status: 400 }
    );
  }

  // Los códigos de respaldo se muestran UNA vez y se guardan hasheados.
  const { enClaro, hasheados } = await generarCodigosRespaldo();

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { totpActivadoEn: new Date(), codigosRespaldo: hasheados },
  });

  await registrarAuditoria({
    tenantId: session.user.tenantId,
    usuario: session.user,
    accion: "CAMBIAR_CONFIGURACION",
    entidad: "Usuario",
    entidadId: usuario.id,
    descripcion: "Activó la verificación en dos pasos",
    peticion: request,
  });

  return NextResponse.json({
    activa: true,
    codigosRespaldo: enClaro,
    aviso:
      "Guarda estos códigos en un lugar seguro. Son la única forma de entrar si pierdes el teléfono, y no se volverán a mostrar.",
  });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const usuario = await usuarioDeSesion(session.user.tenantId, session.user.id);
  if (!usuario) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (!tieneDosFactores(usuario)) {
    return NextResponse.json({ error: "No la tienes activa" }, { status: 400 });
  }

  // Se exige un código para desactivar: si no, bastaría con dejar una sesión
  // abierta un momento para que alguien le quite el segundo factor a otro.
  const cuerpo = await request.json().catch(() => ({}));
  const codigo = typeof cuerpo?.codigo === "string" ? cuerpo.codigo : "";

  if (!(await codigoValido(codigo, usuario.totpSecret!))) {
    return NextResponse.json({ error: "El código no es válido" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { totpSecret: null, totpActivadoEn: null, codigosRespaldo: [] },
  });

  await registrarAuditoria({
    tenantId: session.user.tenantId,
    usuario: session.user,
    accion: "CAMBIAR_CONFIGURACION",
    entidad: "Usuario",
    entidadId: usuario.id,
    descripcion: "Desactivó la verificación en dos pasos",
    peticion: request,
  });

  return NextResponse.json({ activa: false });
}
