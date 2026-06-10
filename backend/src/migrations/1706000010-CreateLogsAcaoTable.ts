import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateLogsAcaoTable1706000010000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "logs_acao",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "usuario_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "acao",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "entidade",
            type: "varchar",
            length: "100",
            isNullable: false,
          },
          {
            name: "entidade_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "detalhe",
            type: "text",
            isNullable: true,
          },
          {
            name: "criado_em",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.createForeignKey(
      "logs_acao",
      new TableForeignKey({
        columnNames: ["usuario_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "usuarios",
        onDelete: "SET NULL",
      })
    );

    await queryRunner.query(
      "CREATE INDEX idx_logs_acao_usuario_id ON logs_acao(usuario_id)"
    );
    await queryRunner.query(
      "CREATE INDEX idx_logs_acao_entidade ON logs_acao(entidade, entidade_id)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("logs_acao");
  }
}
