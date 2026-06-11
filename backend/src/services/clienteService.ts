import { AppDataSource } from "../lib/database";
import { Cliente } from "../entities/Cliente";
import { Veiculo } from "../entities/Veiculo";
import { AppError } from "../lib/AppError";
import { registrarLog } from "./logService";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import {
  CreateClienteRequest,
  UpdateClienteRequest,
  CreateVeiculoRequest,
} from "../schemas/cliente";

/**
 * Lista clientes (cada um COM seus veículos). Se `q` for informado, busca por
 * nome OU telefone OU placa de qualquer veículo.
 *
 * Busca por placa retorna o cliente DONO do veículo: a query junta `veiculos`
 * apenas para descobrir QUAIS clientes casam (selecionando `c.id` distinto via
 * leftJoin em "c.veiculos"). Em seguida carregamos esses clientes com a relação
 * `veiculos` completa — assim o cliente volta com TODOS os seus veículos, não
 * só a placa que casou no filtro.
 */
export const listarClientes = async (q?: string): Promise<Cliente[]> => {
  const clienteRepository = AppDataSource.getRepository(Cliente);

  if (q && q.trim() !== "") {
    const termo = `%${q.trim()}%`;

    // Passo 1: descobrir os ids dos clientes que casam (join em veiculos só
    // para filtrar pela placa). Distinct para não duplicar por veículo.
    const matched = await clienteRepository
      .createQueryBuilder("c")
      .leftJoin("c.veiculos", "v")
      .where("c.nome ILIKE :q OR c.telefone ILIKE :q OR v.placa ILIKE :q", {
        q: termo,
      })
      .select("c.id", "id")
      .distinct(true)
      .getRawMany<{ id: number }>();

    const ids = matched.map((row) => row.id);
    if (ids.length === 0) {
      return [];
    }

    // Passo 2: carregar os clientes casados com TODOS os seus veículos.
    return clienteRepository.find({
      where: ids.map((id) => ({ id })),
      relations: { veiculos: true },
      order: { id: "ASC" },
    });
  }

  return clienteRepository.find({
    relations: { veiculos: true },
    order: { id: "ASC" },
  });
};

export const buscarClientePorId = async (id: number): Promise<Cliente> => {
  const clienteRepository = AppDataSource.getRepository(Cliente);

  const cliente = await clienteRepository.findOne({
    where: { id },
    relations: { veiculos: true },
  });

  if (!cliente) {
    throw new AppError(404, "Cliente não encontrado");
  }

  return cliente;
};

export const criarCliente = async (
  data: CreateClienteRequest,
  usuarioId?: number
): Promise<Cliente> => {
  const clienteRepository = AppDataSource.getRepository(Cliente);

  const cliente = clienteRepository.create({
    nome: data.nome,
    telefone: data.telefone,
    ativo: true,
  });

  const salvo = await clienteRepository.save(cliente);

  await registrarLog({
    usuario_id: usuarioId ?? null,
    acao: AuditAction.CLIENTE_CRIAR,
    entidade: AuditEntity.CLIENTE,
    entidade_id: salvo.id,
    detalhe: `Cliente "${salvo.nome}" criado`,
  });

  return salvo;
};

export const atualizarCliente = async (
  id: number,
  data: UpdateClienteRequest,
  usuarioId?: number
): Promise<Cliente> => {
  const clienteRepository = AppDataSource.getRepository(Cliente);

  const cliente = await clienteRepository.findOne({ where: { id } });
  if (!cliente) {
    throw new AppError(404, "Cliente não encontrado");
  }

  if (data.nome !== undefined) cliente.nome = data.nome;
  if (data.telefone !== undefined) cliente.telefone = data.telefone;
  if (data.ativo !== undefined) cliente.ativo = data.ativo;

  const salvo = await clienteRepository.save(cliente);

  await registrarLog({
    usuario_id: usuarioId ?? null,
    acao: AuditAction.CLIENTE_ATUALIZAR,
    entidade: AuditEntity.CLIENTE,
    entidade_id: salvo.id,
    detalhe: `Cliente "${salvo.nome}" atualizado`,
  });

  return salvo;
};

/**
 * Adiciona um veículo ao cliente. Um cliente tem MUITOS veículos, então isso
 * sempre cria um novo registro em `veiculos` (append), nunca substitui.
 * 404 se o cliente não existir.
 */
export const adicionarVeiculo = async (
  clienteId: number,
  data: CreateVeiculoRequest,
  usuarioId?: number
): Promise<Veiculo> => {
  const clienteRepository = AppDataSource.getRepository(Cliente);
  const veiculoRepository = AppDataSource.getRepository(Veiculo);

  const cliente = await clienteRepository.findOne({ where: { id: clienteId } });
  if (!cliente) {
    throw new AppError(404, "Cliente não encontrado");
  }

  const veiculo = veiculoRepository.create({
    cliente_id: clienteId,
    placa: data.placa,
    modelo: data.modelo,
    ano: data.ano,
  });

  const salvo = await veiculoRepository.save(veiculo);

  await registrarLog({
    usuario_id: usuarioId ?? null,
    acao: AuditAction.VEICULO_CRIAR,
    entidade: AuditEntity.VEICULO,
    entidade_id: salvo.id,
    detalhe: `Veículo "${salvo.placa}" adicionado ao cliente ${clienteId}`,
  });

  return salvo;
};
