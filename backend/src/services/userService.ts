import bcrypt from "bcrypt";
import { AppDataSource } from "../lib/database";
import { User } from "../entities/User";

const SALT_ROUNDS = 12;

export const findUserByLogin = async (login: string): Promise<User | null> => {
  const userRepository = AppDataSource.getRepository(User);
  return userRepository.findOne({ where: { login } });
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const getUserById = async (id: number): Promise<User | null> => {
  const userRepository = AppDataSource.getRepository(User);
  return userRepository.findOne({ where: { id } });
};
