import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("logs_acao")
export class LogAcao {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int", nullable: true })
  usuario_id?: number;

  @Column()
  acao!: string;

  @Column()
  entidade!: string;

  @Column({ type: "int", nullable: true })
  entidade_id?: number;

  @Column({ type: "text", nullable: true })
  detalhe?: string;

  @Column({ type: "varchar", length: 45, nullable: true })
  ip?: string;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;
}
