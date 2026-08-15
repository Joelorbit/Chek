import { BankParser, ParsedPayment } from "./types";

export class AbyssiniaParser implements BankParser {
  provider = "BOA" as const;

  canParse(rawMessage: string): boolean {
    const text = rawMessage.toLowerCase();
    return text.includes("abyssinia") || text.includes("bank of abyssinia") || text.includes("boa");
  }

  parse(rawMessage: string): ParsedPayment | null {
    const cleanText = rawMessage.replace(/\s+/g, " ").trim();

    // "Bank of Abyssinia: Account 8492*** credited with ETB 1,000.00 from DAWIT MELESE. Ref: BOA928371."
    const regex =
      /credited with ETB\s*([\d,.]+)\s*(?:by|from)\s*([^.]+?)\.\s*(?:Ref|Txn)[:\s]*([A-Z0-9]+)/i;

    const match = cleanText.match(regex);
    if (match) {
      return {
        provider: "BOA",
        amount: parseFloat(match[1].replace(/,/g, "")),
        currency: "ETB",
        payerName: match[2].trim(),
        referenceId: match[3].trim(),
        rawMessage,
        confidence: "HIGH",
      };
    }
    return null;
  }
}
