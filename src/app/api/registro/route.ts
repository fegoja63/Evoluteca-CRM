import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registroSchema } from "@/lib/validations/auth";
import { generarSlugUnico } from "@/lib/slug";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registroSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { nombreEmpresa, nombreUsuario, email, password } = parsed.data;

    const existente = await prisma.usuario.findUnique({ where: { email } });
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo. Inicia sesión." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const slug = generarSlugUnico(nombreEmpresa);

    const resultado = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tenant = await tx.tenant.create({
        data: {
          nombre: nombreEmpresa,
          slug,
        },
      });

      const usuario = await tx.usuario.create({
        data: {
          nombre: nombreUsuario,
          email,
          passwordHash,
          rol: "ADMINISTRADOR",
          tenantId: tenant.id,
        },
      });

      return { tenant, usuario };
    });

    return NextResponse.json(
      {
        ok: true,
        tenantId: resultado.tenant.id,
        usuarioId: resultado.usuario.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "No pudimos crear tu cuenta. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
