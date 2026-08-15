import crypto from "crypto";

export function signPayload(payload: string | object, secret: string): string {
  const data = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function verifySignature(payload: string | object, signature: string, secret: string): boolean {
  const expectedSignature = signPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}
