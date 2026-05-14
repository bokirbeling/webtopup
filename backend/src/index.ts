import { createApp } from "./app";
import { readEnv } from "./config/env";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown startup error.";
}

function bootstrap() {
  const env = readEnv();
  const app = createApp({
    supabaseConfig: {
      supabaseUrl: env.supabaseUrl,
      supabaseServiceRoleKey: env.supabaseServiceRoleKey,
      tablePrefix: env.supabaseTablePrefix === "" ? undefined : env.supabaseTablePrefix
    },
    midtransConfig: {
      serverKey: env.midtransServerKey,
      apiBaseUrl: env.midtransApiBaseUrl
    },
    digiflazzConfig: {
      username: env.digiflazzUsername,
      apiKey: env.digiflazzApiKey,
      apiBaseUrl: env.digiflazzApiBaseUrl,
      nodeEnv: env.nodeEnv
    }
  });
  const host = "0.0.0.0";

  const server = app.listen(env.port, host, () => {
    console.log(`[startup] backend is listening on http://${host}:${env.port} (${env.nodeEnv})`);
  });

  server.on("error", (error: Error) => {
    console.error(`[startup] ${error.message}`);
    process.exit(1);
  });
}

try {
  bootstrap();
} catch (error) {
  console.error(`[startup] ${toErrorMessage(error)}`);
  process.exit(1);
}
