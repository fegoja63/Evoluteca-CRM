-- AlterTable: add reset token fields to usuarios
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);

-- CreateIndex: unique constraint on resetToken
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_resetToken_key" ON "usuarios"("resetToken");
