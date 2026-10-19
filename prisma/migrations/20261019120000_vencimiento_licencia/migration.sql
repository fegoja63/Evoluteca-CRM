-- Vencimiento de licencia por tenant + día del aviso a Evoluteca.
ALTER TABLE "tenants" ADD COLUMN     "licenciaAvisadaEn" TIMESTAMP(3),
ADD COLUMN     "licenciaAvisoEn" TIMESTAMP(3),
ADD COLUMN     "licenciaVenceEn" TIMESTAMP(3);
