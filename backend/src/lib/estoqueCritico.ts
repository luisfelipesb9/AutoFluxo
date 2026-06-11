/**
 * Ponto único de verdade da regra "estoque crítico": peça ATIVA cujo estoque
 * já furou o mínimo (`estoque < minimo`). Daí `qtd_faltante = minimo - estoque`
 * é sempre > 0.
 *
 * Dois endpoints consomem esta regra, de propósito diferente — por isso ambos
 * existem, mas compartilham ESTA definição para nunca divergirem:
 *  - GET /api/pecas/estoque-critico  → operacional, todos os perfis, entidade
 *    Peça completa, ordenado por nome (consulta no dia a dia).
 *  - GET /api/relatorios/estoque-critico → admin-only, JSON+CSV, subset com
 *    qtd_faltante, ordenado por qtd_faltante DESC (relatório gerencial).
 *
 * @param prefix alias/qualificador da coluna: "peca" no QueryBuilder do
 *               pecaService; "" (vazio) no SQL cru do relatorioService.
 */
export const estoqueCriticoWhere = (prefix = ""): string => {
  const p = prefix ? `${prefix}.` : "";
  return `${p}ativo = true AND ${p}estoque < ${p}minimo`;
};
