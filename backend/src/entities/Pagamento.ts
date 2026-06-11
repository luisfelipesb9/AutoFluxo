import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
import { numericTransformer } from "./transformers";

@Entity("pagamentos")
export class Pagamento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  pedido_id!: number;

  @Column({ unique: true })
  numero_nf!: number;

  @Column()
  forma_pagamento!: string;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  valor!: number;

  @Column()
  caixa_id!: number;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;
}
