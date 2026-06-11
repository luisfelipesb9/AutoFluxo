import { AppDataSource } from "../lib/database";
import { User } from "../entities/User";
import { AppError } from "../lib/AppError";
import { registrarLog } from "../services/logService";
import { AuditAction, AuditEntity } from "../lib/auditActions";
import { hashPassword } from "../services/userService";
import {
  CreateUsuarioRequest,
  UpdateUsuarioRequest,
} from "../schemas/usuario";

/**
 * Representação segura de um usuário para respostas da API.
 * NUNCA inclui `senhaHash`.
 */
export interface UsuarioPublico {
  id: number;
  nome: string;
  login: string;
  perfil: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}

/**
 * Remove `senhaHash` (e qualquer outro campo sensível) de uma entidade User,
 * mapeando para o contrato público em snake_case. Deve ser usado em TODA
 * resposta que devolve dados de usuário.
 */
export const sanitizeUsuario = (u: User): UsuarioPublico => ({
  id: u.id,
  nome: u.nome,
  login: u.login,
  perfil: u.perfil,
  ativo: u.ativo,
  criado_em: u.criadoEm,
  atualizado_em: u.atualizadoEm,
});

const repo = () => AppDataSource.getRepository(User);

export const listarUsuarios = async (): Promise<UsuarioPublico[]> => {
  const usuarios = await repo().find({ order: { id: "ASC" } });
  return usuarios.map(sanitizeUsuario);
};

export const buscarUsuario = async (id: number): Promise<UsuarioPublico> => {
  const usuario = await repo().findOne({ where: { id } });
  if (!usuario) {
    throw new AppError(404, "Usuário não encontrado");
  }
  return sanitizeUsuario(usuario);
};

export const criarUsuario = async (
  data: CreateUsuarioRequest,
  autorId?: number
): Promise<UsuarioPublico> => {
  const userRepository = repo();

  const existente = await userRepository.findOne({
    where: { login: data.login },
  });
  if (existente) {
    throw new AppError(409, "Login já cadastrado");
  }

  const usuario = userRepository.create({
    nome: data.nome,
    login: data.login,
    senhaHash: await hashPassword(data.senha),
    perfil: data.perfil,
    ativo: true,
  });

  const salvo = await userRepository.save(usuario);

  await registrarLog({
    usuario_id: autorId,
    acao: AuditAction.USUARIO_CRIAR,
    entidade: AuditEntity.USUARIO,
    entidade_id: salvo.id,
  });

  return sanitizeUsuario(salvo);
};

export const atualizarUsuario = async (
  id: number,
  data: UpdateUsuarioRequest,
  autorId?: number
): Promise<UsuarioPublico> => {
  const userRepository = repo();

  const usuario = await userRepository.findOne({ where: { id } });
  if (!usuario) {
    throw new AppError(404, "Usuário não encontrado");
  }

  if (data.nome !== undefined) usuario.nome = data.nome;
  if (data.perfil !== undefined) usuario.perfil = data.perfil;
  if (data.ativo !== undefined) usuario.ativo = data.ativo;

  const salvo = await userRepository.save(usuario);

  await registrarLog({
    usuario_id: autorId,
    acao: AuditAction.USUARIO_ATUALIZAR,
    entidade: AuditEntity.USUARIO,
    entidade_id: salvo.id,
  });

  return sanitizeUsuario(salvo);
};

export const resetarSenha = async (
  id: number,
  senha: string,
  autorId?: number
): Promise<void> => {
  const userRepository = repo();

  const usuario = await userRepository.findOne({ where: { id } });
  if (!usuario) {
    throw new AppError(404, "Usuário não encontrado");
  }

  usuario.senhaHash = await hashPassword(senha);
  await userRepository.save(usuario);

  await registrarLog({
    usuario_id: autorId,
    acao: AuditAction.USUARIO_RESET_SENHA,
    entidade: AuditEntity.USUARIO,
    entidade_id: usuario.id,
  });
};

export const desativarUsuario = async (
  id: number,
  autorId?: number
): Promise<void> => {
  const userRepository = repo();

  const usuario = await userRepository.findOne({ where: { id } });
  if (!usuario) {
    throw new AppError(404, "Usuário não encontrado");
  }

  // Soft delete: apenas marca como inativo, preservando o registro.
  usuario.ativo = false;
  await userRepository.save(usuario);

  await registrarLog({
    usuario_id: autorId,
    acao: AuditAction.USUARIO_DESATIVAR,
    entidade: AuditEntity.USUARIO,
    entidade_id: usuario.id,
  });
};
