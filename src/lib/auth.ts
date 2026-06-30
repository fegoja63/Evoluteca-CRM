import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { tenant: true },
        });

        if (!usuario || !usuario.activo) return null;
        if (!usuario.tenant.activo) return null;

        const passwordValida = await bcrypt.compare(
          password,
          usuario.passwordHash
        );
        if (!passwordValida) return null;

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          tenantId: usuario.tenantId,
          tenantNombre: usuario.tenant.nombre,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.rol = user.rol;
        token.tenantId = user.tenantId;
        token.tenantNombre = user.tenantNombre;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.rol = token.rol as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantNombre = token.tenantNombre as string;
      }
      return session;
    },
  },
});
