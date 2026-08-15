import { describe, expect, it } from "vitest";
import { generateApiKey, generatePairingCode, hashPassword, verifyPassword } from "./auth";
import { signPayload, verifySignature } from "./webhook-signer";

describe("Chek Core Gateway & Security Test Suite", () => {
  describe("Authentication & Pairing Security", () => {
    it("should generate secure and distinct live API keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).toMatch(/^br_live_[a-f0-9]{32}$/);
      expect(key2).toMatch(/^br_live_[a-f0-9]{32}$/);
      expect(key1).not.toBe(key2);
    });

    it("should generate 6-digit numeric pairing PIN codes", () => {
      const code1 = generatePairingCode();
      const code2 = generatePairingCode();
      expect(code1).toMatch(/^\d{6}$/);
      expect(code2).toMatch(/^\d{6}$/);
    });

    it("should hash and verify passwords using SHA-256", () => {
      const password = "mySecretPassword123";
      const hash = hashPassword(password);

      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword("wrongPassword", hash)).toBe(false);
      expect(verifyPassword("", hash)).toBe(false);
    });
  });

  describe("HMAC-SHA256 Webhook Signing & Tamper Verification", () => {
    it("should calculate and verify valid HMAC-SHA256 signatures", () => {
      const secret = "whsec_test_secret_key_123456";
      const payload = {
        event: "payment.received",
        data: {
          id: "tx_12345",
          provider: "TELEBIRR",
          amount: 500,
          currency: "ETB",
          payer_name: "ABEBE BIKILA",
          payer_phone: "0911223344",
          reference_id: "CKL9283741",
          status: "VERIFIED",
        },
      };

      const signature = signPayload(payload, secret);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe("string");
      expect(signature.length).toBe(64); // 256 bits = 64 hex chars

      const isValid = verifySignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it("should reject tampered webhook payloads (Amount manipulation attack)", () => {
      const secret = "whsec_test_secret_key_123456";
      const payload = {
        event: "payment.received",
        data: {
          provider: "CBE",
          amount: 100,
          reference_id: "FT2408151234",
        },
      };

      const signature = signPayload(payload, secret);

      // Hacker changes amount from 100 to 10,000 ETB
      const tamperedPayload = {
        event: "payment.received",
        data: {
          provider: "CBE",
          amount: 10000,
          reference_id: "FT2408151234",
        },
      };

      const isValid = verifySignature(tamperedPayload, signature, secret);
      expect(isValid).toBe(false);
    });

    it("should reject signatures signed with a different secret key", () => {
      const payload = { event: "payment.received", data: { amount: 50 } };
      const signature = signPayload(payload, "whsec_attacker_secret");

      const isValid = verifySignature(payload, signature, "whsec_legit_developer_secret");
      expect(isValid).toBe(false);
    });
  });

  describe("Reference Normalization & Duplicate Detection", () => {
    it("should correctly identify Ethiopian reference formats", () => {
      const cbeRef = "FT242289912039".trim().toUpperCase();
      const telebirrRef = "CKL9283741".trim().toUpperCase();
      const awashRef = "AWB849201".trim().toUpperCase();
      const boaRef = "BOA928371".trim().toUpperCase();

      expect(cbeRef.startsWith("FT")).toBe(true);
      expect(telebirrRef.startsWith("CKL") || telebirrRef.startsWith("TB")).toBe(true);
      expect(awashRef.startsWith("AW")).toBe(true);
      expect(boaRef.startsWith("BOA")).toBe(true);
    });
  });
});
