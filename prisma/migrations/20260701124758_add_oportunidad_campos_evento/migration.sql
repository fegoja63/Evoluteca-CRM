-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "contactoId" TEXT,
ADD COLUMN     "fechaValidez" TIMESTAMP(3),
ADD COLUMN     "oportunidadId" TEXT;

-- AlterTable
ALTER TABLE "oportunidades" ADD COLUMN     "costo" DECIMAL(12,2),
ADD COLUMN     "fechaCierre" TIMESTAMP(3),
ADD COLUMN     "fechaEvento" TIMESTAMP(3),
ADD COLUMN     "origenLead" TEXT,
ADD COLUMN     "recurrente" BOOLEAN,
ADD COLUMN     "sede" TEXT,
ADD COLUMN     "segmento" TEXT;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_contactoId_fkey" FOREIGN KEY ("contactoId") REFERENCES "contactos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "oportunidades"("id") ON DELETE SET NULL ON UPDATE CASCADE;
