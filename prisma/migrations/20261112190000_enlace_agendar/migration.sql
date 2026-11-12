-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "agendaConfig" JSONB,
ADD COLUMN     "tokenAgenda" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tokenAgenda_key" ON "usuarios"("tokenAgenda");

