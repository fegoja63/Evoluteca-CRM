import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeEliminar } from "@/lib/permisos";
import { normalizarEmail, normalizarNombre, agruparDuplicados } from "@/lib/duplicados";

export const dynamic = "force-dynamic";

// Registro tal como lo devuelve la API (con los conteos de lo que quedaría
// re-apuntado si se fusiona), para que la pantalla muestre el "peso" de cada uno
// y ayude a elegir cuál conservar.
type RegistroDup = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  creadoEn: Date;
  detalle: string | null; // empresa (contacto) o sector (empresa), como pista
  conteos: Record<string, number> & { total: number };
};

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  // Fusionar es destructivo y cruza dueños (un duplicado puede ser de otro
  // comercial), así que la limpieza es solo para ADMIN/GERENTE.
  if (!puedeEliminar(session.user.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const tenantId = session.user.tenantId;
  const tipo = new URL(request.url).searchParams.get("tipo") ?? "contactos";
  if (tipo !== "contactos" && tipo !== "empresas") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  if (tipo === "contactos") {
    const contactos = await prisma.contacto.findMany({
      where: { tenantId, eliminadoEn: null },
      orderBy: { creadoEn: "asc" },
      select: {
        id: true, nombre: true, email: true, telefono: true, creadoEn: true,
        empresa: { select: { nombre: true } },
        _count: { select: { oportunidades: true, actividades: true, cotizaciones: true, eventosTimeline: true, adjuntos: true, correos: true } },
      },
    });

    const racimos = agruparDuplicados(contactos, (c) => [normalizarEmail(c.email), normalizarNombre(c.nombre)]);
    const salida = racimos.map((grupo) => ({
      registros: grupo.map<RegistroDup>((c) => {
        const cn = c._count;
        return {
          id: c.id, nombre: c.nombre, email: c.email, telefono: c.telefono, creadoEn: c.creadoEn,
          detalle: c.empresa?.nombre ?? null,
          conteos: {
            oportunidades: cn.oportunidades, actividades: cn.actividades, cotizaciones: cn.cotizaciones,
            correos: cn.correos, adjuntos: cn.adjuntos, timeline: cn.eventosTimeline,
            total: cn.oportunidades + cn.actividades + cn.cotizaciones + cn.correos + cn.adjuntos + cn.eventosTimeline,
          },
        };
      }),
    }));
    return NextResponse.json({ tipo, racimos: salida });
  }

  // tipo === "empresas"
  const empresas = await prisma.empresa.findMany({
    where: { tenantId, eliminadoEn: null },
    orderBy: { creadoEn: "asc" },
    select: {
      id: true, nombre: true, email: true, telefono: true, sector: true, creadoEn: true,
      _count: { select: { contactos: true, oportunidades: true, actividades: true, cotizaciones: true, eventosTimeline: true, expedientes: true, adjuntos: true, correos: true } },
    },
  });

  const racimos = agruparDuplicados(empresas, (e) => [normalizarNombre(e.nombre), normalizarEmail(e.email)]);
  const salida = racimos.map((grupo) => ({
    registros: grupo.map<RegistroDup>((e) => {
      const cn = e._count;
      return {
        id: e.id, nombre: e.nombre, email: e.email, telefono: e.telefono, creadoEn: e.creadoEn,
        detalle: e.sector ?? null,
        conteos: {
          contactos: cn.contactos, oportunidades: cn.oportunidades, actividades: cn.actividades,
          cotizaciones: cn.cotizaciones, correos: cn.correos, adjuntos: cn.adjuntos,
          expedientes: cn.expedientes, timeline: cn.eventosTimeline,
          total: cn.contactos + cn.oportunidades + cn.actividades + cn.cotizaciones + cn.correos + cn.adjuntos + cn.expedientes + cn.eventosTimeline,
        },
      };
    }),
  }));
  return NextResponse.json({ tipo, racimos: salida });
}
