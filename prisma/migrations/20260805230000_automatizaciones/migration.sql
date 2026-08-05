-- Motor de automatizaciones: reglas "cuando pasa X → haz Y" por tenant.

CREATE TYPE "EventoAutomatizacion" AS ENUM ('OPORTUNIDAD_CAMBIA_ETAPA', 'OPORTUNIDAD_CREADA');
CREATE TYPE "AccionAutomatizacion" AS ENUM ('CREAR_TAREA', 'ENVIAR_CORREO');

CREATE TABLE "automatizaciones" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "evento" "EventoAutomatizacion" NOT NULL,
    "etapaDestino" TEXT,
    "accion" "AccionAutomatizacion" NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "vecesEjecutada" INTEGER NOT NULL DEFAULT 0,
    "ultimaEjecucion" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantId" TEXT NOT NULL,
    CONSTRAINT "automatizaciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "automatizaciones_tenantId_evento_activa_idx" ON "automatizaciones"("tenantId", "evento", "activa");

ALTER TABLE "automatizaciones" ADD CONSTRAINT "automatizaciones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
