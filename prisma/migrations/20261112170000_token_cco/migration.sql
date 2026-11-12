-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "tokenCco" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tokenCco_key" ON "usuarios"("tokenCco");

