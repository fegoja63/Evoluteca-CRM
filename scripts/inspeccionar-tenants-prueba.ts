// SOLO LECTURA — inspecciona los tenants cuyo nombre contiene "prueba" para
// decidir si se conservan o se borran. No escribe nada.
// node --env-file=.env.produccion.ref scripts/inspeccionar-tenants-prueba.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { nombre: { contains: "prueba", mode: "insensitive" } },
    select: {
      id: true, nombre: true, slug: true, activo: true, plan: true, creadoEn: true,
      usuarios: { select: { nombre: true, email: true, rol: true, esTitular: true, creadoEn: true } },
    },
    orderBy: { creadoEn: "asc" },
  });

  console.log(`\n=== Tenants con "prueba" en el nombre (solo lectura) ===\n`);
  for (const t of tenants) {
    const [empresas, contactos, oportunidades, cotizaciones, actividades] = await Promise.all([
      prisma.empresa.count({ where: { tenantId: t.id, eliminadoEn: null } }),
      prisma.contacto.count({ where: { tenantId: t.id } }),
      prisma.oportunidad.count({ where: { tenantId: t.id } }),
      prisma.cotizacion.count({ where: { tenantId: t.id } }),
      prisma.actividad.count({ where: { tenantId: t.id } }),
    ]);
    const ultimaOportunidad = await prisma.oportunidad.findFirst({
      where: { tenantId: t.id }, orderBy: { creadoEn: "desc" }, select: { creadoEn: true },
    });

    console.log(`■ ${t.nombre}   (slug: ${t.slug})`);
    console.log(`    id: ${t.id}`);
    console.log(`    activo: ${t.activo ? "SÍ" : "NO (suspendido)"}   plan: ${t.plan}`);
    console.log(`    creado: ${t.creadoEn.toISOString().slice(0, 10)}`);
    console.log(`    usuarios (${t.usuarios.length}):`);
    for (const u of t.usuarios) {
      console.log(`       - ${u.nombre} <${u.email}>  [${u.rol}${u.esTitular ? ", TITULAR" : ""}]  creado: ${u.creadoEn.toISOString().slice(0, 10)}`);
    }
    console.log(`    datos: ${empresas} clientes · ${contactos} contactos · ${oportunidades} oportunidades · ${cotizaciones} cotizaciones · ${actividades} actividades`);
    console.log(`    últ. oportunidad creada: ${ultimaOportunidad ? ultimaOportunidad.creadoEn.toISOString().slice(0, 10) : "ninguna"}`);
    console.log("");
  }
  if (tenants.length === 0) console.log("(No hay tenants con 'prueba' en el nombre)\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
