import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["API_PORT"] || "8080";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env["VERCEL"]) {
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

export default app;
