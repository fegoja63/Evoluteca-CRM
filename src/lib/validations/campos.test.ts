import { describe, it, expect } from "vitest";
import {
  nombreRequerido,
  textoOpcional,
  emailOpcional,
  telefonoOpcional,
  urlOpcional,
  idOpcional,
  montoNoNegativo,
  montoOpcional,
  enteroNoNegativo,
  enteroOpcional,
  porcentaje,
  porcentajeOpcional,
  fechaOpcional,
  horaOpcional,
} from "./campos";

describe("nombreRequerido", () => {
  const schema = nombreRequerido(2, 10);
  it("acepta un nombre válido", () => {
    expect(schema.parse("Ana")).toBe("Ana");
  });
  it("recorta espacios", () => {
    expect(schema.parse("  Ana  ")).toBe("Ana");
  });
  it("rechaza texto muy corto", () => {
    expect(() => schema.parse("A")).toThrow();
  });
  it("rechaza texto muy largo", () => {
    expect(() => schema.parse("Nombre demasiado largo")).toThrow();
  });
});

describe("textoOpcional", () => {
  const schema = textoOpcional(5);
  it("acepta string vacío", () => {
    expect(schema.parse("")).toBe("");
  });
  it("acepta undefined (campo ausente)", () => {
    expect(schema.parse(undefined)).toBeUndefined();
  });
  it("rechaza texto que excede el máximo", () => {
    expect(() => schema.parse("123456")).toThrow();
  });
});

// Regresión: varias rutas mandan `campo?.trim() || null` cuando el usuario
// deja un campo de texto opcional en blanco (ej. "Sede" o "Notas" en una
// cotización). Sin .nullable() aquí, Zod rechazaba null con el mensaje
// genérico de unión "Invalid input" y la petición entera fallaba — un bug
// real que impedía crear cotizaciones con esos campos vacíos, encontrado
// reproduciendo en vivo el reporte de un usuario (2026-07-14).
describe("campos de texto opcionales — regresión null -> 'Invalid input'", () => {
  it("textoOpcional acepta null", () => {
    expect(textoOpcional(200).parse(null)).toBeNull();
  });
  it("emailOpcional acepta null", () => {
    expect(emailOpcional.parse(null)).toBeNull();
  });
  it("telefonoOpcional acepta null", () => {
    expect(telefonoOpcional.parse(null)).toBeNull();
  });
  it("urlOpcional acepta null", () => {
    expect(urlOpcional.parse(null)).toBeNull();
  });
});

describe("emailOpcional", () => {
  it("acepta un email válido", () => {
    expect(emailOpcional.parse("a@b.com")).toBe("a@b.com");
  });
  it("acepta string vacío (campo sin llenar)", () => {
    expect(emailOpcional.parse("")).toBe("");
  });
  it("rechaza un email con formato inválido", () => {
    expect(() => emailOpcional.parse("no-es-email")).toThrow();
  });
});

describe("telefonoOpcional", () => {
  it("acepta string vacío", () => {
    expect(telefonoOpcional.parse("")).toBe("");
  });
  it("rechaza más de 30 caracteres", () => {
    expect(() => telefonoOpcional.parse("1".repeat(31))).toThrow();
  });
  it("acepta formatos válidos comunes", () => {
    expect(telefonoOpcional.parse("3001234567")).toBe("3001234567");
    expect(telefonoOpcional.parse("+57 300 123 4567")).toBe("+57 300 123 4567");
    expect(telefonoOpcional.parse("(601) 234-5678")).toBe("(601) 234-5678");
  });
  it("rechaza texto que no es un teléfono", () => {
    expect(() => telefonoOpcional.parse("no es un telefono")).toThrow();
  });
  it("rechaza menos de 7 caracteres", () => {
    expect(() => telefonoOpcional.parse("123")).toThrow();
  });
});

describe("idOpcional", () => {
  it("acepta un uuid válido", () => {
    const uuid = "11111111-1111-4111-8111-111111111111";
    expect(idOpcional.parse(uuid)).toBe(uuid);
  });
  it("acepta string vacío (opción 'Sin empresa' del <select>)", () => {
    expect(idOpcional.parse("")).toBe("");
  });
  it("acepta null", () => {
    expect(idOpcional.parse(null)).toBeNull();
  });
  it("rechaza un id con formato inválido", () => {
    expect(() => idOpcional.parse("no-es-un-uuid")).toThrow();
  });
});

describe("campos numéricos requeridos", () => {
  it("montoNoNegativo rechaza negativos", () => {
    expect(() => montoNoNegativo().parse(-1)).toThrow();
  });
  it("montoNoNegativo acepta 0", () => {
    expect(montoNoNegativo().parse(0)).toBe(0);
  });
  it("enteroNoNegativo rechaza decimales", () => {
    expect(() => enteroNoNegativo().parse(1.5)).toThrow();
  });
  it("porcentaje rechaza valores fuera de 0-100", () => {
    expect(() => porcentaje.parse(101)).toThrow();
    expect(() => porcentaje.parse(-1)).toThrow();
  });
  it("porcentaje acepta el rango completo", () => {
    expect(porcentaje.parse(0)).toBe(0);
    expect(porcentaje.parse(100)).toBe(100);
  });
});

// Regresión: z.coerce.number() por sí solo convierte "" en 0 (Number("") === 0),
// así que un campo numérico opcional dejado en blanco en un formulario se
// guardaba como 0 en vez de "sin valor". Este bug se encontró probando en vivo
// después de conectar los primeros schemas Zod a las rutas — estas pruebas
// existen específicamente para que no vuelva a pasar en silencio.
describe("campos numéricos opcionales — regresión '' -> 0", () => {
  it("montoOpcional trata '' como ausente, no como 0", () => {
    expect(montoOpcional().parse("")).toBeUndefined();
  });
  it("montoOpcional trata null como ausente", () => {
    expect(montoOpcional().parse(null)).toBeUndefined();
  });
  it("montoOpcional sigue validando un valor real", () => {
    expect(montoOpcional().parse(1500)).toBe(1500);
    expect(() => montoOpcional().parse(-5)).toThrow();
  });
  it("enteroOpcional trata '' como ausente, no como 0", () => {
    expect(enteroOpcional().parse("")).toBeUndefined();
  });
  it("porcentajeOpcional trata '' como ausente, no como 0", () => {
    expect(porcentajeOpcional.parse("")).toBeUndefined();
  });
  it("porcentajeOpcional sigue rechazando fuera de rango", () => {
    expect(() => porcentajeOpcional.parse(150)).toThrow();
  });
});

describe("fechaOpcional", () => {
  it("acepta string vacío como 'sin fecha'", () => {
    expect(fechaOpcional.parse("")).toBe("");
  });
  it("acepta null", () => {
    expect(fechaOpcional.parse(null)).toBeNull();
  });
  it("coerciona una fecha ISO válida", () => {
    const parsed = fechaOpcional.parse("2026-01-15");
    expect(parsed).toBeInstanceOf(Date);
  });
  it("rechaza una fecha inválida", () => {
    expect(() => fechaOpcional.parse("no-es-fecha")).toThrow();
  });
});

describe("horaOpcional", () => {
  it("acepta formato HH:mm válido", () => {
    expect(horaOpcional.parse("14:30")).toBe("14:30");
  });
  it("acepta string vacío", () => {
    expect(horaOpcional.parse("")).toBe("");
  });
  it("rechaza formato inválido", () => {
    expect(() => horaOpcional.parse("25:99")).toThrow();
  });
});
