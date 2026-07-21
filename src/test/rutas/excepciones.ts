/**
 * Las rutas que NO exigen una sesion de usuario, con el motivo escrito.
 *
 * El barrido recorre las 115 rutas del disco y exige 401 a todas. Las que
 * aparecen aqui quedan exentas — pero exentas CON motivo y CON el guardian
 * alternativo declarado, para que la exencion sea una decision revisable en
 * lugar de un olvido silencioso.
 *
 * Agregar una ruta aqui deberia costar una discusion. Ese es el punto.
 */

export type Exencion = {
  /** Que protege la ruta en lugar de la sesion. */
  guardian: string;
  motivo: string;
};

export const RUTAS_SIN_SESION: Record<string, Exencion> = {
  "/api/auth/forgot-password": {
    guardian: "ninguno (por diseno) + limite por IP",
    motivo:
      "Quien olvido su contrasena no puede tener sesion. Responde igual exista o no el correo, para no revelar quien esta registrado.",
  },
  "/api/auth/reset-password": {
    guardian: "token de un solo uso con vencimiento",
    motivo: "Se llega desde el enlace del correo, sin sesion. El token es la credencial.",
  },
  "/api/registro": {
    guardian: "ADMIN_REGISTRO_SECRET",
    motivo: "Crea tenants nuevos. Lo usa Evoluteca, no los clientes.",
  },
  "/api/admin-evoluteca/errores": {
    guardian: "ADMIN_REGISTRO_SECRET (cabecera x-admin-secret) + limite por IP",
    motivo: "Panel interno de Evoluteca: por definicion ve todos los tenants.",
  },
  "/api/admin-evoluteca/tenants": {
    guardian: "ADMIN_REGISTRO_SECRET (cabecera x-admin-secret) + limite por IP",
    motivo: "Panel interno de Evoluteca: por definicion ve todos los tenants.",
  },
  "/api/admin-evoluteca/tenants/[id]": {
    guardian: "ADMIN_REGISTRO_SECRET (cabecera x-admin-secret) + limite por IP",
    motivo: "Panel interno de Evoluteca: por definicion ve todos los tenants.",
  },
  "/api/cron/notificaciones": {
    guardian: "CRON_SECRET",
    motivo: "La invoca el cron de Vercel, que no tiene sesion de usuario.",
  },
  "/api/cron/respaldo": {
    guardian: "CRON_SECRET",
    motivo:
      "La invoca el cron de Vercel, que no tiene sesion de usuario. Falla cerrado: sin CRON_SECRET configurado responde 503 y no atiende a nadie.",
  },
  "/api/publico/leads": {
    guardian: "Tenant.apiKeyLeads",
    motivo:
      "Entrada de prospectos desde el sitio web del cliente. La llave identifica al tenant y es revocable.",
  },
  "/api/publica/cotizacion/[token]": {
    guardian: "token por cotizacion, revocable",
    motivo: "El cliente final abre su cotizacion desde un enlace, sin cuenta en el CRM.",
  },
  "/api/calendario/[token]": {
    guardian: "Usuario.tokenCalendario, revocable",
    motivo:
      "Google/Outlook se suscriben al .ics sin poder iniciar sesion. Solo lectura y solo lo que el usuario ya podia ver.",
  },
  "/api/errores": {
    guardian: "limite por IP (40 por minuto) + campos recortados",
    motivo:
      "Recibe errores del navegador, incluidos los de la pantalla de login donde todavia no hay sesion. Si hay sesion la adjunta como contexto, pero no la exige. Nunca lanza: un fallo aqui no debe generar mas ruido.",
  },
  "/api/ping": {
    guardian: "ninguno (no hace falta)",
    motivo: "Comprobacion de vida. No lee ni escribe datos de negocio.",
  },
};

/**
 * Rutas que el barrido no invoca en absoluto, con su motivo.
 *
 * Es una lista deliberadamente corta: cada entrada es superficie sin cubrir.
 */
export const RUTAS_NO_INVOCADAS: Record<string, string> = {
  "/api/auth/[...nextauth]": "Lo maneja NextAuth; no exporta handlers propios que probar.",
};
