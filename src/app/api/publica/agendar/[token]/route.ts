import { NextResponse } from "next/server";
import { usuarioDelEnlace, horariosDelEnlace } from "@/lib/agendar";
import { reservaSchema, reservarReunion } from "@/lib/agendar-reserva";
import { formatoFecha, formatoHora } from "@/lib/fecha-bogota";
import { permitirYRegistrar, obtenerIp } from "@/lib/rate-limit";
import { parseOrError } from "@/lib/validations/helpers";

// Enlace público para agendar una reunión (ver lib/agendar.ts). Sin sesión: el
// token del usuario es la credencial y se puede revocar desde Mi perfil.
export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const u = await usuarioDelEnlace(token);
  if (!u) return NextResponse.json({ error: "Este enlace ya no está disponible." }, { status: 404 });
  const { config, dias } = await horariosDelEnlace(u);
  return NextResponse.json({
    vendedor: u.nombre,
    empresa: { nombre: u.tenant.nombre, logoUrl: u.tenant.logoUrl, colorMarca: u.tenant.colorMarca },
    duracion: config.duracion,
    dias: dias.map(d => ({
      etiqueta: formatoFecha(d.fecha, { weekday: "long", day: "numeric", month: "long" }),
      horarios: d.horarios.map(h => ({ inicio: h.toISOString(), etiqueta: formatoHora(h) })),
    })),
  });
}

export async function POST(req: Request, props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  // Freno al abuso: pocas reservas por enlace y por IP en una hora.
  const ip = obtenerIp(req);
  const porEnlace = await permitirYRegistrar(`agendar:${token}`, 20, 60 * 60 * 1000);
  const porIp = await permitirYRegistrar(`agendar-ip:${ip}`, 5, 60 * 60 * 1000);
  if (!porEnlace || !porIp) return NextResponse.json({ error: "Demasiadas solicitudes. Intenta más tarde." }, { status: 429 });

  const { data, error } = parseOrError(reservaSchema, await req.json().catch(() => null));
  if (error) return error;
  const r = await reservarReunion(token, data);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true, inicio: r.inicio.toISOString(), etiqueta: formatoFecha(r.inicio, { weekday: "long", day: "numeric", month: "long" }) + ", " + formatoHora(r.inicio) }, { status: 201 });
}
