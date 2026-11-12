/**
 * Calendario externo (Google, Outlook o iCloud) en modo solo lectura, sin
 * Google Cloud ni permisos OAuth: el usuario pega en Mi perfil la "dirección
 * secreta en formato iCal" de su calendario y el CRM lee de ahí cuándo está
 * ocupado, para no ofrecer esas horas en su enlace para agendar.
 *
 * Seguridad: la URL la escribe el usuario y la pide el servidor, así que solo
 * se aceptan hosts de esos tres proveedores por https, sin seguir redirecciones
 * a otros sitios, con tiempo y tamaño máximos. Si algo falla, el enlace sigue
 * funcionando solo con la Agenda del CRM.
 */
import ICAL from "ical.js";
import { fechaDesdeBogota } from "@/lib/fecha-bogota";
import type { Intervalo } from "@/lib/agendar";

const TIEMPO_MAX_MS = 8_000;
const TAMANO_MAX = 3 * 1024 * 1024;
const CACHE_MS = 5 * 60 * 1000;
const MAX_REPETICIONES = 400;

function hostPermitido(host: string): boolean {
  const h = host.toLowerCase();
  return h === "calendar.google.com"
    || h === "outlook.office365.com" || h === "outlook.live.com" || h === "outlook.office.com"
    || h.endsWith(".icloud.com");
}

export type ValidacionUrl = { ok: true; url: string } | { ok: false; error: string };

/** Acepta https o webcal de Google, Outlook o iCloud; devuelve la URL https normalizada. */
export function validarUrlCalendario(entrada: string): ValidacionUrl {
  const t = entrada.trim().replace(/^webcals?:\/\//i, "https://");
  let u: URL;
  try { u = new URL(t); } catch { return { ok: false, error: "Esa dirección no es válida." }; }
  if (u.protocol !== "https:") return { ok: false, error: "La dirección debe empezar por https:// o webcal://." };
  if (!hostPermitido(u.hostname)) return { ok: false, error: "Por ahora se aceptan calendarios de Google, Outlook o iCloud." };
  if (u.username || u.password || u.port) return { ok: false, error: "Esa dirección no es válida." };
  return { ok: true, url: u.toString() };
}

/** Descarga el .ics con tope de tiempo y tamaño, siguiendo solo redirecciones a hosts permitidos. */
async function descargar(url: string): Promise<string> {
  let actual = url;
  for (let saltos = 0; saltos < 3; saltos++) {
    const res = await fetch(actual, { redirect: "manual", signal: AbortSignal.timeout(TIEMPO_MAX_MS), headers: { Accept: "text/calendar" } });
    if (res.status >= 300 && res.status < 400) {
      const destino = res.headers.get("location");
      if (!destino) throw new Error("redirección sin destino");
      const v = validarUrlCalendario(new URL(destino, actual).toString());
      if (!v.ok) throw new Error("redirección a un sitio no permitido");
      actual = v.url;
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`el calendario respondió ${res.status}`);
    const lector = res.body.getReader();
    const partes: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > TAMANO_MAX) { await lector.cancel(); throw new Error("el calendario es demasiado grande"); }
      partes.push(value);
    }
    return new TextDecoder().decode(Buffer.concat(partes));
  }
  throw new Error("demasiadas redirecciones");
}

/** Instante real de una hora del calendario: con zona, en UTC; sin zona o de día completo, como hora de Bogotá. */
function aDate(t: ICAL.Time): Date {
  const dos = (n: number) => String(n).padStart(2, "0");
  const dia = `${t.year}-${dos(t.month)}-${dos(t.day)}`;
  if (t.isDate) return fechaDesdeBogota(dia);
  if (!t.zone || t.zone.tzid === "floating") return fechaDesdeBogota(`${dia}T${dos(t.hour)}:${dos(t.minute)}`);
  return t.toJSDate();
}

/** Intervalos ocupados entre `desde` y `hasta` según el texto de un .ics. Función pura. */
export function ocupadosDeIcs(texto: string, desde: Date, hasta: Date): Intervalo[] {
  const raiz = new ICAL.Component(ICAL.parse(texto));
  for (const vtz of raiz.getAllSubcomponents("vtimezone")) {
    try { ICAL.TimezoneService.register(new ICAL.Timezone(vtz)); } catch { /* zona rara: se ignora */ }
  }
  const principales = new Map<string, ICAL.Event>();
  const excepciones: ICAL.Component[] = [];
  for (const ve of raiz.getAllSubcomponents("vevent")) {
    if (ve.hasProperty("recurrence-id")) excepciones.push(ve);
    else principales.set(String(ve.getFirstPropertyValue("uid") ?? Math.random()), new ICAL.Event(ve));
  }
  for (const ex of excepciones) {
    const base = principales.get(String(ex.getFirstPropertyValue("uid")));
    if (base) base.relateException(ex);
  }

  const libre = (c: ICAL.Component) =>
    String(c.getFirstPropertyValue("transp") ?? "").toUpperCase() === "TRANSPARENT"
    || String(c.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";

  const out: Intervalo[] = [];
  const agregar = (inicio: Date, fin: Date) => {
    if (fin > desde && inicio < hasta && fin > inicio) out.push({ inicio, fin });
  };

  for (const ev of principales.values()) {
    if (libre(ev.component)) continue;
    if (!ev.isRecurring()) {
      if (ev.startDate) agregar(aDate(ev.startDate), aDate(ev.endDate ?? ev.startDate));
      continue;
    }
    const it = ev.iterator();
    for (let i = 0, t = it.next(); t && i < MAX_REPETICIONES; i++, t = it.next()) {
      const d = ev.getOccurrenceDetails(t);
      const inicio = aDate(d.startDate);
      if (inicio >= hasta) break;
      if (libre(d.item.component)) continue;
      agregar(inicio, aDate(d.endDate));
    }
  }
  return out;
}

const cache = new Map<string, { hasta: number; texto: string }>();

/** Ocupados del calendario externo del usuario. Si no se puede leer, lanza (quien llama decide). */
export async function ocupadosDeCalendarioExterno(url: string, desde: Date, hasta: Date): Promise<Intervalo[]> {
  const v = validarUrlCalendario(url);
  if (!v.ok) throw new Error(v.error);
  const guardado = cache.get(v.url);
  const texto = guardado && guardado.hasta > Date.now() ? guardado.texto : await descargar(v.url);
  if (!guardado || guardado.hasta <= Date.now()) cache.set(v.url, { hasta: Date.now() + CACHE_MS, texto });
  return ocupadosDeIcs(texto, desde, hasta);
}
