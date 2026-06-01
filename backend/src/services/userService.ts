import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

export type User = {
  id: number;
  nome: string;
  login: string;
  perfil: string;
  senhaHash: string;
};

// TODO: Mover para banco de dados quando connector estiver pronto
const users: User[] = [];

export const findUserByLogin = (login: string): User | undefined => {
  return users.find((user) => user.login === login);
};

export const verifyPassword = async (
  password: string,
  senhaHash: string
): Promise<boolean> => {
  return bcrypt.compare(password, senhaHash);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};
