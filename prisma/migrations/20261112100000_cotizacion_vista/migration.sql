-- AlterTable
ALTER TABLE "cotizaciones" ADD COLUMN     "vistaPrimeraEn" TIMESTAMP(3),
ADD COLUMN     "vistaUltimaEn" TIMESTAMP(3),
ADD COLUMN     "vistas" INTEGER NOT NULL DEFAULT 0;

