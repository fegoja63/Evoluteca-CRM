-- Correo bidireccional: registro de correos ligados a cliente/contacto/oportunidad.
-- PR 1 llena solo los SALIENTES (redactados desde el CRM). PR 2 (entrante) usará
-- la misma tabla con direccion = 'RECIBIDO'.

CREATE TYPE "DireccionCorreo" AS ENUM ('ENVIADO', 'RECIBIDO');

CREATE TABLE "correos_registrados" (
    "id" TEXT NOT NULL,
    "direccion" "DireccionCorreo" NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "proveedorMessageId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "empresaId" TEXT,
    "contactoId" TEXT,
    "oportunidadId" TEXT,
    CONSTRAINT "correos_registrados_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "correos_registrados_tenantId_idx" ON "correos_registrados"("tenantId");
CREATE INDEX "correos_registrados_contactoId_idx" ON "correos_registrados"("contactoId");
CREATE INDEX "correos_registrados_empresaId_idx" ON "correos_registrados"("empresaId");
CREATE INDEX "correos_registrados_oportunidadId_idx" ON "correos_registrados"("oportunidadId");

ALTER TABLE "correos_registrados" ADD CONSTRAINT "correos_registrados_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "correos_registrados" ADD CONSTRAINT "correos_registrados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "correos_registrados" ADD CONSTRAINT "correos_registrados_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "correos_registrados" ADD CONSTRAINT "correos_registrados_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
