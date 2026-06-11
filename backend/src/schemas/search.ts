import { z } from "zod";

export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Informe a consulta")
    .max(500, "Consulta muito longa"),
});

export type SearchRequest = z.infer<typeof searchSchema>;
