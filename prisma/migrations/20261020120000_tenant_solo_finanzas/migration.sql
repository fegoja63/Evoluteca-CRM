-- Cuenta "solo Finanzas" (Gerente Financiero sin el CRM).
ALTER TABLE "tenants" ADD COLUMN     "soloFinanzas" BOOLEAN NOT NULL DEFAULT false;
