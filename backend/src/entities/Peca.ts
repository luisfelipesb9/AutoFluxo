import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { numericTransformer } from "./transformers";

@Entity("pecas")
export class Peca {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  codigo!: string;

  @Column()
  nome!: string;

  @Column({ type: "int", default: 0 })
  estoque!: number;

  @Column({ type: "int", default: 0 })
  minimo!: number;

  @Column({ type: "numeric", precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  preco!: number;

  @Column({ default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;

  @UpdateDateColumn({ name: "atualizado_em" })
  atualizado_em!: Date;
}
