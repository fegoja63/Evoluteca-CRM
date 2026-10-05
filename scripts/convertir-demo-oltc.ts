/**
 * Convierte la cuenta demo "Demo OLTC" (slug demo-oltc) en la cuenta real del
 * cliente OLT Consulting. Operación puntual (2026-10-05).
 *
 * Qué hace, en UNA transacción:
 *  - Borra los datos comerciales inventados del demo (empresas, contactos,
 *    oportunidades, actividades, cotizaciones…), igual que "Borrar todos los
 *    datos del CRM". Se conservan configuración, módulos, productos,
 *    plantillas y metas.
 *  - Renombra la empresa a "OLT Consulting" y le cambia el slug a
 *    "olt-consulting": scripts/seed-demo-oltc.ts borra y recrea el tenant
 *    "demo-oltc", así que con el slug nuevo ese script ya no puede tocarla.
 *  - Convierte los usuarios ficticios admin@/gerente@demo-oltc.com en los
 *    usuarios reales. Su contraseña era la del demo (conocida): se reemplaza
 *    por una CLAVE TEMPORAL (variable CLAVE_TEMPORAL, nunca en el código: el
 *    repo es público) con debeCambiarPassword=true, así el CRM los obliga a
 *    cambiarla en su primer ingreso (y al titular, a aceptar la licencia).
 *    Se limpian 2FA y tokens.
 *  - Desactiva el usuario ficticio comercial@demo-oltc.com (misma limpieza).
 *  - Deja constancia en la auditoría de la empresa.
 *
 * USO
 *   # Vista previa (no escribe nada):
 *   npx tsx --env-file=.env.produccion.ref scripts/convertir-demo-oltc.ts
 *   # Aplicar:
 *   CLAVE_TEMPORAL='...' npx tsx --env-file=.env.produccion.ref scripts/convertir-demo-oltc.ts --aplicar
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const SLUG_ACTUAL = "demo-oltc";
const NUEVO_NOMBRE = "OLT Consulting";
const NUEVO_SLUG = "olt-consulting";
const CONVERTIR = [
  { de: "admin@demo-oltc.com", nombre: "Rafael Mizrachi", email: "rafael@oltc.co", rol: "ADMINISTRADOR" as const },
  { de: "gerente@demo-oltc.com", nombre: "Juan Manuel Carretero", email: "juanmanuel@oltc.co", rol: "GERENTE" as const },
];
const DESACTIVAR = ["comercial@demo-oltc.com"];

const prisma = new PrismaClient();

/**
 * Sin 2FA ni tokens. Con clave: la temporal, que el CRM obliga a cambiar.
 * Sin clave (usuarios que se desactivan): una aleatoria que nadie conoce.
 */
