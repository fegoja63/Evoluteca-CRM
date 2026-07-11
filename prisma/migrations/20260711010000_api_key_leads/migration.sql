ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "apiKeyLeads" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_apiKeyLeads_key" ON "tenants"("apiKeyLeads");
