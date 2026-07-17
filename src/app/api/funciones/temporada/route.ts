import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearTemporadaSchema, MAX_FUNCIONES_TEMPORADA } from "@/lib/validations/funciones";
import { parseOrError } from "@/lib/validations/helpers";

// Crea en un solo paso todas las funciones de una temporada a partir de un
// patrón: recorre el rango [desde, hasta] día por día, y por cada fecha que
// caiga en un día de la semana marcado genera una función por cada horario.
// Cada función queda como una Funcion individual (misma tabla que "Registrar
// función"), editable por separado.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await request.json();
  const { data, error } = parseOrError(crearTemporadaSchema, body);
  if (error) return error;
  const { titulo, desde, hasta, dias, horarios, sillasTotales, sillasVendidas, canal, ingresoEstimado, notas } = data;

  // Se itera con componentes UTC para que el día de la semana coincida con la
  // fecha de calendario elegida, sin que la zona horaria del servidor corra un
  // día. La hora final se arma como string "YYYY-MM-DDTHH:mm" — el mismo
  // formato que produce el <input datetime-local> de "Registrar función", para
  // que ambos caminos guarden la fecha con idéntica semántica.
  const diasSet = new Set(dias);
  const fechas: Date[] = [];
  const cursor = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  const horariosUnicos = Array.from(new Set(horarios)).sort();

  for (; cursor <= fin; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    if (!diasSet.has(cursor.getUTCDay())) continue;
    const yyyy = cursor.getUTCFullYear();
    const mm = String(cursor.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getUTCDate()).padStart(2, "0");
    for (const h of horariosUnicos) {
      fechas.push(new Date(`${yyyy}-${mm}-${dd}T${h}`));
    }
    if (fechas.length > MAX_FUNCIONES_TEMPORADA) break;
  }

  if (fechas.length === 0) {
    return NextResponse.json({ error: "El patrón no genera ninguna función. Revisa el rango y los días seleccionados." }, { status: 400 });
  }
  if (fechas.length > MAX_FUNCIONES_TEMPORADA) {
    return NextResponse.json({ error: `La temporada generaría más de ${MAX_FUNCIONES_TEMPORADA} funciones. Acorta el rango o reduce los horarios.` }, { status: 400 });
  }

  const result = await prisma.funcion.createMany({
    data: fechas.map(fecha => ({
      titulo: titulo.trim(),
      fecha,
      sillasTotales: sillasTotales ?? 239,
      sillasVendidas: sillasVendidas ?? 0,
      canal: canal || "PLATAFORMA",
      ingresoEstimado: ingresoEstimado ?? null,
      notas: notas?.trim() || null,
      tenantId: session.user.tenantId,
    })),
  });

  return NextResponse.json({ creadas: result.count }, { status: 201 });
}
