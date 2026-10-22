import Link from "next/link";
import {
  IconSparkles, IconBuilding, IconChartFunnel, IconTrendingUp, IconPlant2, IconMail,
  IconMessageCircle2, IconReportAnalytics, IconShieldCheck, IconArrowRight, IconNotes,
  IconCoin, IconCircleCheck, type Icon,
} from "@tabler/icons-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { filtroOwner, moduloActivo, alcanceDe, filtroActividadAlcance } from "@/lib/permisos";
import { inicioProximoPaso } from "@/lib/estado-comercial";
import { componentesHoyBogota, medianocheBogota, diaISO, fechaISO } from "@/lib/fecha-bogota";
import { numeroCotizacion } from "@/lib/cotizaciones";
import { estadoLicencia } from "@/lib/licencias";
import { rolVeFinanzas } from "@/lib/finanzas/acceso";
import { boton, cx, insignia, tarjeta } from "@/components/ui/estilos";
import { UsoMeter, Preguntar } from "@/components/asistente-ia-interactivo";

export const dynamic = "force-dynamic";

// Pestaña "Asistente IA": un solo lugar que reúne las funciones de IA del CRM
// (vitrina + lanzador), el cupo mensual compartido y "Sugerido para hoy", que
// sale de los datos del pipeline con reglas (no gasta cupo de IA). Las funciones
// ligadas a un registro siguen viviendo en su pantalla; aquí se enlazan.

