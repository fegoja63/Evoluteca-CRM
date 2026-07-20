/**
 * Verificación en dos pasos: que proteja, que no encierre a nadie fuera de su
 * cuenta, y que los códigos de respaldo sean de un solo uso.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { A, sembrar } from "../sembrar";
import { comoUsuario, llamar } from "../helpers";
import { prisma } from "../prisma-vigilado";
import {
  generarSecreto,
  generarCodigo,
  codigoValido,
  generarCodigosRespaldo,
  consumirCodigoRespaldo,
  tieneDosFactores,
  uriParaApp,
} from "@/lib/dos-factores";

import {
  GET as estado,
  POST as iniciar,
  PUT as confirmar,
  DELETE as desactivar,
} from "@/app/api/perfil/dos-factores/route";

beforeEach(async () => {
  await sembrar();
  comoUsuario(A, "COMERCIAL");
});

describe("la logica del segundo factor", () => {
  it("acepta el codigo que genera la app y rechaza cualquier otro", async () => {
    const secreto = await generarSecreto();
    expect(await codigoValido(await generarCodigo(secreto), secreto)).toBe(true);
    expect(await codigoValido("000000", secreto)).toBe(false);
    expect(await codigoValido("no-son-digitos", secreto)).toBe(false);
    expect(await codigoValido("", secreto)).toBe(false);
  });

  it("tolera espacios, porque la gente copia y pega el codigo", async () => {
    const secreto = await generarSecreto();
    const codigo = await generarCodigo(secreto);
    expect(await codigoValido(`${codigo.slice(0, 3)} ${codigo.slice(3)}`, secreto)).toBe(true);
  });

  it("no cuenta como activa mientras no se haya confirmado", () => {
    // El secreto se guarda al EMPEZAR la activacion. Si eso ya contara, un
    // fallo a media configuracion dejaria al usuario fuera de su cuenta.
    expect(tieneDosFactores({ totpSecret: "ABC", totpActivadoEn: null })).toBe(false);
    expect(tieneDosFactores({ totpSecret: "ABC", totpActivadoEn: new Date() })).toBe(true);
    expect(tieneDosFactores({ totpSecret: null, totpActivadoEn: new Date() })).toBe(false);
  });

  it("la URI para la app lleva el correo y el emisor", async () => {
    const uri = await uriParaApp("ana@ejemplo.com", await generarSecreto());
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("Evoluteca");
    expect(uri).toContain("ana%40ejemplo.com");
  });

  it("los codigos de respaldo se guardan hasheados, nunca en claro", async () => {
    const { enClaro, hasheados } = await generarCodigosRespaldo();

    expect(enClaro).toHaveLength(8);
    for (const codigo of enClaro) {
      expect(hasheados).not.toContain(codigo);
    }
    expect(hasheados.every((h) => h.startsWith("$2"))).toBe(true);
  });

  it("un codigo de respaldo sirve UNA vez", async () => {
    const { enClaro, hasheados } = await generarCodigosRespaldo();

    const primera = await consumirCodigoRespaldo(enClaro[0], hasheados);
    expect(primera.valido).toBe(true);
    expect(primera.restantes).toHaveLength(7);

    // El mismo codigo, contra la lista que quedo: ya no vale.
    const segunda = await consumirCodigoRespaldo(enClaro[0], primera.restantes);
    expect(segunda.valido).toBe(false);
    expect(segunda.restantes).toHaveLength(7);
  });

  it("un codigo de respaldo inventado no sirve", async () => {
    const { hasheados } = await generarCodigosRespaldo();
    const r = await consumirCodigoRespaldo("AAAAA-BBBBB", hasheados);
    expect(r.valido).toBe(false);
    expect(r.restantes).toHaveLength(8);
  });
});

describe("activarla y desactivarla", () => {
  it("empieza apagada", async () => {
    const { status, cuerpo } = await llamar(estado);
    expect(status).toBe(200);
    expect((cuerpo as { activa: boolean }).activa).toBe(false);
  });

  it("iniciar no la activa todavia", async () => {
    const { status, cuerpo } = await llamar(iniciar, { metodo: "POST" });

    expect(status).toBe(200);
    expect((cuerpo as { uri: string }).uri).toContain("otpauth://");

    // Clave: el usuario aun puede entrar con solo su contrasena. Si esto
    // fallara, quien empiece a configurarla y se le acabe la bateria del
    // telefono se queda fuera para siempre.
    const guardado = await prisma.usuario.findFirst({
      where: { id: A.comercial, tenantId: A.tenantId },
      select: { totpSecret: true, totpActivadoEn: true },
    });
    expect(guardado?.totpSecret).toBeTruthy();
    expect(guardado?.totpActivadoEn).toBeNull();
    expect(tieneDosFactores(guardado!)).toBe(false);
  });

  it("con un codigo valido queda activa y entrega los codigos de respaldo", async () => {
    const { cuerpo: inicio } = await llamar(iniciar, { metodo: "POST" });
    const secreto = (inicio as { secreto: string }).secreto;

    const { status, cuerpo } = await llamar(confirmar, {
      metodo: "PUT",
      body: { codigo: await generarCodigo(secreto) },
    });

    expect(status).toBe(200);
    expect((cuerpo as { activa: boolean }).activa).toBe(true);
    expect((cuerpo as { codigosRespaldo: string[] }).codigosRespaldo).toHaveLength(8);

    const { cuerpo: ahora } = await llamar(estado);
    expect((ahora as { activa: boolean }).activa).toBe(true);
  });

  it("con un codigo equivocado no se activa", async () => {
    await llamar(iniciar, { metodo: "POST" });

    const { status } = await llamar(confirmar, { metodo: "PUT", body: { codigo: "000000" } });
    expect(status).toBe(400);

    const { cuerpo } = await llamar(estado);
    expect((cuerpo as { activa: boolean }).activa).toBe(false);
  });

  it("no se puede desactivar sin un codigo valido", async () => {
    const { cuerpo: inicio } = await llamar(iniciar, { metodo: "POST" });
    const secreto = (inicio as { secreto: string }).secreto;
    await llamar(confirmar, { metodo: "PUT", body: { codigo: await generarCodigo(secreto) } });

    // Sin esto bastaria con dejar una sesion abierta un momento para que
    // alguien le quitara el segundo factor a otra persona.
    const { status } = await llamar(desactivar, { metodo: "DELETE", body: { codigo: "000000" } });
    expect(status).toBe(400);

    const { cuerpo } = await llamar(estado);
    expect((cuerpo as { activa: boolean }).activa).toBe(true);
  });

  it("con el codigo correcto si se desactiva y se borran los respaldos", async () => {
    const { cuerpo: inicio } = await llamar(iniciar, { metodo: "POST" });
    const secreto = (inicio as { secreto: string }).secreto;
    await llamar(confirmar, { metodo: "PUT", body: { codigo: await generarCodigo(secreto) } });

    const { status } = await llamar(desactivar, {
      metodo: "DELETE",
      body: { codigo: await generarCodigo(secreto) },
    });
    expect(status).toBe(200);

    const guardado = await prisma.usuario.findFirst({
      where: { id: A.comercial, tenantId: A.tenantId },
      select: { totpSecret: true, totpActivadoEn: true, codigosRespaldo: true },
    });
    expect(guardado?.totpSecret).toBeNull();
    expect(guardado?.totpActivadoEn).toBeNull();
    expect(guardado?.codigosRespaldo).toEqual([]);
  });

  it("cada quien configura la suya: siempre opera sobre el usuario de la sesion", async () => {
    // El administrador de A activa la suya; la del comercial no se toca.
    comoUsuario(A, "ADMINISTRADOR");
    const { cuerpo: inicio } = await llamar(iniciar, { metodo: "POST" });
    const secreto = (inicio as { secreto: string }).secreto;
    await llamar(confirmar, { metodo: "PUT", body: { codigo: await generarCodigo(secreto) } });

    const comercial = await prisma.usuario.findFirst({
      where: { id: A.comercial, tenantId: A.tenantId },
      select: { totpSecret: true, totpActivadoEn: true },
    });
    expect(tieneDosFactores(comercial!)).toBe(false);
  });
});
