import { AppDataSource } from "../lib/database";
import { LogAcao } from "../entities/LogAcao";
import logger from "../lib/logger";
import { getStore } from "../lib/requestContext";

/**
 * Registra uma ação de auditoria na tabela `logs_acao`.
 *
 * `usuario_id` e `ip` caem para o contexto da requisição (AsyncLocalStorage)
 * quando não informados explicitamente — por isso os call sites existentes nos
 * services não precisam passar IP nem usuário.
 *
 * Logging nunca deve quebrar o fluxo principal: em caso de falha apenas
 * registramos o erro via logger e seguimos (não relança).
 */
export const registrarLog = async (params: {
  usuario_id?: number | null;
  acao: string;
  entidade: string;
  entidade_id?: number | null;
  detalhe?: string | null;
  ip?: string | null;
}): Promise<void> => {
  try {
    const store = getStore();
    const logRepository = AppDataSource.getRepository(LogAcao);

    const log = new LogAcao();
    log.usuario_id = params.usuario_id ?? store?.usuarioId ?? undefined;
    log.acao = params.acao;
    log.entidade = params.entidade;
    log.entidade_id = params.entidade_id ?? undefined;
    log.detalhe = params.detalhe ?? undefined;
    log.ip = params.ip ?? store?.ip ?? undefined;

    await logRepository.save(log);
  } catch (error) {
    logger.error(
      {
        error: (error as Error).message,
        acao: params.acao,
        entidade: params.entidade,
      },
      "Failed to register action log"
    );
  }
};
