-- Un 50 guardado en etapas_pipeline para Cotización es el de fábrica que la
-- pantalla de Configuración guardaba junto con cualquier otro cambio: se
-- vuelve a null (= de fábrica, ahora 25) y esos negocios en Cotización con 50
-- pasan también a 25.
UPDATE "etapas_pipeline" SET "probabilidad" = NULL WHERE "key" = 'PROPUESTA' AND "probabilidad" = 50;

UPDATE "oportunidades" o SET "probabilidad" = 25
WHERE o."etapa" = 'PROPUESTA'
  AND o."probabilidad" = 50
  AND NOT EXISTS (
    SELECT 1 FROM "etapas_pipeline" e
    WHERE e."tenantId" = o."tenantId" AND e."key" = 'PROPUESTA' AND e."probabilidad" IS NOT NULL
  );
