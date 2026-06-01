import { Request, Response } from "express";
import { getWelcomeMessage } from "../services/exampleService";

export const getRoot = (req: Request, res: Response) => {
  res.json({
    message: getWelcomeMessage(),
    user: req.user ?? null,
  });
};
