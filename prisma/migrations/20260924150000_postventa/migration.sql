-- Postventa (módulo opcional): etapa del tablero de postventa, fecha de
-- renovación y vínculo de una oportunidad de renovación con su negocio original.
CREATE TYPE "EtapaPostventa" AS ENUM ('ENTREGA', 'SEGUIMIENTO', 'RENOVACION', 'CERRADO');

ALTER TABLE "oportunidades" ADD COLUMN "postventaEtapa" "EtapaPostventa";
ALTER TABLE "oportunidades" ADD COLUMN "fechaRenovacion" TIMESTAMP(3);
ALTER TABLE "oportunidades" ADD COLUMN "origenRenovacionId" TEXT;

CREATE INDEX "oportunidades_tenantId_postventaEtapa_idx" ON "oportunidades"("tenantId", "postventaEtapa");

ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_origenRenovacionId_fkey" FOREIGN KEY ("origenRenovacionId") REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
