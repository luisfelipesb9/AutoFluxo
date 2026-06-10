import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateItensPedidoTable1706000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "itens_pedido",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "pedido_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "peca_id",
            type: "int",
            isNullable: false,
          },
          {
            name: "qtd",
            type: "int",
            isNullable: false,
          },
          {
            name: "qtd_confirmada",
            type: "int",
            isNullable: true,
          },
          {
            name: "preco_unitario",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: "subtotal",
            type: "numeric",
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
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
      "itens_pedido",
      new TableForeignKey({
        columnNames: ["pedido_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "pedidos",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "itens_pedido",
      new TableForeignKey({
        columnNames: ["peca_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "pecas",
      })
    );

    await queryRunner.query(
      "CREATE INDEX idx_itens_pedido_pedido_id ON itens_pedido(pedido_id)"
    );
    await queryRunner.query(
      "CREATE INDEX idx_itens_pedido_peca_id ON itens_pedido(peca_id)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("itens_pedido");
  }
}