type Funcion = {
  titulo: string;
  desc: string;
  icon: Icon;
  href: string;
  cta: string;
  etiqueta: string;
  exclusiva?: boolean; // diferenciador de Evoluteca (insignia de acento)
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const EJEMPLOS = [
  "¿Cuánto vendimos este trimestre?",
  "¿Qué negocios cierran este mes?",
  "Ventas por vendedor este año",
];

type Sugerencia = { texto: string; accion: string; href: string; tono: "accent" | "brand" };

export default async function AsistenteIAPage() {
  const session = await auth();
  const tenantId = session?.user?.tenantId ?? "";
  const rol = session?.user?.rol;
  const userId = session?.user?.id ?? "";
  const ownerFiltro = filtroOwner(rol, userId);
  const alcance = alcanceDe(rol, undefined);

  const hoy = new Date();
  const { anio, mes } = componentesHoyBogota(hoy);
  const enSieteDias = medianocheBogota(8, hoy);
  const [nSinPaso, cotVence, reunionManana, tenant, licenciaFinanzas] = await Promise.all([
    // Mismo criterio que el Inicio y el Pipeline: activo y sin actividad pendiente desde hoy.
    prisma.oportunidad.count({
      where: {
        tenantId, eliminadoEn: null, etapa: { notIn: ["GANADA", "PERDIDA"] }, ...ownerFiltro,
        actividades: { none: { completada: false, fecha: { gte: inicioProximoPaso(hoy) } } },
      },
    }),
    prisma.cotizacion.findFirst({
      where: { tenantId, eliminadoEn: null, estado: "ENVIADA", fechaValidez: { gte: medianocheBogota(0, hoy), lt: enSieteDias } },
      orderBy: { fechaValidez: "asc" },
      select: { id: true, numero: true, numeroManual: true, fechaValidez: true },
    }),
    prisma.actividad.findFirst({
      where: {
        tenantId, tipo: "REUNION", completada: false,
        fecha: { gte: medianocheBogota(1, hoy), lt: medianocheBogota(2, hoy) },
        ...filtroActividadAlcance(rol, userId, alcance),
      },
      orderBy: { fecha: "asc" },
      select: { empresa: { select: { id: true, nombre: true } }, titulo: true },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { modulos: true } }),
    rolVeFinanzas(rol) ? estadoLicencia(tenantId, "FINANZAS", hoy) : Promise.resolve(null),
  ]);

  // ── Sugerido para hoy (reglas sobre los datos, sin IA) ────────────────────
  const sugerencias: Sugerencia[] = [];
  if (nSinPaso > 0) {
    sugerencias.push({
      texto: `${nSinPaso} negocio${nSinPaso !== 1 ? "s" : ""} sin próximo paso`,
      accion: "Agendar", href: "/dashboard/pipeline?sinPaso=1", tono: "accent",
    });
  }
  if (cotVence?.fechaValidez) {
    const dias = Math.round((Date.parse(diaISO(cotVence.fechaValidez)) - Date.parse(fechaISO(hoy))) / 86_400_000);
    const cuando = dias <= 0 ? "vence hoy" : dias === 1 ? "vence mañana" : `vence en ${dias} días`;
    sugerencias.push({
      texto: `Cotización ${numeroCotizacion(cotVence)} ${cuando}`,
      accion: "Seguimiento", href: `/dashboard/cotizaciones-formales/${cotVence.id}`, tono: "accent",
    });
  }
  if (reunionManana) {
    sugerencias.push({
      texto: reunionManana.empresa ? `Reunión mañana: ${reunionManana.empresa.nombre}` : `Reunión mañana: ${reunionManana.titulo}`,
      accion: reunionManana.empresa ? "Resumen" : "Ver agenda",
      href: reunionManana.empresa ? `/dashboard/cuentas/${reunionManana.empresa.id}` : "/dashboard/agenda",
      tono: "brand",
    });
  }

  // ── Herramientas (las de módulo opcional, solo si el cliente las tiene) ────
  const coachActivo = moduloActivo(tenant?.modulos, "objeciones");
  // Gerente financiero: solo con el módulo Finanzas habilitado (licencia VIGENTE) y
  // para los roles que ven Finanzas. Con la licencia vencida queda en solo lectura
  // (no se puede consultar a la IA), así que tampoco se ofrece aquí.
  const finanzasActiva = licenciaFinanzas?.estado === "VIGENTE";

  const principales: Funcion[] = [
    { titulo: "Resumen de cliente", desc: "Una cuenta en 6 secciones accionables.", icon: IconBuilding,
      href: "/dashboard/cuentas", cta: "Elegir cliente", etiqueta: "Clientes" },
    { titulo: "Brief del pipeline", desc: "Calientes, en riesgo y prioridades de la semana.", icon: IconChartFunnel,
      href: "/dashboard/pipeline", cta: "Generar", etiqueta: "Pipeline" },
  ];
  const resto: Funcion[] = [
    { titulo: "Análisis de tendencias", desc: "Qué cambió, por qué y qué hacer.", icon: IconTrendingUp,
      href: "/dashboard/reportes", cta: "Analizar", etiqueta: "Reportes" },
    { titulo: "Redactor de correos", desc: "Envío, seguimiento y cierre, con tu tono.", icon: IconMail,
      href: "/dashboard/cotizaciones-formales", cta: "Redactar", etiqueta: "Cotizaciones" },
    { titulo: "Revisor de propuestas", desc: "Margen, descuentos y vigencia antes de enviar.", icon: IconShieldCheck,
      href: "/dashboard/cotizaciones-formales", cta: "Revisar", etiqueta: "Cotizaciones" },
    coachActivo
      ? { titulo: "Coach de objeciones", desc: "Qué responder y qué evitar, al momento.", icon: IconMessageCircle2,
          href: "/dashboard/objeciones", cta: "Practicar", etiqueta: "Solo en Evoluteca", exclusiva: true }
      : { titulo: "Coach de objeciones", desc: "Actívalo para saber qué responder y qué evitar en cada objeción.", icon: IconMessageCircle2,
          href: "/dashboard/configuracion", cta: "Activar", etiqueta: "Solo en Evoluteca", exclusiva: true },
    { titulo: "Oportunidades de crecimiento", desc: "Qué más ofrecerle a un cliente que ya compró.", icon: IconPlant2,
      href: "/dashboard/cuentas", cta: "Elegir cliente", etiqueta: "Clientes" },
    { titulo: "Minutas de reunión", desc: "Pega tus notas: acuerdos, compromisos y próximos pasos.", icon: IconNotes,
      href: "/dashboard/cuentas", cta: "Elegir cliente", etiqueta: "Clientes" },
    { titulo: "Informe ejecutivo mensual", desc: "El cierre del mes anterior, listo para la junta.", icon: IconReportAnalytics,
      href: "/dashboard/informe-mensual", cta: "Generar informe", etiqueta: "Reportes" },
    ...(finanzasActiva ? [{ titulo: "Gerente financiero", desc: "Lectura de tus estados y tu caja, con qué hacer.", icon: IconCoin,
      href: "/dashboard/finanzas/gerente", cta: "Consultar", etiqueta: "Finanzas" }] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header
        className="relative overflow-hidden rounded-3xl bg-brand-950 px-6 py-6 sm:px-7 text-white flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      >
        <div className="pointer-events-none absolute -right-24 -top-36 h-80 w-80 rounded-full border border-accent-400/30" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-accent-600 flex items-center justify-center">
            <IconSparkles size={28} stroke={1.75} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight leading-none">Asistente IA</h1>
            <p className="text-brand-200 text-sm mt-1.5">Todo lo que la IA puede hacer por tu equipo, en un solo lugar.</p>
          </div>
        </div>
        <UsoMeter mes={MESES[mes]} renovacion={`1 de ${MESES[(mes + 1) % 12]}${mes === 11 ? ` de ${anio + 1}` : ""}`} />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Preguntar ejemplos={EJEMPLOS} />
        {principales.map(f => <Tarjeta key={f.titulo} f={f} />)}
        {resto.slice(0, 4).map(f => <Tarjeta key={f.titulo} f={f} />)}
      </div>

      {/* Las demás en tarjetas compactas: llenan su fila sin dejar huecos (3 o 4 según módulos). */}
      <section aria-labelledby="mas-herramientas">
        <h2 id="mas-herramientas" className="mb-3 px-1 text-sm font-bold uppercase tracking-wide text-slate-500">Más herramientas de IA</h2>
        <div className={cx("grid gap-3 sm:grid-cols-2", resto.length - 4 >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          {resto.slice(4).map(f => <TarjetaCompacta key={f.titulo} f={f} />)}
        </div>
      </section>

      <section className={tarjeta("p-5")} aria-labelledby="sugerido-hoy">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="sugerido-hoy" className="text-lg font-bold text-slate-900">Sugerido para hoy</h2>
          <span className="text-xs text-slate-500">Detectado en tu pipeline hoy · no gasta acciones de IA</span>
        </div>
        {sugerencias.length === 0 ? (
          <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <IconCircleCheck size={18} stroke={1.75} /> Todo al día: sin negocios sin próximo paso, cotizaciones por vencer ni reuniones mañana.
          </p>
        ) : (
          <div className={cx("grid gap-3", sugerencias.length === 3 ? "md:grid-cols-3" : sugerencias.length === 2 ? "md:grid-cols-2" : "")}>
            {sugerencias.map(s => (
              <div key={s.texto} className="flex items-center gap-3 rounded-2xl bg-slate-50 py-2.5 pl-4 pr-2.5">
                <span className={cx("h-2 w-2 shrink-0 rounded-full", s.tono === "accent" ? "bg-accent-500" : "bg-brand-500")} aria-hidden />
                <p className="flex-1 min-w-0 text-sm font-semibold text-slate-800 leading-snug">{s.texto}</p>
                <Link href={s.href} className={boton("marca", "sm", "shrink-0 rounded-full bg-brand-900 hover:bg-brand-800 px-3.5 py-2 font-semibold")}>
                  {s.accion}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Tarjeta({ f }: { f: Funcion }) {
  const Icono = f.icon;
  return (
    <Link
      href={f.href}
      className={tarjeta(
        "group p-5 flex flex-col gap-2 min-h-[212px] transition-all hover:-translate-y-0.5 hover:shadow-md " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={cx("w-11 h-11 shrink-0 rounded-xl flex items-center justify-center",
          f.exclusiva ? "bg-accent-50 text-accent-700" : "bg-brand-50 text-brand-700")}>
          <Icono size={21} stroke={1.75} />
        </div>
        <span className={f.exclusiva
          ? insignia("neutro", "bg-accent-600 text-white text-2xs uppercase tracking-wide")
          : insignia("neutro", "text-2xs uppercase tracking-wide")}>
          {f.etiqueta}
        </span>
      </div>
      <h3 className="mt-1.5 text-lg font-bold text-slate-900 leading-tight">{f.titulo}</h3>
      <p className="text-sm text-slate-500 leading-snug">{f.desc}</p>
      <span className={boton("marca", "md", "mt-auto self-start rounded-full bg-brand-900 hover:bg-brand-800 group-hover:bg-brand-800 font-semibold")}>
        {f.cta} <IconArrowRight size={15} stroke={2.25} />
      </span>
    </Link>
  );
}

function TarjetaCompacta({ f }: { f: Funcion }) {
  const Icono = f.icon;
  return (
    <Link
      href={f.href}
      className={tarjeta(
        "group flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md " +
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
      )}
    >
      <div className="w-10 h-10 shrink-0 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
        <Icono size={19} stroke={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-slate-900 leading-tight">{f.titulo}</p>
        <p className="text-xs text-slate-500 leading-snug mt-0.5">{f.desc}</p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 group-hover:text-brand-900">
        {f.cta} <IconArrowRight size={14} stroke={2.25} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
