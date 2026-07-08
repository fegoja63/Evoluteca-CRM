-- AlterTable
-- Empresa.etiquetas era NOT NULL sin default, asi que cualquier
-- prisma.empresa.create() que no pasara "etiquetas" explicitamente fallaba
-- con una violacion de constraint NULL (POST /api/empresas nunca lo enviaba).
ALTER TABLE "empresas" ALTER COLUMN "etiquetas" SET DEFAULT '{}';
