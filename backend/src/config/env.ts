const REQUIRED_ENV_KEYS = [
  "NODE_ENV",
  "PORT",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MIDTRANS_SERVER_KEY"
] as const;

const ALLOWED_NODE_ENVS = ["development", "test", "production"] as const;
const TEST_JWT_SECRET = "test-only-jwt-secret-at-least-32-bytes";

type NodeEnv = (typeof ALLOWED_NODE_ENVS)[number];

export type BackendEnv = Readonly<{
  nodeEnv: NodeEnv;
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseTablePrefix: string;
  midtransServerKey: string;
  midtransApiBaseUrl: string;
  digiflazzUsername: string | null;
  digiflazzApiKey: string | null;
  digiflazzApiBaseUrl: string;
  digiflazzWebhookSecret: string | null;
  digiflazzTopupTesting: boolean | undefined;
  digiflazzTopupMaxPrice: number | undefined;
  digiflazzTopupCallbackUrl: string | undefined;
  digiflazzTopupAllowDot: boolean | undefined;
  jwtSecret: string;
  jwtExpiresIn: string;
  passwordHashCost: number;
  corsAllowedOrigins: readonly string[];
  adminBootstrapToken: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
}>;

function isAllowedNodeEnv(value: string): value is NodeEnv {
  return (ALLOWED_NODE_ENVS as readonly string[]).includes(value);
}

function parsePort(rawPort: string): number {
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("[config] Invalid PORT. Expected an integer between 1 and 65535.");
  }

  return port;
}

function parseSupabaseUrl(rawUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("[config] Invalid SUPABASE_URL. Expected a valid http(s) URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("[config] Invalid SUPABASE_URL. Expected a valid http(s) URL.");
  }

  return parsedUrl.toString();
}

function parseHttpUrl(value: string, keyName: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("[config] Invalid " + keyName + ". Expected a valid http(s) URL.");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("[config] Invalid " + keyName + ". Expected a valid http(s) URL.");
  }

  return parsedUrl.toString().replace(/\/$/, "");
}

function parseJwtSecret(rawSecret: string | undefined, nodeEnv: NodeEnv): string {
  const secret = rawSecret?.trim() ?? "";

  if (secret === "") {
    if (nodeEnv === "test") {
      return TEST_JWT_SECRET;
    }

    throw new Error("[config] Missing required environment variables: JWT_SECRET");
  }

  if (secret.length < 32) {
    throw new Error("[config] Invalid JWT_SECRET. Expected at least 32 characters.");
  }

  if (nodeEnv === "production" && /your_value_here|change_me|changeme|test/i.test(secret)) {
    throw new Error("[config] Invalid JWT_SECRET. Production secret must not use placeholder or test values.");
  }

  return secret;
}

