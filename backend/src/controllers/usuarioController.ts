import { Request, Response, NextFunction } from "express";
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  resetSenhaSchema,
} from "../schemas/usuario";
import {
  listarUsuarios,
  buscarUsuario,
  criarUsuario,
  atualizarUsuario,
  resetarSenha,
  desativarUsuario,
} from "../services/usuarioService";

/**
 * Controllers do CRUD administrativo de usuários.
 *
 * Padrão: validar com Zod, delegar ao service e devolver a resposta já
 * sanitizada (services nunca retornam `senhaHash`). Erros são propagados via
 * `next(err)` para o errorHandler central (AppError → 4xx, ZodError → 400).
 */

const parseId = (raw: string): number => Number.parseInt(raw, 10);

export const list = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const usuarios = await listarUsuarios();
    res.status(200).json(usuarios);
  } catch (err) {
    next(err);
  }
};

export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const usuario = await buscarUsuario(parseId(req.params.id));
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = createUsuarioSchema.parse(req.body);
    const usuario = await criarUsuario(data, req.user?.id);
    res.status(201).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const update = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data = updateUsuarioSchema.parse(req.body);
    const usuario = await atualizarUsuario(
      parseId(req.params.id),
      data,
      req.user?.id
    );
    res.status(200).json(usuario);
  } catch (err) {
    next(err);
  }
};

export const resetSenha = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { senha } = resetSenhaSchema.parse(req.body);
    await resetarSenha(parseId(req.params.id), senha, req.user?.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await desativarUsuario(parseId(req.params.id), req.user?.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
