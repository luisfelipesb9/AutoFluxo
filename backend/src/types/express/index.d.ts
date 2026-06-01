declare namespace Express {
  export interface Request {
    user?: {
      id: number;
      login: string;
      perfil: string;
    };
  }
}
