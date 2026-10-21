-- AlterTable
ALTER TABLE "finanzas_supuestos_caja" ADD COLUMN     "diaImpuestos" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN     "ivaBimestral" DECIMAL(16,2) NOT NULL DEFAULT 0;

