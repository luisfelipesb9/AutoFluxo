import { Request, Response } from "express";

type Row = Record<string, unknown>;

const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const s = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Serializa linhas (objetos homogêneos) em CSV. As colunas são as chaves do
 * primeiro objeto. Sem dependência externa.
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
 * `relatorio_<tipo>_<YYYY-MM-DD>.csv`.
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
      .send(toCsv(rows));
    return;
  }
  res.status(200).json(rows);
};
