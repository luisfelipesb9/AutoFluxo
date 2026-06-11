import { Request, Response } from "express";

type Row = Record<string, unknown>;

// BOM UTF-8: sem ele, o Excel (no Windows/pt-BR) interpreta o CSV como ANSI e
// corrompe os acentos. Prefixado na resposta de download.
export const UTF8_BOM = "﻿";

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Serializa linhas (objetos homogêneos) em CSV. As colunas são as chaves do
 * primeiro objeto. Sem dependência externa. Saída pura, sem BOM (o BOM é
 * adicionado por `sendReport`, que é quem entrega o arquivo).
 */
export const toCsv = (rows: Row[]): string => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(",")
  );
  return [headers.join(","), ...lines].join("\n");
};

const dateForFilename = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Responde um relatório em JSON (padrão) ou CSV quando o header
 * `Accept: text/csv` é enviado. O CSV vem como anexo
 * `relatorio_<tipo>_<YYYY-MM-DD>.csv`, prefixado com BOM UTF-8.
 */
export const sendReport = (
  req: Request,
  res: Response,
  tipo: string,
  rows: Row[]
): void => {
  const accept = req.headers.accept ?? "";
  if (accept.includes("text/csv")) {
    const filename = `relatorio_${tipo}_${dateForFilename(new Date())}.csv`;
    res
      .status(200)
      .type("text/csv")
      .set("Content-Disposition", `attachment; filename="${filename}"`)
      .send(UTF8_BOM + toCsv(rows));
    return;
  }
  res.status(200).json(rows);
};
