"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
(0, globals_1.describe)("GET /health", () => {
    (0, globals_1.it)("returns 200 and status ok", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).get("/health");
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toEqual({ status: "ok" });
        (0, globals_1.expect)(response.headers["content-type"]).toContain("application/json");
    });
});