async function credencialesLimpias(clave?: string) {
  return {
    passwordHash: await bcrypt.hash(clave ?? randomBytes(32).toString("hex"), 10),
    debeCambiarPassword: true,
    resetToken: null, resetTokenExpiry: null,
    totpSecret: null, totpActivadoEn: null, codigosRespaldo: [],
    reset2faToken: null, reset2faExpiry: null,
    tokenCalendario: null,
  };
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const claveTemporal = process.env.CLAVE_TEMPORAL ?? "";
  if (aplicar && claveTemporal.length < 8) {
    console.error("Falta CLAVE_TEMPORAL (mínimo 8 caracteres) para los usuarios reales.");
    process.exit(1);
  }
  const t = await prisma.tenant.findFirst({ where: { slug: SLUG_ACTUAL }, select: { id: true, nombre: true } });
  if (!t) {
    console.error(`No existe el tenant '${SLUG_ACTUAL}' (¿ya se convirtió?).`);
    process.exit(1);
  }
  const tenantId = t.id;
  if (await prisma.tenant.findFirst({ where: { slug: NUEVO_SLUG } })) {
    console.error(`El slug '${NUEVO_SLUG}' ya está en uso.`);
    process.exit(1);
  }
  const ocupados = await prisma.usuario.findMany({
    where: { email: { in: CONVERTIR.map(c => c.email), mode: "insensitive" } }, select: { email: true },
  });
  if (ocupados.length) {
    console.error(`Correos ya usados por otro usuario: ${ocupados.map(o => o.email).join(", ")}`);
    process.exit(1);
  }
  const usuarios = await prisma.usuario.findMany({ where: { tenantId }, select: { id: true, email: true, nombre: true, rol: true } });
  for (const c of CONVERTIR) {
    if (!usuarios.find(u => u.email === c.de)) { console.error(`No está el usuario ${c.de} en el tenant.`); process.exit(1); }
  }

  const [empresas, contactos, oportunidades, actividades, cotizaciones] = await Promise.all([
    prisma.empresa.count({ where: { tenantId } }),
    prisma.contacto.count({ where: { tenantId } }),
    prisma.oportunidad.count({ where: { tenantId } }),
    prisma.actividad.count({ where: { tenantId } }),
    prisma.cotizacion.count({ where: { tenantId } }),
  ]);

  console.log(`Empresa: "${t.nombre}" (${SLUG_ACTUAL})  →  "${NUEVO_NOMBRE}" (${NUEVO_SLUG})`);
  console.log(`Borrar datos de demo: ${empresas} empresas, ${contactos} contactos, ${oportunidades} oportunidades, ${actividades} actividades, ${cotizaciones} cotizaciones`);
  for (const c of CONVERTIR) console.log(`Usuario ${c.de}  →  ${c.nombre} <${c.email}> (${c.rol}), clave temporal, debe cambiarla al entrar`);
  for (const d of DESACTIVAR) console.log(`Usuario ${d}  →  DESACTIVADO, contraseña invalidada`);

  if (!aplicar) {
    console.log("\nVISTA PREVIA — no se cambió nada. Para aplicar: agrega --aplicar");
    return;
  }

  const ids = new Map(usuarios.map(u => [u.email, u.id]));
  const ops = [
    prisma.npsRespuesta.deleteMany({ where: { funcion: { tenantId } } }),
    prisma.itemCotizacion.deleteMany({ where: { cotizacion: { tenantId } } }),
    prisma.cotizacion.deleteMany({ where: { tenantId } }),
    prisma.eventoTimeline.deleteMany({ where: { tenantId } }),
    prisma.actividad.deleteMany({ where: { tenantId } }),
    prisma.oportunidad.deleteMany({ where: { tenantId } }),
    prisma.expediente.deleteMany({ where: { tenantId } }),
    prisma.espectador.deleteMany({ where: { tenantId } }),
    prisma.funcion.deleteMany({ where: { tenantId } }),
    prisma.contacto.deleteMany({ where: { tenantId } }),
    prisma.empresa.deleteMany({ where: { tenantId } }),
    prisma.tenant.update({ where: { id: tenantId }, data: { nombre: NUEVO_NOMBRE, slug: NUEVO_SLUG } }),
  ];
  for (const c of CONVERTIR) {
    ops.push(prisma.usuario.update({
      where: { id: ids.get(c.de)! },
      data: { nombre: c.nombre, email: c.email, rol: c.rol, activo: true, ...(await credencialesLimpias(claveTemporal)) },
    }) as never);
  }
  for (const d of DESACTIVAR) {
    const id = ids.get(d);
    if (id) ops.push(prisma.usuario.update({ where: { id }, data: { activo: false, ...(await credencialesLimpias()) } }) as never);
  }
  ops.push(prisma.registroAuditoria.create({
    data: {
      tenantId, usuarioNombre: "Evoluteca (soporte)", accion: "ACTUALIZAR", entidad: "Tenant", entidadId: tenantId,
      descripcion: `Cuenta demo convertida en la cuenta de ${NUEVO_NOMBRE}: se borraron los datos de demostración (${empresas} empresas, ${oportunidades} oportunidades, ${cotizaciones} cotizaciones) y se asignaron los usuarios reales`,
      antes: { nombre: t.nombre, slug: SLUG_ACTUAL, usuarios: usuarios.map(u => u.email) },
      despues: { nombre: NUEVO_NOMBRE, slug: NUEVO_SLUG, usuarios: CONVERTIR.map(c => c.email), desactivados: DESACTIVAR },
    },
  }) as never);

  await prisma.$transaction(ops);
  console.log(`\n✓ Convertida. "${NUEVO_NOMBRE}" lista: los usuarios entran con la clave temporal y el CRM les pide cambiarla.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
