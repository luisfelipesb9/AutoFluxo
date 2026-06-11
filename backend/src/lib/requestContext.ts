import { AsyncLocalStorage } from "async_hooks";
import { Request, Response, NextFunction } from "express";

/**
 * Contexto por-requisição para auditoria. Um único middleware o popula no
 * início do pipeline; `logService.registrarLog` lê dele para anexar `ip` e
 * `usuario_id` automaticamente — assim os ~15 call sites de auditoria já
 * existentes ganham essas informações sem alteração ("sem duplicação").
 */
export interface RequestStore {
  usuarioId?: number | null;
  ip?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

export const getStore = (): RequestStore | undefined =>
  requestContext.getStore();

/**
 * Resolve o IP do cliente. Com `app.set("trust proxy", true)`, `req.ip` já
 * considera o `X-Forwarded-For`. Normaliza endereços IPv4 mapeados em IPv6
 * (`::ffff:127.0.0.1` → `127.0.0.1`).
 */
export const getClientIp = (req: Request): string | undefined => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? undefined;
  if (!ip) return undefined;
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
};

/**
 * Inicia o contexto da requisição. Deve ser montado cedo (após o body parser,
 * antes das rotas) para envolver todo o processamento async. O `usuarioId`
 * começa nulo e é preenchido pelo authMiddleware quando o token é validado.
 */
export const requestContextMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  requestContext.run({ ip: getClientIp(req), usuarioId: null }, () => next());
};

const SENSITIVE_KEY =
  /senha|senhahash|token|authorization|secret|password/i;

/**
 * Serializa um detalhe de auditoria em JSON, substituindo qualquer chave
 * sensível (senha, token, etc.) por `[REDACTED]` em qualquer profundidade.
 * Garante que `detalhe` nunca contenha credenciais. Strings são repassadas.
 */
export const sanitizeDetalhe = (detalhe: unknown): string => {
  if (typeof detalhe === "string") return detalhe;

  const seen = new WeakSet<object>();
  const redact = (value: unknown): unknown => {
    if (value === null || typeof value !== "object") return value;
    if (seen.has(value as object)) return undefined;
    seen.add(value as object);
    if (Array.isArray(value)) return value.map(redact);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(val);
    }
    return out;
  };

  return JSON.stringify(redact(detalhe));
};
