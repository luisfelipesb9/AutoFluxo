import {
  assertTransition,
  canCancel,
  TRANSITIONS,
  PedidoAction,
} from "../../../lib/state-machine";
import { PedidoStatus } from "../../../entities/enums";

describe("state-machine.assertTransition (transições legais)", () => {
  const legalCases: Array<[PedidoStatus, PedidoAction, PedidoStatus]> = [
    [PedidoStatus.ABERTO, "pagar", PedidoStatus.PAGO],
    [PedidoStatus.PAGO, "iniciar-separacao", PedidoStatus.EM_SEPARACAO],
    [
      PedidoStatus.DEVOLVIDO_CAIXA,
      "iniciar-separacao",
      PedidoStatus.EM_SEPARACAO,
    ],
    [PedidoStatus.EM_SEPARACAO, "separar", PedidoStatus.EM_SEPARACAO],
    [PedidoStatus.EM_SEPARACAO, "enviar-montagem", PedidoStatus.LIBERADO],
    [
      PedidoStatus.EM_SEPARACAO,
      "devolver-caixa",
      PedidoStatus.DEVOLVIDO_CAIXA,
    ],
    [PedidoStatus.LIBERADO, "devolver-caixa", PedidoStatus.DEVOLVIDO_CAIXA],
    [PedidoStatus.LIBERADO, "iniciar-montagem", PedidoStatus.EM_MONTAGEM],
    [PedidoStatus.EM_MONTAGEM, "concluir", PedidoStatus.CONCLUIDO],
  ];

  it.each(legalCases)(
    "de '%s' com ação '%s' deve resultar em '%s'",
    (from, action, expected) => {
      expect(assertTransition(from, action)).toBe(expected);
    }
  );

  it("toda transição da tabela TRANSITIONS é coberta pelos casos legais", () => {
    const declared: Array<[string, string, string]> = [];
    (Object.keys(TRANSITIONS) as PedidoAction[]).forEach((action) => {
      const map = TRANSITIONS[action]!;
      (Object.keys(map) as PedidoStatus[]).forEach((from) => {
        declared.push([from, action, map[from]!]);
      });
    });
    // Cada entrada declarada deve estar entre os casos legais testados acima.
    declared.forEach(([from, action, target]) => {
      const match = legalCases.find(
        ([f, a, t]) => f === from && a === action && t === target
      );
      expect(match).toBeDefined();
    });
    // E a quantidade deve bater (nenhuma transição da tabela ficou sem teste).
    expect(declared.length).toBe(legalCases.length);
  });
});

describe("state-machine.assertTransition (cancelar)", () => {
  const cancelaveis: PedidoStatus[] = [
    PedidoStatus.ABERTO,
    PedidoStatus.PAGO,
    PedidoStatus.EM_SEPARACAO,
    PedidoStatus.LIBERADO,
    PedidoStatus.EM_MONTAGEM,
    PedidoStatus.DEVOLVIDO_CAIXA,
  ];

  it.each(cancelaveis)(
    "de '%s' a ação 'cancelar' deve resultar em 'cancelado'",
    (from) => {
      expect(assertTransition(from, "cancelar")).toBe(PedidoStatus.CANCELADO);
    }
  );

  const naoCancelaveis: PedidoStatus[] = [
    PedidoStatus.CONCLUIDO,
    PedidoStatus.CANCELADO,
  ];

  it.each(naoCancelaveis)(
    "de '%s' a ação 'cancelar' deve lançar 409",
    (from) => {
      expect(() => assertTransition(from, "cancelar")).toThrow();
      try {
        assertTransition(from, "cancelar");
        fail("deveria ter lançado");
      } catch (err) {
        expect((err as { statusCode?: number }).statusCode).toBe(409);
      }
    }
  );
});

describe("state-machine.assertTransition (transições ilegais)", () => {
  const illegalCases: Array<[PedidoStatus, PedidoAction]> = [
    [PedidoStatus.PAGO, "pagar"],
    [PedidoStatus.ABERTO, "concluir"],
    [PedidoStatus.EM_SEPARACAO, "iniciar-montagem"],
    [PedidoStatus.ABERTO, "iniciar-separacao"],
    [PedidoStatus.ABERTO, "separar"],
    [PedidoStatus.PAGO, "enviar-montagem"],
    [PedidoStatus.CONCLUIDO, "pagar"],
  ];

  it.each(illegalCases)(
    "de '%s' a ação '%s' deve lançar erro com statusCode 409",
    (from, action) => {
      expect(() => assertTransition(from, action)).toThrow();
      try {
        assertTransition(from, action);
        fail("deveria ter lançado");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as { statusCode?: number }).statusCode).toBe(409);
        expect((err as Error).message).toContain("Transição inválida");
      }
    }
  );
});

describe("state-machine.canCancel", () => {
  it("retorna false para 'concluido'", () => {
    expect(canCancel(PedidoStatus.CONCLUIDO)).toBe(false);
  });

  it("retorna false para 'cancelado'", () => {
    expect(canCancel(PedidoStatus.CANCELADO)).toBe(false);
  });

  it("retorna true para 'aberto'", () => {
    expect(canCancel(PedidoStatus.ABERTO)).toBe(true);
  });

  it.each([
    PedidoStatus.PAGO,
    PedidoStatus.EM_SEPARACAO,
    PedidoStatus.LIBERADO,
    PedidoStatus.EM_MONTAGEM,
    PedidoStatus.DEVOLVIDO_CAIXA,
  ])("retorna true para '%s'", (status) => {
    expect(canCancel(status)).toBe(true);
  });
});
