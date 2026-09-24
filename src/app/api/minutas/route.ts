import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { guardarMinutaSchema } from "@/lib/minutas";

export const dynamic = "force-dynamic";

// Fecha "YYYY-MM-DD" a mediodía en Bogotá (evita que la zona horaria la corra
// al día anterior).
const aFechaBogota = (f: string, hora = "12:00") => new Date(`${f}T${hora}:00-05:00`);

// GET ?oportunidadId=… o ?empresaId=… — minutas de ese negocio o cliente.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const oportunidadId = searchParams.get("oportunidadId");
  const empresaId = searchParams.get("empresaId");
  if (!oportunidadId && !empresaId) return NextResponse.json({ error: "Falta la oportunidad o el cliente" }, { status: 400 });

  const minutas = await prisma.minuta.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(oportunidadId ? { oportunidadId } : { empresaId }),
    },
    orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
    take: 50,
    include: { oportunidad: { select: { id: true, titulo: true } } },
  });
  return NextResponse.json(minutas);
}

// POST — guarda la minuta que el usuario revisó. En una sola transacción:
// la minuta, la reunión como actividad completada, una tarea pendiente por
// cada compromiso de NOSOTROS marcado y el evento en la línea de tiempo del
// cliente.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = guardarMinutaSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const m = parsed.data;
  const tenantId = session.user.tenantId;
  const userId = session.user.id;

  let oportunidadId: string | null = null;
  let empresaId: string | null = null;
  let contactoId: string | null = null;
  if (m.oportunidadId) {
    const op = await prisma.oportunidad.findFirst({
      where: { id: m.oportunidadId, tenantId, eliminadoEn: null },
      select: { id: true, empresaId: true, contactoId: true },
    });
    if (!op) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });
    oportunidadId = op.id; empresaId = op.empresaId; contactoId = op.contactoId;
  } else if (m.empresaId) {
    const emp = await prisma.empresa.findFirst({ where: { id: m.empresaId, tenantId, eliminadoEn: null }, select: { id: true } });
    if (!emp) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    empresaId = emp.id;
  } else {
    return NextResponse.json({ error: "La minuta debe ser de una oportunidad o de un cliente." }, { status: 400 });
  }

  const tareas = m.compromisos.filter(c => c.lado === "NOSOTROS" && c.crearTarea);
  // Sin fecha, el compromiso queda para mañana: así la tarea nace vigente.
  const manana = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

  const minuta = await prisma.$transaction(async (tx) => {
    const reunion = await tx.actividad.create({
      data: {
        tipo: "REUNION",
        titulo: `Reunión: ${m.titulo}`.slice(0, 300),
        fecha: aFechaBogota(m.fecha),
        completada: true,
        estado: "COMPLETADA",
        notas: m.resumen.slice(0, 2000),
        tenantId, creadoBy: userId, responsableId: userId,
        oportunidadId, empresaId, contactoId,
      },
    });
    for (const c of tareas) {
      await tx.actividad.create({
        data: {
          tipo: "TAREA",
          titulo: c.descripcion.slice(0, 300),
          fecha: aFechaBogota(c.fecha ?? manana, "09:00"),
          notas: `Compromiso de la reunión "${m.titulo}"${c.responsable ? ` · Responsable: ${c.responsable}` : ""}`.slice(0, 2000),
          tenantId, creadoBy: userId, responsableId: userId,
          oportunidadId, empresaId, contactoId,
        },
      });
    }
    if (empresaId) {
      await tx.eventoTimeline.create({
        data: {
          tipo: "REUNION",
          titulo: `Minuta: ${m.titulo}`.slice(0, 300),
          descripcion: m.resumen.slice(0, 2000),
          tenantId, empresaId, contactoId,
        },
      });
    }
    return tx.minuta.create({
      data: {
        titulo: m.titulo,
        fecha: aFechaBogota(m.fecha),
        resumen: m.resumen,
        asistentes: m.asistentes,
        acuerdos: m.acuerdos,
        // crearTarea es una instrucción del formulario, no dato de la minuta.
        compromisos: m.compromisos.map(({ crearTarea: _crear, ...c }) => c),
        proximosPasos: m.proximosPasos,
        riesgos: m.riesgos,
        textoOriginal: m.textoOriginal ?? null,
        creadoBy: userId,
        tenantId, oportunidadId, empresaId,
        actividadId: reunion.id,
      },
    });
  });

  return NextResponse.json({ ...minuta, tareasCreadas: tareas.length }, { status: 201 });
}
