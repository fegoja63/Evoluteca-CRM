-- AlterTable
ALTER TABLE "oportunidades" ADD COLUMN IF NOT EXISTS "salonId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oportunidades_salonId_fechaEvento_idx" ON "oportunidades"("salonId", "fechaEvento");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "oportunidades" ADD CONSTRAINT "oportunidades_salonId_fkey"
    FOREIGN KEY ("salonId") REFERENCES "salones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
