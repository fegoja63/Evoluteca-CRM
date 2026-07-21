import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Base64 en DB, igual que Tenant.logoUrl — sin servicio de storage externo.
// El dato codificado en base64 pesa ~33% más que el archivo original.
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Bytes reales que ocupa un data URI, calculados desde su contenido.
 *
 * Devuelve null si no tiene forma de data URI con base64. No se decodifica el
 * archivo entero solo para medirlo: de la longitud del base64 se deduce el
 * tamano exacto (cada 4 caracteres son 3 bytes, menos el relleno final).
 */
function tamanoDeDataUri(dataUri: string): number | null {
  const coma = dataUri.indexOf(",");
  if (coma === -1) return null;

  const base64 = dataUri.slice(coma + 1);
  if (!base64) return null;

  const relleno = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - relleno;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const empresaId = searchParams.get("empresaId");
  const contactoId = searchParams.get("contactoId");
  const oportunidadId = searchParams.get("oportunidadId");
  if (!empresaId && !contactoId && !oportunidadId) {
    return NextResponse.json({ error: "Falta empresaId, contactoId u oportunidadId" }, { status: 400 });
  }

  const adjuntos = await prisma.adjunto.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(empresaId ? { empresaId } : {}),
      ...(contactoId ? { contactoId } : {}),
      ...(oportunidadId ? { oportunidadId } : {}),
    },
    // Sin "datos" en la lista — el base64 completo solo se pide al descargar
    // un adjunto puntual, para no inflar el listado.
    select: { id: true, nombre: true, tipo: true, tamano: true, creadoEn: true },
    orderBy: { creadoEn: "desc" },
  });

  return NextResponse.json(adjuntos);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { nombre, tipo, tamano, datos, empresaId, contactoId, oportunidadId } = body ?? {};

  if (!nombre?.trim() || !tipo?.trim() || typeof tamano !== "number" || !datos?.startsWith("data:")) {
    return NextResponse.json({ error: "Datos de archivo inválidos" }, { status: 400 });
  }
  // Se mide el contenido REAL, no el "tamano" que declara el cliente.
  //
  // Antes se comparaba `tamano > MAX_BYTES`, y ese numero viene del cuerpo de
  // la peticion: quien sube el archivo podia declarar 100 bytes y mandar uno
  // mucho mayor. El limite no se estaba aplicando, y aqui los adjuntos se
  // guardan DENTRO de la base: si esa tabla crece de golpe, el CRM deja de
  // funcionar para todos los clientes, no solo para quien subio el archivo.
  const bytesReales = tamanoDeDataUri(datos);
  if (bytesReales === null) {
    return NextResponse.json({ error: "El archivo no se pudo leer" }, { status: 400 });
  }
  if (bytesReales > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 5MB" }, { status: 400 });
  }
  const destinos = [empresaId, contactoId, oportunidadId].filter(Boolean);
  if (destinos.length !== 1) {
    return NextResponse.json({ error: "El adjunto debe pertenecer a exactamente un cliente, contacto u oportunidad" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  if (empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, tenantId, eliminadoEn: null } });
    if (!empresa) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  if (contactoId) {
    const contacto = await prisma.contacto.findFirst({ where: { id: contactoId, tenantId, eliminadoEn: null } });
    if (!contacto) return NextResponse.json({ error: "Contacto no encontrado" }, { status: 404 });
  }
  if (oportunidadId) {
    const oportunidad = await prisma.oportunidad.findFirst({ where: { id: oportunidadId, tenantId, eliminadoEn: null } });
    if (!oportunidad) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
  }

  const adjunto = await prisma.adjunto.create({
    data: {
      nombre: nombre.trim(),
      tipo: tipo.trim(),
      // El medido, no el declarado: si se guardara el del cliente, cualquier
      // cuenta de almacenamiento partiria de un dato que el cliente controla.
      tamano: bytesReales,
      datos,
      tenantId,
      creadoBy: session.user.id,
      empresaId: empresaId || null,
      contactoId: contactoId || null,
      oportunidadId: oportunidadId || null,
    },
    select: { id: true, nombre: true, tipo: true, tamano: true, creadoEn: true },
  });

  return NextResponse.json(adjunto, { status: 201 });
}
