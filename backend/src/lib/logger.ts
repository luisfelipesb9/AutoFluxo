import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

// O logger sempre emite JSON em stdout. Em desenvolvimento o pretty-print
// fica a cargo do pipe `| pino-pretty` no script `dev` (package.json).
// Evitamos o transport via worker-thread do pino-pretty porque ele falha
// sob ts-node/ts-node-dev (CLIs de migrate/seed e o `npm run dev`) com
// "unable to determine transport target for pino-pretty".
export const logger = pino({
  level: isDev ? "debug" : "info",
});

export default logger;
