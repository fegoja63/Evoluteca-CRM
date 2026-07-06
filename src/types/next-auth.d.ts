import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol?: string;
    tenantId?: string;
    tenantNombre?: string;
    aceptoTerminosEn?: string | null;
  }

  interface Session {
    user: {
      id: string;
      rol: string;
      tenantId: string;
      tenantNombre: string;
      aceptoTerminosEn?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    rol?: string;
    tenantId?: string;
    tenantNombre?: string;
    aceptoTerminosEn?: string | null;
  }
}
