/**
 * Deja los usuarios de la cuenta demo (demo-evoluteca) como los describe el
 * Manual de pruebas (api/manual/pdf-demo-evoluteca), para que un prospecto
 * pueda hacer el recorrido completo con la clave pública Demo2026!:
 *
 *  - admin@demo-evoluteca.com sin "debe cambiar contraseña": si no, el primero
 *    que entra está obligado a cambiar la clave del demo y nadie más puede usarlo.
 *  - Crea el gerente gerente@demo-evoluteca.com (Carlos Vargas) si no existe:
 *    el capítulo "Recorrido como Gerente" entra con él.
 *
 * Idempotente. Solo toca el tenant demo.
 *
 * USO
 *   npx tsx --env-file=.env.produccion.ref scripts/ajustar-usuarios-demo.ts             # vista previa
 *   npx tsx --env-file=.env.produccion.ref scripts/ajustar-usuarios-demo.ts --aplicar
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const SLUG_DEMO = "demo-evoluteca";
const CLAVE_DEMO = "Demo2026!"; // pública: figura en el Manual de pruebas
const ADMIN = "admin@demo-evoluteca.com";
const GERENTE = { email: "gerente@demo-evoluteca.com", nombre: "Carlos Vargas" };

const prisma = new PrismaClient();

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const t = await prisma.tenant.findFirst({ where: { slug: SLUG_DEMO }, select: { id: true, nombre: true } });
  if (!t) { console.error(`No existe ${SLUG_DEMO}`); process.exit(1); }

  const admin = await prisma.usuario.findFirst({ where: { tenantId: t.id, email: ADMIN }, select: { id: true, debeCambiarPassword: true } });
  const gerente = await prisma.usuario.findUnique({ where: { email: GERENTE.email }, select: { id: true, tenantId: true } });
  if (gerente && gerente.tenantId !== t.id) { console.error(`${GERENTE.email} existe en OTRO tenant; no se toca.`); process.exit(1); }

  console.log(`Tenant: ${t.nombre}`);
  console.log(admin ? `${ADMIN}: debeCambiarPassword ${admin.debeCambiarPassword} → false` : `${ADMIN}: NO EXISTE`);
  console.log(gerente ? `${GERENTE.email}: ya existe (no se toca)` : `${GERENTE.email}: se crea (${GERENTE.nombre}, GERENTE, clave del demo)`);
  if (!aplicar) { console.log("\nVISTA PREVIA — no se cambió nada. Para aplicar: --aplicar"); return; }

  if (admin?.debeCambiarPassword) {
    await prisma.usuario.update({ where: { id: admin.id }, data: { debeCambiarPassword: false } });
  }
  if (!gerente) {
    await prisma.usuario.create({
      data: {
        tenantId: t.id, email: GERENTE.email, nombre: GERENTE.nombre, rol: "GERENTE",
        passwordHash: await bcrypt.hash(CLAVE_DEMO, 10), debeCambiarPassword: false,
      },
    });
  }
  console.log("\n✓ Usuarios del demo ajustados.");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
