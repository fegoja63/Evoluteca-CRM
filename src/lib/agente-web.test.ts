import { describe, it, expect } from "vitest";
import {
  configAgente, mezclarDatos, listoParaLead, mensajesDe, systemAgente, notasDelLead,
  AGENTE_POR_DEFECTO, type RespuestaAgente,
} from "./agente-web";

const vacio: RespuestaAgente["datos"] = { nombre: null, empresa: null, email: null, telefono: null, necesidad: null, cantidad: null, plazo: null };

describe("configAgente", () => {
  it("usa la de fábrica si falta o está dañada", () => {
    expect(configAgente(null)).toEqual(AGENTE_POR_DEFECTO);
    expect(configAgente({ activo: "sí" })).toEqual(AGENTE_POR_DEFECTO);
  });
  it("respeta una configuración válida", () => {
    const c = { activo: true, nombre: "Sofi", saludo: "Hola", info: "Vendemos bidones", responsableId: null };
    expect(configAgente(c)).toEqual(c);
  });
});

describe("mezclarDatos", () => {
  it("suma lo nuevo sin borrar lo que ya se sabía", () => {
    const d = mezclarDatos({ nombre: "Marcelo", necesidad: "Bidones de 20 L" }, { ...vacio, email: " Marcelo@Correo.CO ", plazo: "este mes" });
    expect(d).toEqual({ nombre: "Marcelo", necesidad: "Bidones de 20 L", email: "marcelo@correo.co", plazo: "este mes" });
  });
  it("un dato nuevo reemplaza al anterior (el visitante se corrigió)", () => {
    expect(mezclarDatos({ nombre: "Marcel" }, { ...vacio, nombre: "Marcelo" }).nombre).toBe("Marcelo");
  });
  it("descarta un correo mal escrito y recorta lo muy largo", () => {
    const d = mezclarDatos({}, { ...vacio, email: "no-es-correo", nombre: "x".repeat(500) });
    expect(d.email).toBeUndefined();
    expect(d.nombre).toHaveLength(120);
  });
});

describe("listoParaLead", () => {
  it("necesita nombre y un correo o celular", () => {
    expect(listoParaLead({ nombre: "Ana" })).toBe(false);
    expect(listoParaLead({ email: "a@b.co" })).toBe(false);
    expect(listoParaLead({ nombre: "Ana", telefono: "3001234567" })).toBe(true);
    expect(listoParaLead({ nombre: "Ana", email: "a@b.co" })).toBe(true);
  });
});

describe("mensajesDe", () => {
  it("ignora lo que no es un mensaje", () => {
    expect(mensajesDe([{ rol: "visitante", texto: "hola", en: "x" }, { rol: "sistema", texto: "x" }, null, "x"]))
      .toEqual([{ rol: "visitante", texto: "hola", en: "x" }]);
    expect(mensajesDe("nada")).toEqual([]);
  });
});

describe("systemAgente", () => {
  const base = { empresa: "Agua Pura", nombreAsistente: "Sofi", info: "Entregamos en Cali", catalogo: [{ nombre: "Bidón 20 L", descripcion: "Retornable" }] };
  it("incluye la información de la empresa y el catálogo", () => {
    const s = systemAgente({ ...base, puedeAgendar: false });
    expect(s).toContain("Entregamos en Cali");
    expect(s).toContain("Bidón 20 L: Retornable");
    expect(s).toContain("ofrecerAgenda siempre en false");
  });
  it("ofrece agendar solo si hay enlace", () => {
    expect(systemAgente({ ...base, puedeAgendar: true })).toContain("marca ofrecerAgenda en true");
  });
});

describe("notasDelLead", () => {
  it("resume lo que dijo el visitante y la calificación", () => {
    const n = notasDelLead({ necesidad: "200 bidones", plazo: "marzo" }, "ALTA");
    expect(n).toContain("Necesidad: 200 bidones");
    expect(n).toContain("Plazo: marzo");
    expect(n).toContain("Calificación del asistente: alta.");
  });
});
