import { ValueTransformer } from "typeorm";

/**
 * TypeORM retorna colunas `numeric`/`decimal` como string (preserva precisão).
 * Este transformer converte para number na leitura, evitando bugs de
 * concatenação ("10" + "5" = "105") em cálculos de total/subtotal e
 * garantindo que a API serialize valores monetários como número.
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null | undefined =>
    value === null || value === undefined ? value : Number(value),
};
