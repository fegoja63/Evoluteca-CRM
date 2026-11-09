-- La probabilidad de fábrica de Cotización (PROPUESTA) baja de 50 a 25.
-- Los negocios en Cotización que tienen el 50 de fábrica pasan a 25, salvo en
-- los tenants que ya configuraron su propio % para Cotización.
UPDATE "oportunidades" o SET "probabilidad" = 25
WHERE o."etapa" = 'PROPUESTA'
  AND o."probabilidad" = 50
  AND NOT EXISTS (
    SELECT 1 FROM "etapas_pipeline" e
    WHERE e."tenantId" = o."tenantId" AND e."key" = 'PROPUESTA' AND e."probabilidad" IS NOT NULL
  );
