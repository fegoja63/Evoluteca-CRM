-- Unicidad de radicado por tenant (evita dos expedientes con el mismo número)
DO $$ BEGIN
  ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_tenantId_numeroRadicado_key" UNIQUE ("tenantId", "numeroRadicado");
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índice compuesto para el patrón de consulta real (cron diario + dashboard):
-- tenantId + estado='PENDIENTE' + fechaLimite <= X
CREATE INDEX IF NOT EXISTS "terminos_expediente_tenantId_estado_fechaLimite_idx"
  ON "terminos_expediente"("tenantId", "estado", "fechaLimite");

-- RegistroHoras.usuarioId pasa de obligatorio+Cascade a opcional+SetNull: si se
-- borra un usuario, sus registros de horas ya facturadas no deben desaparecer,
-- solo perder la referencia al abogado.
ALTER TABLE "registros_horas" ALTER COLUMN "usuarioId" DROP NOT NULL;

ALTER TABLE "registros_horas" DROP CONSTRAINT IF EXISTS "registros_horas_usuarioId_fkey";

ALTER TABLE "registros_horas"
  ADD CONSTRAINT "registros_horas_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
