import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateMovimentacaoEstoqueTable1706000009000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "movimentacao_estoque",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "peca_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "tipo",
            type: "varchar",
            length: "20",
            isNullable: false,
          },
          {
            name: "qtd",
            type: "int",
            isNullable: false,
          },
          {
            name: "pedido_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "item_id",
            type: "int",
            isNullable: true,
          },
          {
            name: "usuario_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "observacao",
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
      "movimentacao_estoque",
      new TableForeignKey({
        columnNames: ["peca_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "pecas",
      })
    );

    await queryRunner.createForeignKey(
      "movimentacao_estoque",
      new TableForeignKey({
        columnNames: ["usuario_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "usuarios",
      })
    );

    await queryRunner.query(
      "CREATE INDEX idx_movimentacao_estoque_peca_id ON movimentacao_estoque(peca_id)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("movimentacao_estoque");
  }
}
