-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limits" (
    "clave" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 1,
    "ventanaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("clave")
);
