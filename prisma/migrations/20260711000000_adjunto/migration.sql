CREATE TABLE IF NOT EXISTS "adjuntos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "datos" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoBy" TEXT,
    "tenantId" TEXT NOT NULL,
    "empresaId" TEXT,
    "contactoId" TEXT,
    "oportunidadId" TEXT,

    CONSTRAINT "adjuntos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "adjuntos_tenantId_idx" ON "adjuntos"("tenantId");
CREATE INDEX IF NOT EXISTS "adjuntos_empresaId_idx" ON "adjuntos"("empresaId");
CREATE INDEX IF NOT EXISTS "adjuntos_contactoId_idx" ON "adjuntos"("contactoId");
CREATE INDEX IF NOT EXISTS "adjuntos_oportunidadId_idx" ON "adjuntos"("oportunidadId");

ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "adjuntos" ADD CONSTRAINT "adjuntos_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE CASCADE ON UPDATE CASCADE;
