import crypto from "crypto";
import type { EncryptionService } from "../modules/payout/payout.types";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY_LENGTH = 32; // 256 bits

export function createEncryptionService(options: {
  encryptionKey: string; // Base64 encoded 256-bit key
}): EncryptionService {
  const keyBuffer = Buffer.from(options.encryptionKey, "base64");
  
  if (keyBuffer.length !== ENCRYPTION_KEY_LENGTH) {
    throw new Error(`Encryption key must be ${ENCRYPTION_KEY_LENGTH} bytes (256 bits)`);
  }

  return {
    encrypt(plaintext: string): string {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
      
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      
      const authTag = cipher.getAuthTag();
      
      // Format: iv:authTag:ciphertext (all hex encoded)
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    },

    decrypt(ciphertext: string): string {
      const parts = ciphertext.split(":");
      if (parts.length !== 3) {
        throw new Error("Invalid ciphertext format");
      }

      const [ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, keyBuffer, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      
      return decrypted;
    },

    hash(data: string): string {
      return crypto.createHash("sha256").update(data).digest("hex");
    }
  };
}

// Utility to generate a new encryption key
export function generateEncryptionKey(): string {
  return crypto.randomBytes(ENCRYPTION_KEY_LENGTH).toString("base64");
}
