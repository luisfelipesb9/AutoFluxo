/**
 * Erro de aplicação com status HTTP semântico.
 *
 * Lançado pelos services/controllers e formatado pelo errorHandler:
 * vira `res.status(statusCode).json({ error: message, ...(code && { code }) })`.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(400, message, code);
  }

  static notFound(message: string, code?: string): AppError {
    return new AppError(404, message, code);
  }

  static conflict(message: string, code?: string): AppError {
    return new AppError(409, message, code);
  }
}
