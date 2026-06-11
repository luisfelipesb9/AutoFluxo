import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Índice em logs_acao(criado_em DESC): beneficia GET /api/admin/logs
 * (ORDER BY criado_em DESC + paginação — evita o sort) e o R6 de performance
 * (filtro por range de datas em criado_em).
 */
export class AddIndexLogsAcaoCriadoEm1706000013000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_logs_acao_criado_em ON logs_acao (criado_em DESC)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_logs_acao_criado_em`);
  }
}
