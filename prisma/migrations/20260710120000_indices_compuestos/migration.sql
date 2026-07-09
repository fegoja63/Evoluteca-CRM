-- CreateIndex
CREATE INDEX IF NOT EXISTS "empresas_tenantId_creadoEn_idx" ON "empresas"("tenantId", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contactos_tenantId_creadoEn_idx" ON "contactos"("tenantId", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oportunidades_tenantId_creadoEn_idx" ON "oportunidades"("tenantId", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "oportunidades_tenantId_etapa_idx" ON "oportunidades"("tenantId", "etapa");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "actividades_tenantId_fecha_idx" ON "actividades"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "cotizaciones_tenantId_creadoEn_idx" ON "cotizaciones"("tenantId", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expedientes_tenantId_creadoEn_idx" ON "expedientes"("tenantId", "creadoEn");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "funciones_tenantId_fecha_idx" ON "funciones"("tenantId", "fecha");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "espectadores_tenantId_creadoEn_idx" ON "espectadores"("tenantId", "creadoEn");
