import crypto from "crypto";
import { db } from "./db";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "birrrelay_salt_2026").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateApiKey(): string {
  return "br_live_" + crypto.randomBytes(16).toString("hex");
}

export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateSecret(): string {
  return "whsec_" + crypto.randomBytes(24).toString("hex");
}

export async function validateApiKey(apiKey: string | null) {
  if (!apiKey) return null;
  return db.user.findUnique({
    where: { apiKey },
  });
}

export async function validateDeviceToken(deviceToken: string | null) {
  if (!deviceToken) return null;
  return db.device.findUnique({
    where: { deviceToken },
    include: { user: true },
  });
}
