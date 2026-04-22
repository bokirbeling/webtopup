import express from "express";

import { healthRouter } from "./routes/health";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use("/health", healthRouter);

  return app;
}
