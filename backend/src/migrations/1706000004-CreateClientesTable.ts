import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateClientesTable1706000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "clientes",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "nome",
            type: "varchar",
            length: "150",
            isNullable: false,
          },
          {
            name: "telefone",
            type: "varchar",
            length: "30",
            isNullable: false,
          },
          {
            name: "ativo",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "criado_em",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "atualizado_em",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true
    );

    await queryRunner.query("CREATE INDEX idx_clientes_nome ON clientes(nome)");
    await queryRunner.query(
      "CREATE INDEX idx_clientes_telefone ON clientes(telefone)"
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("clientes");
  }
}
