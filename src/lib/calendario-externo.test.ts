import { describe, it, expect } from "vitest";
import { ocupadosDeIcs, validarUrlCalendario } from "./calendario-externo";

const ics = (eventos: string) => [
  "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pruebas//ES",
  "BEGIN:VTIMEZONE", "TZID:America/Bogota", "BEGIN:STANDARD", "TZOFFSETFROM:-0500", "TZOFFSETTO:-0500",
  "TZNAME:-05", "DTSTART:19700101T000000", "END:STANDARD", "END:VTIMEZONE",
  eventos.trim(),
  "END:VCALENDAR",
].join("\r\n");

// Semana del lunes 16 al domingo 22 de noviembre de 2026 (Bogotá).
const DESDE = new Date("2026-11-16T05:00:00Z");
const HASTA = new Date("2026-11-23T05:00:00Z");
const iso = (xs: { inicio: Date; fin: Date }[]) => xs.map(x => [x.inicio.toISOString(), x.fin.toISOString()]).sort();

describe("ocupadosDeIcs", () => {
  it("lee eventos en UTC y con zona horaria de Bogotá", () => {
    const r = ocupadosDeIcs(ics(`
BEGIN:VEVENT
UID:a
DTSTART:20261116T150000Z
DTEND:20261116T160000Z
END:VEVENT
BEGIN:VEVENT
UID:b
DTSTART;TZID=America/Bogota:20261117T090000
DTEND;TZID=America/Bogota:20261117T100000
END:VEVENT`), DESDE, HASTA);
    expect(iso(r)).toEqual([
      ["2026-11-16T15:00:00.000Z", "2026-11-16T16:00:00.000Z"],
      ["2026-11-17T14:00:00.000Z", "2026-11-17T15:00:00.000Z"],
    ]);
  });

  it("ignora los eventos marcados como libres o cancelados", () => {
    const r = ocupadosDeIcs(ics(`
BEGIN:VEVENT
UID:libre
DTSTART:20261116T150000Z
DTEND:20261116T160000Z
TRANSP:TRANSPARENT
END:VEVENT
BEGIN:VEVENT
UID:cancelado
DTSTART:20261116T170000Z
DTEND:20261116T180000Z
STATUS:CANCELLED
END:VEVENT`), DESDE, HASTA);
    expect(r).toEqual([]);
  });

  it("expande los eventos que se repiten, con días quitados y movidos", () => {
    const r = ocupadosDeIcs(ics(`
BEGIN:VEVENT
UID:semanal
DTSTART;TZID=America/Bogota:20261102T080000
DTEND;TZID=America/Bogota:20261102T083000
RRULE:FREQ=DAILY;COUNT=30
EXDATE;TZID=America/Bogota:20261118T080000
END:VEVENT
BEGIN:VEVENT
UID:semanal
RECURRENCE-ID;TZID=America/Bogota:20261119T080000
DTSTART;TZID=America/Bogota:20261119T110000
DTEND;TZID=America/Bogota:20261119T113000
END:VEVENT`), DESDE, HASTA);
    const inicios = iso(r).map(x => x[0]);
    expect(inicios).toContain("2026-11-16T13:00:00.000Z"); // lunes 8:00 Bogotá
    expect(inicios).not.toContain("2026-11-18T13:00:00.000Z"); // miércoles quitado
    expect(inicios).toContain("2026-11-19T16:00:00.000Z"); // jueves movido a las 11:00
    expect(inicios).not.toContain("2026-11-19T13:00:00.000Z");
    expect(r).toHaveLength(6); // 7 días de la semana menos el miércoles quitado
  });

  it("un evento de día completo ocupa ese día en hora de Bogotá", () => {
    const r = ocupadosDeIcs(ics(`
BEGIN:VEVENT
UID:dia
DTSTART;VALUE=DATE:20261120
DTEND;VALUE=DATE:20261121
END:VEVENT`), DESDE, HASTA);
    expect(iso(r)).toEqual([["2026-11-20T05:00:00.000Z", "2026-11-21T05:00:00.000Z"]]);
  });

  it("deja fuera lo que no cae en el rango", () => {
    const r = ocupadosDeIcs(ics(`
BEGIN:VEVENT
UID:viejo
DTSTART:20250101T150000Z
DTEND:20250101T160000Z
END:VEVENT`), DESDE, HASTA);
    expect(r).toEqual([]);
  });
});

describe("validarUrlCalendario", () => {
  it("acepta Google, Outlook e iCloud y pasa webcal a https", () => {
    expect(validarUrlCalendario("https://calendar.google.com/calendar/ical/x%40gmail.com/private-abc/basic.ics")).toMatchObject({ ok: true });
    expect(validarUrlCalendario("https://outlook.office365.com/owa/calendar/abc/reachcalendar.ics")).toMatchObject({ ok: true });
    expect(validarUrlCalendario("webcal://p123-caldav.icloud.com/published/2/abc")).toEqual({ ok: true, url: "https://p123-caldav.icloud.com/published/2/abc" });
  });
  it("rechaza otros sitios, http y direcciones internas", () => {
    expect(validarUrlCalendario("https://ejemplo.com/cal.ics").ok).toBe(false);
    expect(validarUrlCalendario("http://calendar.google.com/x.ics").ok).toBe(false);
    expect(validarUrlCalendario("https://169.254.169.254/latest").ok).toBe(false);
    expect(validarUrlCalendario("https://calendar.google.com.atacante.com/x.ics").ok).toBe(false);
    expect(validarUrlCalendario("https://calendar.google.com:8443/x.ics").ok).toBe(false);
  });
});
