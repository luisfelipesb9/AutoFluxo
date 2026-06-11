import { PedidoStatus } from "../entities/enums";

/**
 * State machine for the Pedido (order) lifecycle.
 *
 * ERROR CONTRACT (read by Agent B's errorHandler):
 *   `assertTransition` throws a plain `Error` with a `statusCode = 409` property
 *   attached via `Object.assign`. The error handler reads `err.statusCode` to map
 *   the response status. This keeps this module decoupled from Agent B's AppError.
 *
 * Allowed transitions (from + action -> target status):
 *   - pagar:             aberto          -> pago
 *   - iniciar-separacao: pago            -> em_separacao
 *                        devolvido_caixa -> em_separacao
 *   - separar:           em_separacao    -> em_separacao   (no status change)
 *   - enviar-montagem:   em_separacao    -> liberado
 *   - devolver-caixa:    em_separacao    -> devolvido_caixa
 *                        liberado        -> devolvido_caixa
 *   - iniciar-montagem:  liberado        -> em_montagem
 *   - concluir:          em_montagem     -> concluido
 *   - cancelar:          any status except `concluido` / `cancelado` -> cancelado
 *                        (handled by `canCancel`, not the static TRANSITIONS map)
 */
export type PedidoAction =
  | "pagar"
  | "cancelar"
  | "iniciar-separacao"
  | "separar"
  | "enviar-montagem"
  | "devolver-caixa"
  | "iniciar-montagem"
  | "concluir";

/**
 * Static transition table: TRANSITIONS[action][fromStatus] = targetStatus.
 * `cancelar` is intentionally absent here — it is dynamic (see `canCancel`).
 */
export const TRANSITIONS: Partial<
  Record<PedidoAction, Partial<Record<PedidoStatus, PedidoStatus>>>
> = {
  pagar: {
    [PedidoStatus.ABERTO]: PedidoStatus.PAGO,
  },
  "iniciar-separacao": {
    [PedidoStatus.PAGO]: PedidoStatus.EM_SEPARACAO,
    [PedidoStatus.DEVOLVIDO_CAIXA]: PedidoStatus.EM_SEPARACAO,
  },
  separar: {
    [PedidoStatus.EM_SEPARACAO]: PedidoStatus.EM_SEPARACAO,
  },
  "enviar-montagem": {
    [PedidoStatus.EM_SEPARACAO]: PedidoStatus.LIBERADO,
  },
  "devolver-caixa": {
    [PedidoStatus.EM_SEPARACAO]: PedidoStatus.DEVOLVIDO_CAIXA,
    [PedidoStatus.LIBERADO]: PedidoStatus.DEVOLVIDO_CAIXA,
  },
  "iniciar-montagem": {
    [PedidoStatus.LIBERADO]: PedidoStatus.EM_MONTAGEM,
  },
  concluir: {
    [PedidoStatus.EM_MONTAGEM]: PedidoStatus.CONCLUIDO,
  },
};

/**
 * A pedido can be cancelled from any status except a terminal one
 * (already concluded or already cancelled).
 */
export function canCancel(status: PedidoStatus): boolean {
  return status !== PedidoStatus.CONCLUIDO && status !== PedidoStatus.CANCELADO;
}

/**
 * Build the 409 error carrying the `statusCode` property consumed by the
 * error handler.
 */
function invalidTransition(from: PedidoStatus, action: PedidoAction): Error {
  const msg = `Transição inválida: não é possível '${action}' a partir de '${from}'`;
  return Object.assign(new Error(msg), { statusCode: 409 });
}

/**
 * Returns the target status if the transition is legal, otherwise throws a
 * 409 error (see ERROR CONTRACT above).
 */
export function assertTransition(
  from: PedidoStatus,
  action: PedidoAction
): PedidoStatus {
  if (action === "cancelar") {
    if (canCancel(from)) {
      return PedidoStatus.CANCELADO;
    }
    throw invalidTransition(from, action);
  }

  const target = TRANSITIONS[action]?.[from];
  if (target === undefined) {
    throw invalidTransition(from, action);
  }
  return target;
}
