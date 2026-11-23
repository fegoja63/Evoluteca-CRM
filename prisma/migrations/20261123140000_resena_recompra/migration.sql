-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "resenaRecompraConfig" JSONB;

-- AlterTable
ALTER TABLE "oportunidades" ADD COLUMN     "recompraAvisadaEn" TIMESTAMP(3),
ADD COLUMN     "resenaPedidaEn" TIMESTAMP(3);

