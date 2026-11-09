-- AlterTable
ALTER TABLE "etapas_pipeline" ADD COLUMN     "probabilidad" INTEGER;


-- Probabilidad por etapa: los negocios existentes toman la de su etapa
-- (valores de fábrica; ningún tenant tiene aún probabilidades configuradas).
UPDATE "oportunidades" SET "probabilidad" = CASE "etapa"
  WHEN 'PROSPECTO'   THEN 10
  WHEN 'CALIFICADO'  THEN 20
  WHEN 'PROPUESTA'   THEN 50
  WHEN 'NEGOCIACION' THEN 75
  WHEN 'GANADA'      THEN 100
  WHEN 'PERDIDA'     THEN 0
  ELSE "probabilidad"
END;
