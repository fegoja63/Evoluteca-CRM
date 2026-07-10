import { NextResponse } from "next/server";
import type { z } from "zod";

// Reduce el boilerplate de "parsear con Zod o devolver 400" repetido en cada
// ruta, manteniendo la misma forma de error ({ error: "..." }, 400) que ya
// usa el resto de la API a mano.
export function parseOrError<T extends z.ZodTypeAny>(schema: T, body: unknown):
  | { data: z.infer<T>; error: null }
  | { data: null; error: NextResponse } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      data: null,
      error: NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 }),
    };
  }
  return { data: parsed.data, error: null };
}
