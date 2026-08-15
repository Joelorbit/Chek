import { describe, expect, it } from "vitest";
import { generateApiKey, generatePairingCode, hashPassword, verifyPassword } from "./auth";
import { signPayload, verifySignature } from "./webhook-signer";

describe("BirrRelay Core Backend & Security Suite", () => {
  it("should generate secure and distinct API keys and pairing codes", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();
    expect(key1).toMatch(/^br_live_[a-f0-9]{32}$/);
    expect(key1).not.toBe(key2);

    const code = generatePairingCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("should hash and verify passwords correctly", () => {
    const password = "mySecretPassword123";
    const hash = hashPassword(password);

    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("wrongPassword", hash)).toBe(false);
  });

  it("should calculate and verify HMAC-SHA256 signatures for tamper-proof webhooks", () => {
    const secret = "whsec_test_secret_key_123456";
    const payload = {
      event: "payment.received",
      data: {
        provider: "TELEBIRR",
        amount: 500,
        reference_id: "CKL9283741",
      },
    };

    const signature = signPayload(payload, secret);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe("string");

    const isValid = verifySignature(payload, signature, secret);
    expect(isValid).toBe(true);

    // Tampered payload should fail
    const tamperedPayload = {
      ...payload,
      data: { ...payload.data, amount: 5000 },
    };
    const isTamperedValid = verifySignature(tamperedPayload, signature, secret);
    expect(isTamperedValid).toBe(false);
  });
});
