"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
function toErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown startup error.";
}
function bootstrap() {
    const env = (0, env_1.readEnv)();
    const app = (0, app_1.createApp)({
        supabaseConfig: {
            supabaseUrl: env.supabaseUrl,
            supabaseServiceRoleKey: env.supabaseServiceRoleKey
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
    server.on("error", (error) => {
        console.error(`[startup] ${error.message}`);
        process.exit(1);
    });
}
try {
    bootstrap();
}
catch (error) {
    console.error(`[startup] ${toErrorMessage(error)}`);
    process.exit(1);
}
