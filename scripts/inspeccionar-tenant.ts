// SOLO LECTURA — panorama completo de un tenant por slug. No escribe nada.
// node --env-file=.env.produccion.ref scripts/inspeccionar-tenant.ts demo-evoluteca
import { PrismaClient, EtapaOportunidad } from "@prisma/client";
const prisma = new PrismaClient();

const fmt = (n: number) => "$" + n.toLocaleString("es-CO");

async function main() {
  const slug = process.argv[2];
  if (!slug) { console.error("Uso: ... scripts/inspeccionar-tenant.ts <slug>"); process.exit(1); }

  const t = await prisma.tenant.findFirst({
    where: { slug },
    select: {
      id: true, nombre: true, slug: true, activo: true, plan: true, emailsActivos: true,
      modulos: true, creadoEn: true,
      usuarios: { select: { nombre: true, email: true, rol: true, esTitular: true } },
    },
  });
  if (!t) { console.error(`✗ No existe tenant con slug "${slug}".`); process.exit(1); }

  const [empresas, contactos, cotizaciones, actividades, actPend, catalogo, metas, objeciones] = await Promise.all([
    prisma.empresa.count({ where: { tenantId: t.id, eliminadoEn: null } }),
    prisma.contacto.count({ where: { tenantId: t.id } }),
    prisma.cotizacion.count({ where: { tenantId: t.id } }),
    prisma.actividad.count({ where: { tenantId: t.id } }),
    prisma.actividad.count({ where: { tenantId: t.id, completada: false } }),
    prisma.producto.count({ where: { tenantId: t.id } }),
    prisma.metaVenta.count({ where: { tenantId: t.id } }),
    prisma.objecion.count({ where: { tenantId: t.id } }),
  ]);

  const ops = await prisma.oportunidad.findMany({
    where: { tenantId: t.id, eliminadoEn: null },
    select: { etapa: true, valor: true, fechaCierre: true, motivoPerdida: true },
  });

  const porEtapa = {} as Record<string, { n: number; valor: number }>;
  for (const e of Object.values(EtapaOportunidad)) porEtapa[e] = { n: 0, valor: 0 };
  for (const o of ops) {
    const v = o.valor ? Number(o.valor) : 0;
    porEtapa[o.etapa].n++; porEtapa[o.etapa].valor += v;
  }

  console.log(`\n=== ${t.nombre}  (slug: ${t.slug}) ===`);
  console.log(`activo: ${t.activo ? "SÍ" : "NO"} · plan: ${t.plan} · emails: ${t.emailsActivos ? "ON" : "OFF"} · creado: ${t.creadoEn.toISOString().slice(0,10)}`);
  console.log(`módulos: ${JSON.stringify(t.modulos)}`);
  console.log(`\nUsuarios (${t.usuarios.length}):`);
  for (const u of t.usuarios) console.log(`   - ${u.nombre} <${u.email}> [${u.rol}${u.esTitular ? ", TITULAR" : ""}]`);

  console.log(`\nDatos:`);
  console.log(`   Clientes (empresas): ${empresas}`);
  console.log(`   Contactos:           ${contactos}`);
  console.log(`   Oportunidades:       ${ops.length}`);
  console.log(`   Cotizaciones:        ${cotizaciones}`);
  console.log(`   Actividades:         ${actividades}  (pendientes: ${actPend})`);
  console.log(`   Productos catálogo:  ${catalogo}`);
  console.log(`   Metas de venta:      ${metas}`);
  console.log(`   Objeciones:          ${objeciones}`);

  console.log(`\nPipeline por etapa:`);
  const abiertas = ["PROSPECTO","CALIFICADO","PROPUESTA","NEGOCIACION"];
  for (const e of abiertas) console.log(`   ${e.padEnd(12)} ${String(porEtapa[e].n).padStart(3)}  ${fmt(porEtapa[e].valor)}`);
  console.log(`   ${"GANADA".padEnd(12)} ${String(porEtapa.GANADA.n).padStart(3)}  ${fmt(porEtapa.GANADA.valor)}`);
  console.log(`   ${"PERDIDA".padEnd(12)} ${String(porEtapa.PERDIDA.n).padStart(3)}  ${fmt(porEtapa.PERDIDA.valor)}`);

  const fechas = ops.map(o => o.fechaCierre).filter(Boolean).sort() as Date[];
  if (fechas.length) console.log(`\nFechas de cierre: de ${fechas[0].toISOString().slice(0,10)} a ${fechas[fechas.length-1].toISOString().slice(0,10)}`);
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
