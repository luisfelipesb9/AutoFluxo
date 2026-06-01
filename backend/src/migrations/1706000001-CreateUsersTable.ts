import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUsersTable1706000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "usuarios",
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
            name: "login",
            type: "varchar",
            length: "50",
            isUnique: true,
            isNullable: false,
          },
          {
            name: "senhaHash",
            type: "varchar",
            length: "255",
            isNullable: false,
          },
          {
            name: "perfil",
            type: "varchar",
            length: "50",
            default: "'USER'",
            isNullable: false,
          },
          {
            name: "ativo",
            type: "boolean",
            default: true,
            isNullable: false,
          },
          {
            name: "criadoEm",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "atualizadoEm",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("usuarios");
  }
}
