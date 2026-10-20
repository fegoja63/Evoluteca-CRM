-- AlterTable
ALTER TABLE "finanzas_supuestos_caja" ADD COLUMN     "ingresosRecurrentes" DECIMAL(16,2) NOT NULL DEFAULT 0,
ADD COLUMN     "plazoRecurrentes" INTEGER NOT NULL DEFAULT 30;

