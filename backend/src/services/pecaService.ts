import { AppDataSource } from "../lib/database";
import { Peca } from "../entities/Peca";
import { AppError } from "../lib/AppError";
import { registrarLog } from "./logService";
import { estoqueCriticoWhere } from "../lib/estoqueCritico";
import type { CreatePecaRequest, UpdatePecaRequest } from "../schemas/peca";

/**
 * Lista peças. Quando `q` é informado, faz match case-insensitive em
 * nome OU codigo via ILIKE (`%q%`).
 */
export const listarPecas = async (q?: string): Promise<Peca[]> => {
  const pecaRepository = AppDataSource.getRepository(Peca);

  if (q && q.trim().length > 0) {
    return pecaRepository
      .createQueryBuilder("peca")
      .where("peca.nome ILIKE :q OR peca.codigo ILIKE :q", { q: `%${q}%` })
      .orderBy("peca.nome", "ASC")
      .getMany();
  }

  return pecaRepository.find({ order: { nome: "ASC" } });
};

/**
 * Retorna peças com estoque crítico (regra compartilhada em
 * `lib/estoqueCritico`: ativa e `estoque < minimo`). Versão operacional:
 * entidade completa, ordenada por nome, liberada a todos os perfis.
 */
export const listarEstoqueCritico = async (): Promise<Peca[]> => {
  const pecaRepository = AppDataSource.getRepository(Peca);

  return pecaRepository
    .createQueryBuilder("peca")
    .where(estoqueCriticoWhere("peca"))
    .orderBy("peca.nome", "ASC")
    .getMany();
};

export const buscarPecaPorId = async (id: number): Promise<Peca> => {
  const pecaRepository = AppDataSource.getRepository(Peca);
  const peca = await pecaRepository.findOne({ where: { id } });

  if (!peca) {
    throw new AppError(404, "Peça não encontrada");
  }

  return peca;
};

/**
 * Busca peça por código (case-insensitive). Usado no pré-check de unicidade.
 */
const buscarPorCodigo = async (codigo: string): Promise<Peca | null> => {
  const pecaRepository = AppDataSource.getRepository(Peca);

  return pecaRepository
    .createQueryBuilder("peca")
    .where("peca.codigo ILIKE :codigo", { codigo })
    .getOne();
};

export const criarPeca = async (
  data: CreatePecaRequest,
  usuarioId?: number
): Promise<Peca> => {
  const pecaRepository = AppDataSource.getRepository(Peca);

  const existente = await buscarPorCodigo(data.codigo);
  if (existente) {
    throw new AppError(409, "Já existe uma peça com este código");
  }

  const peca = pecaRepository.create({
    codigo: data.codigo,
    nome: data.nome,
    estoque: data.estoque ?? 0,
    minimo: data.minimo ?? 0,
    preco: data.preco,
    ativo: data.ativo ?? true,
  });

  const salva = await pecaRepository.save(peca);

  await registrarLog({
    usuario_id: usuarioId,
    acao: "peca.criar",
    entidade: "peca",
    entidade_id: salva.id,
    detalhe: `Peça ${salva.codigo} criada`,
  });

  return salva;
};

export const atualizarPeca = async (
  id: number,
  data: UpdatePecaRequest,
  usuarioId?: number
): Promise<Peca> => {
  const pecaRepository = AppDataSource.getRepository(Peca);

  const peca = await pecaRepository.findOne({ where: { id } });
  if (!peca) {
    throw new AppError(404, "Peça não encontrada");
  }

  if (data.codigo !== undefined && data.codigo !== peca.codigo) {
    const colisao = await buscarPorCodigo(data.codigo);
    if (colisao && colisao.id !== id) {
      throw new AppError(409, "Já existe uma peça com este código");
    }
    peca.codigo = data.codigo;
  }

  if (data.nome !== undefined) peca.nome = data.nome;
  if (data.estoque !== undefined) peca.estoque = data.estoque;
  if (data.minimo !== undefined) peca.minimo = data.minimo;
  if (data.preco !== undefined) peca.preco = data.preco;
  if (data.ativo !== undefined) peca.ativo = data.ativo;

  const salva = await pecaRepository.save(peca);

  await registrarLog({
    usuario_id: usuarioId,
    acao: "peca.atualizar",
    entidade: "peca",
    entidade_id: salva.id,
    detalhe: `Peça ${salva.codigo} atualizada`,
  });

  return salva;
};
