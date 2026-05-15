import { Socket } from "node:net";
import { connect as tlsConnect, type TLSSocket } from "node:tls";

import { type EmailVerificationSender, type EmailVerificationMessage } from "./auth.service";

export type SmtpEmailVerificationSenderConfig = Readonly<{
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}>;

type SmtpSocket = Socket | TLSSocket;

function encodeHeader(value: string): string {
  return "=?UTF-8?B?" + Buffer.from(value, "utf8").toString("base64") + "?=";
}

function escapeDataLine(line: string): string {
  return line.startsWith(".") ? "." + line : line;
}

function buildVerificationEmail(config: SmtpEmailVerificationSenderConfig, message: EmailVerificationMessage): string {
  const verificationUrl = "https://adnanpay.com/dashboard";
  const body = [
    "Halo,",
    "",
    "Gunakan token berikut untuk verifikasi email Adnanpay:",
    message.token,
    "",
    "Token berlaku sampai " + message.expiresAt.toISOString() + ".",
    "Buka " + verificationUrl + " lalu masukkan token ini pada alur verifikasi email.",
    "",
    "Jika kamu tidak meminta verifikasi ini, abaikan email ini."
  ].join("\r\n");

  return [
    "From: " + encodeHeader(config.fromName) + " <" + config.fromEmail + ">",
    "To: <" + message.to + ">",
    "Subject: " + encodeHeader("Verifikasi email Adnanpay"),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    ...body.split("\r\n").map(escapeDataLine)
  ].join("\r\n");
}

function readSmtpResponse(socket: SmtpSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    function cleanup() {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    }

    function onError(error: Error) {
      cleanup();
      reject(error);
    }

    function onClose() {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly."));
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\r\n").filter((line) => line !== "");
      if (lines.length > 0 && /^\d{3} /.test(lines[lines.length - 1])) {
        cleanup();
        resolve(buffer);
      }
    }

    socket.on("data", onData);
    socket.on("error", onError);
    socket.on("close", onClose);
  });
}

async function expectSmtpCode(socket: SmtpSocket, expectedCodes: readonly string[]): Promise<string> {
  const response = await readSmtpResponse(socket);
  if (!expectedCodes.some((code) => response.startsWith(code))) {
    throw new Error("Unexpected SMTP response: " + response.trim());
  }

  return response;
}

async function writeCommand(socket: SmtpSocket, command: string, expectedCodes: readonly string[]): Promise<void> {
  socket.write(command + "\r\n");
  await expectSmtpCode(socket, expectedCodes);
}

function connectImplicitTls(config: SmtpEmailVerificationSenderConfig): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const socket = tlsConnect({ host: config.host, port: config.port, servername: config.host }, () => resolve(socket));
    socket.once("error", reject);
  });
}

export function createSmtpEmailVerificationSender(config: SmtpEmailVerificationSenderConfig): EmailVerificationSender {
  return {
    async sendVerificationEmail(message: EmailVerificationMessage): Promise<void> {
      const socket = await connectImplicitTls(config);

      try {
        await expectSmtpCode(socket, ["220"]);
        await writeCommand(socket, "EHLO adnanpay.com", ["250"]);
        await writeCommand(socket, "AUTH PLAIN " + Buffer.from("\0" + config.user + "\0" + config.password, "utf8").toString("base64"), ["235"]);
        await writeCommand(socket, "MAIL FROM:<" + config.fromEmail + ">", ["250"]);
        await writeCommand(socket, "RCPT TO:<" + message.to + ">", ["250", "251"]);
        await writeCommand(socket, "DATA", ["354"]);
        socket.write(buildVerificationEmail(config, message) + "\r\n.\r\n");
        await expectSmtpCode(socket, ["250"]);
        socket.write("QUIT\r\n");
      } finally {
        socket.end();
      }
    }
  };
}
