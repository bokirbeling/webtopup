"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readEnv = readEnv;
const REQUIRED_ENV_KEYS = [
    "NODE_ENV",
    "PORT",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "MIDTRANS_SERVER_KEY"
];
const ALLOWED_NODE_ENVS = ["development", "test", "production"];
function isAllowedNodeEnv(value) {
    return ALLOWED_NODE_ENVS.includes(value);
}
function parsePort(rawPort) {
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("[config] Invalid PORT. Expected an integer between 1 and 65535.");
    }
    return port;
}
function parseSupabaseUrl(rawUrl) {
    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl);
    }
    catch {
        throw new Error("[config] Invalid SUPABASE_URL. Expected a valid http(s) URL.");
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("[config] Invalid SUPABASE_URL. Expected a valid http(s) URL.");
    }
    return parsedUrl.toString();
}
function parseHttpUrl(value, keyName) {
    let parsedUrl;
    try {
        parsedUrl = new URL(value);
    }
    catch {
        throw new Error(`[config] Invalid ${keyName}. Expected a valid http(s) URL.`);
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error(`[config] Invalid ${keyName}. Expected a valid http(s) URL.`);
    }
    return parsedUrl.toString().replace(/\/$/, "");
}
function readEnv(rawEnv = process.env) {
    const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
        const value = rawEnv[key];
        return value === undefined || value.trim() === "";
    });
    if (missingKeys.length > 0) {
        throw new Error(`[config] Missing required environment variables: ${missingKeys.join(", ")}`);
    }
    const nodeEnvRaw = rawEnv.NODE_ENV;
    if (nodeEnvRaw === undefined || !isAllowedNodeEnv(nodeEnvRaw)) {
        throw new Error(`[config] Invalid NODE_ENV "${nodeEnvRaw}". Expected one of: ${ALLOWED_NODE_ENVS.join(", ")}.`);
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
    return {
        nodeEnv: nodeEnvRaw,
        port: parsePort(portRaw),
        supabaseUrl: parseSupabaseUrl(supabaseUrlRaw),
        supabaseServiceRoleKey: supabaseServiceRoleKeyRaw,
        midtransServerKey: midtransServerKeyRaw,
        midtransApiBaseUrl: parseHttpUrl(midtransApiBaseUrlRaw, "MIDTRANS_API_BASE_URL"),
        digiflazzUsername: digiflazzUsernameRaw === "" ? null : digiflazzUsernameRaw,
        digiflazzApiKey: digiflazzApiKeyRaw === "" ? null : digiflazzApiKeyRaw,
        digiflazzApiBaseUrl: parseHttpUrl(digiflazzApiBaseUrlRaw, "DIGIFLAZZ_API_BASE_URL")
    };
}
