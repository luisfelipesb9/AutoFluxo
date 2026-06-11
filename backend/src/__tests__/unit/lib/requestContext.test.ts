import {
  sanitizeDetalhe,
  getClientIp,
  requestContext,
  getStore,
} from "../../../lib/requestContext";
import { Request } from "express";

describe("sanitizeDetalhe", () => {
  it("repassa strings como estão", () => {
    expect(sanitizeDetalhe("pago via pix")).toBe("pago via pix");
  });

  it("redige chaves sensíveis em qualquer profundidade", () => {
    const out = sanitizeDetalhe({
      login: "admin",
      senha: "segredo123",
      token: "abc.def",
      nested: { senhaHash: "$2b$..." },
    });
    expect(out).not.toContain("segredo123");
    expect(out).not.toContain("abc.def");
    expect(out).not.toContain("$2b$");
    expect(out).toContain("[REDACTED]");
    expect(out).toContain("admin");
  });
});

describe("getClientIp", () => {
  it("normaliza IPv4 mapeado em IPv6", () => {
    expect(
      getClientIp({ ip: "::ffff:127.0.0.1", socket: {} } as unknown as Request)
    ).toBe("127.0.0.1");
  });

  it("usa req.ip quando presente", () => {
    expect(getClientIp({ ip: "8.8.8.8", socket: {} } as unknown as Request)).toBe(
      "8.8.8.8"
    );
  });
});

describe("requestContext", () => {
  it("expõe o store dentro do run", () => {
    requestContext.run({ usuarioId: 5, ip: "1.1.1.1" }, () => {
      expect(getStore()?.usuarioId).toBe(5);
      expect(getStore()?.ip).toBe("1.1.1.1");
    });
  });

  it("retorna undefined fora do run", () => {
    expect(getStore()).toBeUndefined();
  });
});