function parseJwtExpiresIn(rawValue: string | undefined): string {
  const value = rawValue?.trim() ?? "1h";

  if (!/^\d+(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error("[config] Invalid JWT_EXPIRES_IN. Expected values like 15m, 1h, or 7d.");
  }

  return value;
}

function parsePasswordHashCost(rawValue: string | undefined, nodeEnv: NodeEnv): number {
  const fallback = nodeEnv === "test" ? "4" : "12";
  const value = Number(rawValue?.trim() === "" || rawValue === undefined ? fallback : rawValue);

  if (!Number.isInteger(value) || value < 4 || value > 15) {
    throw new Error("[config] Invalid PASSWORD_HASH_COST. Expected an integer between 4 and 15.");
  }

  if (nodeEnv === "production" && value < 12) {
    throw new Error("[config] Invalid PASSWORD_HASH_COST. Production cost must be at least 12.");
  }

  return value;
}

function parseCorsAllowedOrigins(rawValue: string | undefined): readonly string[] {
  const value = rawValue?.trim() ?? "";

  if (value === "") {
    return [];
  }

  return value.split(",").map((origin) => parseHttpUrl(origin.trim(), "CORS_ALLOWED_ORIGINS"));
}

function parseAdminBootstrapToken(rawValue: string | undefined, nodeEnv: NodeEnv): string | null {
  const value = rawValue?.trim() ?? "";

  if (value === "") {
    return null;
  }

  if (value.length < 32 || (nodeEnv === "production" && /your_value_here|change_me|changeme|test/i.test(value))) {
    throw new Error("[config] Invalid ADMIN_BOOTSTRAP_TOKEN. Expected a non-placeholder token of at least 32 characters.");
  }

  return value;
}

function parseOptionalBoolean(rawValue: string | undefined, keyName: string): boolean | undefined {
  const value = rawValue?.trim().toLowerCase() ?? "";

  if (value === "") {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  throw new Error("[config] Invalid " + keyName + ". Expected true or false.");
}

function parseOptionalPositiveInteger(rawValue: string | undefined, keyName: string): number | undefined {
  const value = rawValue?.trim() ?? "";

  if (value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw new Error("[config] Invalid " + keyName + ". Expected a positive integer.");
  }

  return parsedValue;
}

function parseOptionalPort(rawValue: string | undefined, keyName: string): number | null {
  const value = rawValue?.trim() ?? "";

  if (value === "") {
    return null;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 65535) {
    throw new Error("[config] Invalid " + keyName + ". Expected an integer between 1 and 65535.");
  }

  return parsedValue;
}

function parseOptionalEmail(rawValue: string | undefined, keyName: string): string | null {
  const value = rawValue?.trim() ?? "";

  if (value === "") {
    return null;
  }

  if (!value.includes("@")) {
    throw new Error("[config] Invalid " + keyName + ". Expected an email address.");
  }

  return value;
}

function parseOptionalText(rawValue: string | undefined): string | null {
  const value = rawValue?.trim() ?? "";
  return value === "" ? null : value;
}

function parseOptionalHttpUrl(rawValue: string | undefined, keyName: string): string | undefined {
  const value = rawValue?.trim() ?? "";

  if (value === "") {
    return undefined;
  }

  return parseHttpUrl(value, keyName);
}


export function readEnv(rawEnv: NodeJS.ProcessEnv = process.env): BackendEnv {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = rawEnv[key];
    return value === undefined || value.trim() === "";
  });

  if (missingKeys.length > 0) {
    throw new Error("[config] Missing required environment variables: " + missingKeys.join(", "));
  }

  const nodeEnvRaw = rawEnv.NODE_ENV;
  if (nodeEnvRaw === undefined || !isAllowedNodeEnv(nodeEnvRaw)) {
    throw new Error(
      "[config] Invalid NODE_ENV \"" + nodeEnvRaw + "\". Expected one of: " + ALLOWED_NODE_ENVS.join(", ") + "."
    );
  }

  const portRaw = rawEnv.PORT;
  if (portRaw === undefined) {
    throw new Error("[config] Missing required environment variables: PORT");
  }

  const supabaseUrlRaw = rawEnv.SUPABASE_URL;
  if (supabaseUrlRaw === undefined) {
    throw new Error("[config] Missing required environment variables: SUPABASE_URL");
  }

  const supabaseServiceRoleKeyRaw = rawEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseServiceRoleKeyRaw === undefined) {
    throw new Error("[config] Missing required environment variables: SUPABASE_SERVICE_ROLE_KEY");
  }

  const midtransServerKeyRaw = rawEnv.MIDTRANS_SERVER_KEY;
  if (midtransServerKeyRaw === undefined || midtransServerKeyRaw.trim() === "") {
    throw new Error("[config] Missing required environment variables: MIDTRANS_SERVER_KEY");
  }

  const midtransApiBaseUrlRaw = rawEnv.MIDTRANS_API_BASE_URL ?? "https://app.sandbox.midtrans.com";
  const digiflazzApiBaseUrlRaw = rawEnv.DIGIFLAZZ_API_BASE_URL ?? "https://api.digiflazz.com";
  const digiflazzUsernameRaw = rawEnv.DIGIFLAZZ_USERNAME?.trim() ?? "";
  const digiflazzApiKeyRaw = rawEnv.DIGIFLAZZ_API_KEY?.trim() ?? "";
  const digiflazzWebhookSecretRaw = rawEnv.DIGIFLAZZ_WEBHOOK_SECRET?.trim() ?? "";

  return {
    nodeEnv: nodeEnvRaw,
    port: parsePort(portRaw),
    supabaseUrl: parseSupabaseUrl(supabaseUrlRaw),
    supabaseServiceRoleKey: supabaseServiceRoleKeyRaw,
    supabaseTablePrefix: rawEnv.SUPABASE_TABLE_PREFIX?.trim() ?? "",
    midtransServerKey: midtransServerKeyRaw,
    midtransApiBaseUrl: parseHttpUrl(midtransApiBaseUrlRaw, "MIDTRANS_API_BASE_URL"),
    digiflazzUsername: digiflazzUsernameRaw === "" ? null : digiflazzUsernameRaw,
    digiflazzApiKey: digiflazzApiKeyRaw === "" ? null : digiflazzApiKeyRaw,
    digiflazzApiBaseUrl: parseHttpUrl(digiflazzApiBaseUrlRaw, "DIGIFLAZZ_API_BASE_URL"),
    digiflazzWebhookSecret: digiflazzWebhookSecretRaw === "" ? null : digiflazzWebhookSecretRaw,
    digiflazzTopupTesting: parseOptionalBoolean(rawEnv.DIGIFLAZZ_TOPUP_TESTING, "DIGIFLAZZ_TOPUP_TESTING"),
    digiflazzTopupMaxPrice: parseOptionalPositiveInteger(rawEnv.DIGIFLAZZ_TOPUP_MAX_PRICE, "DIGIFLAZZ_TOPUP_MAX_PRICE"),
    digiflazzTopupCallbackUrl: parseOptionalHttpUrl(rawEnv.DIGIFLAZZ_TOPUP_CALLBACK_URL, "DIGIFLAZZ_TOPUP_CALLBACK_URL"),
    digiflazzTopupAllowDot: parseOptionalBoolean(rawEnv.DIGIFLAZZ_TOPUP_ALLOW_DOT, "DIGIFLAZZ_TOPUP_ALLOW_DOT"),
    jwtSecret: parseJwtSecret(rawEnv.JWT_SECRET, nodeEnvRaw),
    jwtExpiresIn: parseJwtExpiresIn(rawEnv.JWT_EXPIRES_IN),
    passwordHashCost: parsePasswordHashCost(rawEnv.PASSWORD_HASH_COST, nodeEnvRaw),
    corsAllowedOrigins: parseCorsAllowedOrigins(rawEnv.CORS_ALLOWED_ORIGINS),
    adminBootstrapToken: parseAdminBootstrapToken(rawEnv.ADMIN_BOOTSTRAP_TOKEN, nodeEnvRaw),
    smtpHost: parseOptionalText(rawEnv.SMTP_HOST),
    smtpPort: parseOptionalPort(rawEnv.SMTP_PORT, "SMTP_PORT"),
    smtpUser: parseOptionalText(rawEnv.SMTP_USER),
    smtpPassword: parseOptionalText(rawEnv.SMTP_PASSWORD),
    smtpFromEmail: parseOptionalEmail(rawEnv.SMTP_FROM_EMAIL, "SMTP_FROM_EMAIL"),
    smtpFromName: parseOptionalText(rawEnv.SMTP_FROM_NAME)
  };
}

