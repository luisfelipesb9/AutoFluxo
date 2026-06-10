import { AppDataSource } from "../lib/database";
import { LogAcao } from "../entities/LogAcao";
import logger from "../lib/logger";

/**
 * Registra uma ação de auditoria na tabela `logs_acao`.
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
}): Promise<void> => {
  try {
    const logRepository = AppDataSource.getRepository(LogAcao);

    const log = new LogAcao();
    log.usuario_id = params.usuario_id ?? undefined;
    log.acao = params.acao;
    log.entidade = params.entidade;
    log.entidade_id = params.entidade_id ?? undefined;
    log.detalhe = params.detalhe ?? undefined;

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
