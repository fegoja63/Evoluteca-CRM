-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "EstadoExpediente" AS ENUM ('ACTIVO', 'ARCHIVADO', 'GANADO', 'PERDIDO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EstadoTermino" AS ENUM ('PENDIENTE', 'CUMPLIDO', 'VENCIDO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "expedientes" (
  "id"             TEXT NOT NULL,
  "numeroRadicado" TEXT NOT NULL,
  "juzgado"        TEXT,
  "tipoProceso"    TEXT,
  "contraparte"    TEXT NOT NULL,
  "estado"         "EstadoExpediente" NOT NULL DEFAULT 'ACTIVO',
  "notas"          TEXT,
  "creadoEn"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoBy"       TEXT,
  "tenantId"       TEXT NOT NULL,
  "empresaId"      TEXT,
  CONSTRAINT "expedientes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "terminos_expediente" (
  "id"           TEXT NOT NULL,
  "descripcion"  TEXT NOT NULL,
  "fechaLimite"  TIMESTAMP(3) NOT NULL,
  "estado"       "EstadoTermino" NOT NULL DEFAULT 'PENDIENTE',
  "notas"        TEXT,
  "creadoEn"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoBy"     TEXT,
  "expedienteId" TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  CONSTRAINT "terminos_expediente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "eventos_expediente" (
  "id"           TEXT NOT NULL,
  "tipo"         TEXT NOT NULL,
  "titulo"       TEXT NOT NULL,
  "descripcion"  TEXT,
  "creadoEn"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoBy"     TEXT,
  "tenantId"     TEXT NOT NULL,
  "expedienteId" TEXT NOT NULL,
  CONSTRAINT "eventos_expediente_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "registros_horas" (
  "id"           TEXT NOT NULL,
  "fecha"        TIMESTAMP(3) NOT NULL,
  "horas"        DECIMAL(5,2) NOT NULL,
  "descripcion"  TEXT,
  "creadoEn"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tenantId"     TEXT NOT NULL,
  "expedienteId" TEXT NOT NULL,
  "usuarioId"    TEXT NOT NULL,
  CONSTRAINT "registros_horas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "expedientes_tenantId_idx" ON "expedientes"("tenantId");
CREATE INDEX IF NOT EXISTS "expedientes_empresaId_idx" ON "expedientes"("empresaId");

CREATE INDEX IF NOT EXISTS "terminos_expediente_expedienteId_idx" ON "terminos_expediente"("expedienteId");
CREATE INDEX IF NOT EXISTS "terminos_expediente_tenantId_idx" ON "terminos_expediente"("tenantId");

CREATE INDEX IF NOT EXISTS "eventos_expediente_tenantId_idx" ON "eventos_expediente"("tenantId");
CREATE INDEX IF NOT EXISTS "eventos_expediente_expedienteId_idx" ON "eventos_expediente"("expedienteId");

CREATE INDEX IF NOT EXISTS "registros_horas_tenantId_idx" ON "registros_horas"("tenantId");
CREATE INDEX IF NOT EXISTS "registros_horas_expedienteId_idx" ON "registros_horas"("expedienteId");
CREATE INDEX IF NOT EXISTS "registros_horas_usuarioId_idx" ON "registros_horas"("usuarioId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "terminos_expediente" ADD CONSTRAINT "terminos_expediente_expedienteId_fkey"
    FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "terminos_expediente" ADD CONSTRAINT "terminos_expediente_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "eventos_expediente" ADD CONSTRAINT "eventos_expediente_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "eventos_expediente" ADD CONSTRAINT "eventos_expediente_expedienteId_fkey"
    FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_expedienteId_fkey"
    FOREIGN KEY ("expedienteId") REFERENCES "expedientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "registros_horas" ADD CONSTRAINT "registros_horas_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
