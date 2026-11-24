import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { estaBloqueado, registrarIntentoFallido, limpiarIntentos } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/auditoria";
import { tieneDosFactores, codigoValido, consumirCodigoRespaldo } from "@/lib/dos-factores";
import { estadoSesion } from "@/lib/sesion-vigente";

const VENTANA_LOGIN_MS = 15 * 60 * 1000; // 15 minutos
const MAX_INTENTOS_LOGIN = 5;

/**
 * Señal para que el formulario de login pida el código del segundo factor.
 *
 * Tiene que ser una CredentialsSignin: NextAuth envuelve cualquier otro error
 * y el navegador solo recibe un "credenciales inválidas" genérico. Solo el
 * `code` de esta clase llega al cliente.
 *
 * Que ese código revele "aquí hace falta un segundo factor" no filtra nada
 * util: para llegar hasta aqui hay que haber acertado ya la contraseña, y es
 * como funciona cualquier login de dos pasos.
 */
class SegundoFactorRequerido extends CredentialsSignin {
  code = "segundo_factor_requerido";
}

/**
 * Señal de que la empresa (tenant) está suspendida —por ejemplo, por pago
 * pendiente—. Se lanza SOLO después de validar la contraseña, igual que el
 * segundo factor: así un extraño no puede averiguar si una cuenta está
 * suspendida probando correos; solo el propio cliente, que sí conoce su clave,
 * ve el aviso y la opción de escribirnos.
 */
class CuentaSuspendida extends CredentialsSignin {
  code = "cuenta_suspendida";
}

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
      authorize: async (credentials, request) => {
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

        const passwordValida = await bcrypt.compare(
          password,
          usuario.passwordHash
        );
        if (!passwordValida) {
          await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
          return null;
        }

        // Empresa suspendida (p. ej. por pago pendiente): se comprueba DESPUÉS
        // de la contraseña a propósito —igual que el segundo factor— para no
        // revelar a un extraño si una cuenta existe/está suspendida. No cuenta
        // como intento fallido: la clave era correcta, la cuenta solo está en
        // pausa. El formulario mostrará el aviso y un botón para escribirnos.
        if (!usuario.tenant.activo) {
          throw new CuentaSuspendida();
        }

        // Segundo factor, solo para quien lo tenga activo. Se comprueba
        // DESPUÉS de la contraseña a propósito: así un atacante que solo
        // prueba códigos no descubre por el camino si acertó la contraseña.
        if (tieneDosFactores(usuario)) {
          if (!codigoSegundoFactor) {
            await registrarIntentoFallido(clave, VENTANA_LOGIN_MS);
            throw new SegundoFactorRequerido();
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

        // Queda en la auditoría del cliente y alimenta la "salud de uso" del
        // panel interno. registrarAuditoria nunca lanza: no frena el ingreso.
        await registrarAuditoria({
          tenantId: usuario.tenantId,
          usuario: { id: usuario.id, email: usuario.email, name: usuario.nombre, rol: usuario.rol },
          accion: "INICIAR_SESION",
          entidad: "Usuario",
          entidadId: usuario.id,
          peticion: request instanceof Request ? request : null,
        });

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
      // Sesión ya iniciada: se revisa contra la base (con 60 s de caché, ver
      // lib/sesion-vigente) que el usuario y su empresa sigan activos. Si no,
      // devolver null cierra la sesión: un usuario desactivado o borrado, o
      // una empresa suspendida o borrada, pierde el acceso de inmediato y no
      // cuando venza el token. De paso, un cambio de rol aplica sin volver a
      // iniciar sesión. Si la base falla, no se saca a nadie por un corte.
      // En el middleware (Edge) Prisma no corre: ahí solo se mira que haya
      // sesión, y la revisión la hacen la página y la API, que corren en Node.
      if (!user && token.sub && token.tenantId && process.env.NEXT_RUNTIME !== "edge") {
        try {
          const estado = await estadoSesion(token.sub, token.tenantId as string);
          if (!estado.vigente) return null;
          token.rol = estado.rol;
          token.tenantNombre = estado.tenantNombre;
        } catch (e) {
          console.error("[auth] no se pudo revisar la sesión:", (e as Error).message);
        }
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
