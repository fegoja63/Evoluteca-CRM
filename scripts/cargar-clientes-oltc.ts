/**
 * Carga inicial de OLT Consulting (2026-10-05): los 3 clientes de la hoja
 * "1. Comercial" del archivo "Evoluteca-Carga-Inicial OLTC.xlsx". Las demás
 * hojas del archivo son ejemplos de la plantilla y NO se cargan.
 *
 * Igual que Dashboard → Datos → Importación completa (cliente + contacto +
 * oportunidad por fila), más dos cosas: la oportunidad queda ligada a su
 * contacto y asignada al responsable (creadoBy). Con correcciones de tipeo
 * aprobadas por el usuario. No duplica: si el cliente ya existe por nombre, se
 * omite la fila.
 *
 * USO
 *   npx tsx --env-file=.env.produccion.ref scripts/cargar-clientes-oltc.ts <archivo.xlsx>            # vista previa
 *   npx tsx --env-file=.env.produccion.ref scripts/cargar-clientes-oltc.ts <archivo.xlsx> --aplicar
 */
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const SLUG = "olt-consulting";
const HOJA = "1. Comercial";
const RESPONSABLE = "juanmanuel@oltc.co";

/** Correcciones de tipeo aprobadas por el usuario, por cliente. */
const CORRECCIONES: Record<string, Partial<Record<string, string | null>>> = {
  "NCS BRANDS": {
    "Email empresa": "servicioalcliente@quest.com.co",
    "Sitio web": "www.quest.com.co",
    "Notas cliente": "Otro correo: servicioalcliente@qst.com.co · Otro sitio web: www.qst.com.co",
    "Cargo contacto": "Gerente Administrativo y Financiero",
  },
  "CEMENTOS SAN MARCOS": { "Sector": "INDUSTRIAL CONSTRUCCIÓN" },
};

const ETAPAS = new Set(["PROSPECTO", "CALIFICADO", "PROPUESTA", "NEGOCIACION", "GANADA", "PERDIDA"]);
const prisma = new PrismaClient();

function texto(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "result" in v) return String(v.result ?? "");
  if (typeof v === "object" && "text" in v) return String(v.text ?? "");
  if (typeof v === "object" && "richText" in v) return v.richText.map(t => t.text).join("");
  return String(v);
}

async function main() {
  const [archivo] = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const aplicar = process.argv.includes("--aplicar");
  if (!archivo) { console.error("Falta la ruta del .xlsx"); process.exit(1); }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const ws = wb.getWorksheet(HOJA);
  if (!ws) { console.error(`No está la hoja "${HOJA}"`); process.exit(1); }

  const cab: string[] = [];
  ws.getRow(1).eachCell((c, n) => { cab[n] = texto(c.value).replace("*", "").trim(); });
  const filas: Record<string, string | null>[] = [];
  ws.eachRow((r, i) => {
    if (i === 1) return;
    const f: Record<string, string | null> = {};
    cab.forEach((h, n) => {
      if (!h) return;
      const v = texto(r.getCell(n).value).trim();
      f[h] = v && v.toUpperCase() !== "NA" ? v : null;
    });
    if (Object.values(f).some(Boolean)) filas.push({ ...f, ...(CORRECCIONES[f["Cliente / Empresa"] ?? ""] ?? {}) });
  });

  const tenant = await prisma.tenant.findFirst({ where: { slug: SLUG }, select: { id: true, nombre: true } });
  if (!tenant) { console.error(`No existe el tenant ${SLUG}`); process.exit(1); }
  const tenantId = tenant.id;
  const resp = await prisma.usuario.findFirst({ where: { tenantId, email: RESPONSABLE }, select: { id: true, nombre: true } });
  if (!resp) { console.error(`No está ${RESPONSABLE} en ${tenant.nombre}`); process.exit(1); }
  const existentes = new Set((await prisma.empresa.findMany({ where: { tenantId }, select: { nombre: true } })).map(e => e.nombre.toLowerCase()));

  console.log(`Empresa destino: ${tenant.nombre} · Responsable de las oportunidades: ${resp.nombre}\n`);
  const aCargar = filas.filter(f => {
    const ya = existentes.has((f["Cliente / Empresa"] ?? "").toLowerCase());
    if (ya) console.log(`OMITIDO (ya existe): ${f["Cliente / Empresa"]}`);
    return !ya;
  });
  for (const f of aCargar) {
    console.log(`• ${f["Cliente / Empresa"]} | ${f["Sector"]} | ${f["Teléfono empresa"]} | ${f["Email empresa"] ?? "—"} | ${f["Sitio web"]}`);
    console.log(`    Contacto: ${f["Contacto"]} | ${f["Email contacto"] ?? "—"} | ${f["Teléfono contacto"] ?? "—"} | ${f["Cargo contacto"]}`);
    console.log(`    Oportunidad: "${f["Tipo de negocio / evento"]}" | ${f["Etapa"]} | origen ${f["Origen del lead"]} | ${f["Segmento"]} | recurrente ${f["Recurrente"]}`);
    console.log(`    Condiciones: ${f["Condiciones comerciales"]}${f["Notas cliente"] ? ` | Notas: ${f["Notas cliente"]}` : ""}`);
  }
  if (!aplicar) { console.log("\nVISTA PREVIA — no se cargó nada. Para cargar: agrega --aplicar"); return; }

  await prisma.$transaction(async (tx) => {
    for (const f of aCargar) {
      const etapa = (f["Etapa"] ?? "PROSPECTO").toUpperCase();
      const rec = (f["Recurrente"] ?? "").toUpperCase();
      const empresa = await tx.empresa.create({
        data: {
          tenantId, nombre: f["Cliente / Empresa"]!, sector: f["Sector"], telefono: f["Teléfono empresa"],
          email: f["Email empresa"], sitioWeb: f["Sitio web"], condicionesComerciales: f["Condiciones comerciales"],
          notas: f["Notas cliente"], creadoBy: resp.id,
        },
      });
      const contacto = f["Contacto"]
        ? await tx.contacto.create({
            data: { tenantId, empresaId: empresa.id, nombre: f["Contacto"], email: f["Email contacto"], telefono: f["Teléfono contacto"], cargo: f["Cargo contacto"] },
          })
        : null;
      if (f["Tipo de negocio / evento"]) {
        await tx.oportunidad.create({
          data: {
            tenantId, empresaId: empresa.id, contactoId: contacto?.id ?? null, creadoBy: resp.id,
            titulo: f["Tipo de negocio / evento"]!,
            etapa: (ETAPAS.has(etapa) ? etapa : "PROSPECTO") as never,
            origenLead: f["Origen del lead"], segmento: f["Segmento"],
            recurrente: rec === "SI" || rec === "SÍ" ? true : rec === "NO" ? false : null,
          },
        });
      }
    }
    await tx.registroAuditoria.create({
      data: {
        tenantId, usuarioNombre: "Evoluteca (soporte)", accion: "CREAR", entidad: "Empresa",
        descripcion: `Carga inicial: ${aCargar.length} clientes con su contacto y oportunidad (archivo Evoluteca-Carga-Inicial OLTC.xlsx)`,
        despues: { clientes: aCargar.map(f => f["Cliente / Empresa"]), responsable: resp.nombre },
      },
    });
  });
  console.log(`\n✓ Cargados ${aCargar.length} clientes en ${tenant.nombre}.`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
