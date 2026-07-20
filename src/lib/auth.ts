import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { estaBloqueado, registrarIntentoFallido, limpiarIntentos } from "@/lib/rate-limit";
import { tieneDosFactores, codigoValido, consumirCodigoRespaldo } from "@/lib/dos-factores";

const VENTANA_LOGIN_MS = 15 * 60 * 1000; // 15 minutos
const MAX_INTENTOS_LOGIN = 5;

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 12 * 60 * 60, updateAge: 60 * 60 }, // 12h de sesión, se renueva cada hora de uso activo
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
        // Segundo factor. Solo se exige a quien lo tenga activo; el resto
        // entra igual que siempre.
        codigo: { label: "Código de verificación", type: "text" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const codigoSegundoFactor =
          typeof credentials?.codigo === "string" ? credentials.codigo : "";

        const { email, password } = parsed.data;
        const clave = `login:${email.toLowerCase()}`;

        // 5 intentos fallidos en 15 minutos bloquean el correo temporalmente,
        // sin importar si la contraseña que sigue mandando es correcta o no —
        // así se frena tanto fuerza bruta como intentos de adivinar.
        if (await estaBloqueado(clave, MAX_INTENTOS_LOGIN, VENTANA_LOGIN_MS)) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { tenant: true },
        });

        if (!usuario || !usuario.activo) {
          await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
          return null;
        }
        if (!usuario.tenant.activo) {
          await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
          return null;
        }

        const passwordValida = await bcrypt.compare(
          password,
          usuario.passwordHash
        );
        if (!passwordValida) {
          await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
          return null;
        }

        // Segundo factor, solo para quien lo tenga activo. Se comprueba
        // DESPUÉS de la contraseña a propósito: así un atacante que solo
        // prueba códigos no descubre por el camino si acertó la contraseña.
        if (tieneDosFactores(usuario)) {
          if (!codigoSegundoFactor) {
            await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
            // Señal para que el formulario pida el código. No revela nada que
            // el atacante no supiera ya: para llegar aquí necesitaba la
            // contraseña correcta.
            throw new Error("SE_REQUIERE_SEGUNDO_FACTOR");
          }

          const valido = await codigoValido(codigoSegundoFactor, usuario.totpSecret!);

          if (!valido) {
            // Puede ser un código de respaldo, para quien perdió el teléfono.
            const { valido: esRespaldo, restantes } = await consumirCodigoRespaldo(
              codigoSegundoFactor,
              usuario.codigosRespaldo
            );

            if (!esRespaldo) {
              await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
              return null;
            }

            // Un código de respaldo es de un solo uso: se gasta al entrar.
            await prisma.usuario.update({
              where: { id: usuario.id },
              data: { codigosRespaldo: restantes },
            });
          }
        }

        await limpiarIntentos(clave);

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          tenantId: usuario.tenantId,
          tenantNombre: usuario.tenant.nombre,
          aceptoTerminosEn: usuario.aceptoTerminosEn?.toISOString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.rol = user.rol;
        token.tenantId = user.tenantId;
        token.tenantNombre = user.tenantNombre;
        token.aceptoTerminosEn = user.aceptoTerminosEn ?? null;
      }
      // Se dispara cuando el cliente llama a update({...}) tras editar "Mi perfil" —
      // sin esto, el nombre/email quedaban congelados en el token del login inicial
      // hasta que el usuario cerraba sesión y volvía a entrar.
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.rol = token.rol as string;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantNombre = token.tenantNombre as string;
        session.user.aceptoTerminosEn = (token.aceptoTerminosEn as string | null) ?? null;
      }
      return session;
    },
  },
});
