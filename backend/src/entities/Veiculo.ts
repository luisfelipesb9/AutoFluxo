import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Cliente } from "./Cliente";

@Entity("veiculos")
export class Veiculo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  cliente_id!: number;

  @Column()
  placa!: string;

  @Column({ nullable: true })
  modelo?: string;

  @Column({ type: "int", nullable: true })
  ano?: number;

  @ManyToOne(() => Cliente, (c) => c.veiculos, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cliente_id" })
  cliente!: Cliente;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;
}
