import { createApp } from "./app";
import { readEnv, type BackendEnv } from "./config/env";
import { createSmtpEmailVerificationSender } from "./modules/auth/email-verification.sender";
import { type EmailVerificationSender } from "./modules/auth/auth.service";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown startup error.";
}

function createEmailVerificationSender(env: BackendEnv): EmailVerificationSender | undefined {
  const values = [env.smtpHost, env.smtpPort, env.smtpUser, env.smtpPassword, env.smtpFromEmail, env.smtpFromName];
  const configuredValues = values.filter((value) => value !== null);

  if (configuredValues.length === 0) {
    return undefined;
  }

  if (
    env.smtpHost === null ||
    env.smtpPort === null ||
    env.smtpUser === null ||
    env.smtpPassword === null ||
    env.smtpFromEmail === null ||
    env.smtpFromName === null
  ) {
    throw new Error("[config] SMTP sender config is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL, and SMTP_FROM_NAME together.");
  }

  return createSmtpEmailVerificationSender({
    host: env.smtpHost,
    port: env.smtpPort,
    user: env.smtpUser,
    password: env.smtpPassword,
    fromEmail: env.smtpFromEmail,
    fromName: env.smtpFromName
  });
}

function bootstrap() {
  const env = readEnv();
  const app = createApp({
    supabaseConfig: {
      url: env.supabaseUrl,
      serviceRoleKey: env.supabaseServiceRoleKey,
      tablePrefix: env.supabaseTablePrefix === "" ? undefined : env.supabaseTablePrefix
    },
    authConfig: {
      jwtSecret: env.jwtSecret,
      jwtExpiresIn: env.jwtExpiresIn,
      passwordHashCost: env.passwordHashCost
    },
    emailVerificationSender: createEmailVerificationSender(env),
    midtransConfig: {
      clientKey: "", // Not needed for backend
      merchantId: "", // Not needed for backend
      serverKey: env.midtransServerKey,
      apiBaseUrl: env.midtransApiBaseUrl
    },
    digiflazzConfig: {
      username: env.digiflazzUsername,
      apiKey: env.digiflazzApiKey,
      apiBaseUrl: env.digiflazzApiBaseUrl,
      nodeEnv: env.nodeEnv,
      webhookSecret: env.digiflazzWebhookSecret,
      topupOptions: {
        testing: env.digiflazzTopupTesting,
        maxPrice: env.digiflazzTopupMaxPrice,
        callbackUrl: env.digiflazzTopupCallbackUrl,
        allowDot: env.digiflazzTopupAllowDot
      }
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
