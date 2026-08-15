import { AbyssiniaParser } from "./abyssinia";
import { AwashParser } from "./awash";
import { CbeParser } from "./cbe";
import { CbeBirrParser } from "./cbe-birr";
import { TelebirrParser } from "./telebirr";
import { BankParser, ParsedPayment } from "./types";

export * from "./types";

const registeredParsers: BankParser[] = [
  new TelebirrParser(),
  new CbeParser(),
  new CbeBirrParser(),
  new AwashParser(),
  new AbyssiniaParser(),
];

/**
 * Checks if a message is a private/personal SMS or OTP rather than a valid incoming payment.
 * On-device privacy protection guard.
 */
export function isNonPaymentMessage(text: string): boolean {
  const lower = text.toLowerCase();

  // Filter 2FA / Login OTPs
  if (
    lower.includes("verification code") ||
    lower.includes("otp") ||
    lower.includes("do not share this code") ||
    lower.includes("secret pin") ||
    lower.includes("password reset")
  ) {
    return true;
  }

  // Filter Outgoing debits (when the user sends money instead of receiving)
  if (
    lower.includes("you have transferred") ||
    lower.includes("debited with etb") ||
    lower.includes("you bought") ||
    lower.includes("you have paid")
  ) {
    return true;
  }

  return false;
}

/**
 * Universal dispatcher that parses any incoming bank SMS or notification string
 */
export function parseBankMessage(rawMessage: string): ParsedPayment | null {
  if (!rawMessage || typeof rawMessage !== "string") {
    return null;
  }

  // First check if it's a private message or outgoing debit
  if (isNonPaymentMessage(rawMessage)) {
    return null;
  }

  // Try matching with registered bank parsers
  for (const parser of registeredParsers) {
    if (parser.canParse(rawMessage)) {
      const parsed = parser.parse(rawMessage);
      if (parsed) {
        return parsed;
      }
    }
  }

  // Fallback: Try all parsers even if canParse returned false
  for (const parser of registeredParsers) {
    const parsed = parser.parse(rawMessage);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}
