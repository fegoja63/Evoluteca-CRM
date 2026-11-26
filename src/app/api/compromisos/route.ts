import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { esComercial } from "@/lib/permisos";
import { parseOrError } from "@/lib/validations/helpers";
import { compromisoSemanalSchema } from "@/lib/validations/compromisos";
import {
  aConteo, cumplimiento, lunesDe, moverSemana, semanaValida, textoSemana, tieneAlgo, CLAVES,
} from "@/lib/actividad-semanal";
import { actividadReal } from "@/lib/actividad-semanal-carga";

export const dynamic = "force-dynamic";

// Reunión semanal: por vendedor, la meta de actividad, el compromiso de la
// semana y lo que lleva hecho, más el resultado de la semana anterior
// (prometido frente a hecho). Un COMERCIAL solo se ve a sí mismo.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { tenantId, rol, id: userId } = session.user;

  const pedida = new URL(req.url).searchParams.get("semana");
  if (pedida !== null && !semanaValida(pedida)) {
    return NextResponse.json({ error: "Semana inválida: use la fecha de su lunes (AAAA-MM-DD)" }, { status: 400 });
  }
  const actual = lunesDe();
  const semana = pedida ?? actual;
  const anterior = moverSemana(semana, -1);

  const usuarios = await prisma.usuario.findMany({
    where: { tenantId, activo: true, ...(esComercial(rol) ? { id: userId } : {}) },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });
  const ids = usuarios.map(u => u.id);

  const [metas, compromisos, real, realAnterior] = await Promise.all([
    prisma.metaActividad.findMany({ where: { tenantId, userId: { in: ids } } }),
    prisma.compromisoSemanal.findMany({ where: { tenantId, userId: { in: ids }, semana: { in: [semana, anterior] } } }),
    actividadReal(tenantId, semana, ids),
    actividadReal(tenantId, anterior, ids),
  ]);

  const vendedores = usuarios.map(u => {
    const meta = metas.find(m => m.userId === u.id);
    const comp = compromisos.find(c => c.userId === u.id && c.semana === semana);
    const compAnt = compromisos.find(c => c.userId === u.id && c.semana === anterior);
    const prometidoAnt = compAnt ? aConteo(compAnt) : null;
    return {
      id: u.id,
      nombre: u.nombre,
      meta: meta ? aConteo(meta) : null,
      compromiso: comp ? { ...aConteo(comp), nota: comp.nota } : null,
      real: real.get(u.id)!,
      anterior: {
        compromiso: compAnt ? { ...prometidoAnt!, nota: compAnt.nota } : null,
        real: realAnterior.get(u.id)!,
        cumplimiento: prometidoAnt && tieneAlgo(prometidoAnt) ? cumplimiento(prometidoAnt, realAnterior.get(u.id)!) : null,
      },
    };
  });

  return NextResponse.json({
    semana, texto: textoSemana(semana), esActual: semana === actual,
    anterior, textoAnterior: textoSemana(anterior),
    puedeEditarMetas: !esComercial(rol),
    // Se puede registrar el compromiso de esta semana o de la siguiente (para
    // una reunión el viernes); las pasadas quedan como historia.
    editable: semana === actual || semana === moverSemana(actual, 1),
    vendedores,
  });
}

// Registra (o corrige) el compromiso de una semana. El vendedor registra el
// suyo; el administrador o el gerente pueden registrarlo por cualquiera (en la
// reunión).
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { tenantId, rol, id: yo } = session.user;

  const { data, error } = parseOrError(compromisoSemanalSchema, await req.json().catch(() => null));
  if (error) return error;

  if (esComercial(rol) && data.userId !== yo) {
    return NextResponse.json({ error: "Solo puede registrar su propio compromiso" }, { status: 403 });
  }
  const actual = lunesDe();
  const semana = data.semana ?? actual;
  if (!semanaValida(semana)) return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  if (semana !== actual && semana !== moverSemana(actual, 1)) {
    return NextResponse.json({ error: "Solo se puede registrar el compromiso de esta semana o de la siguiente" }, { status: 400 });
  }
  const usuario = await prisma.usuario.findFirst({ where: { id: data.userId, tenantId, activo: true }, select: { id: true } });
  if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const valores = { ...Object.fromEntries(CLAVES.map(k => [k, data[k]])), nota: data.nota?.trim() || null };
  if (!CLAVES.some(k => data[k] > 0) && !valores.nota) {
    // Todo en cero y sin nota: se retira el compromiso.
    await prisma.compromisoSemanal.deleteMany({ where: { tenantId, userId: data.userId, semana } });
    return NextResponse.json({ ok: true, borrado: true });
  }
  const r = await prisma.compromisoSemanal.upsert({
    where: { tenantId_userId_semana: { tenantId, userId: data.userId, semana } },
    create: { tenantId, userId: data.userId, semana, creadoBy: yo, ...valores },
    update: valores,
  });
  return NextResponse.json({ ok: true, id: r.id });
}
