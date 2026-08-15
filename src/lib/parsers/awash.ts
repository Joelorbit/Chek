import { BankParser, ParsedPayment } from "./types";

export class AwashParser implements BankParser {
  provider = "AWASH" as const;

  canParse(rawMessage: string): boolean {
    const text = rawMessage.toLowerCase();
    return text.includes("awash") || text.includes("awash bank");
  }

  parse(rawMessage: string): ParsedPayment | null {
    const cleanText = rawMessage.replace(/\s+/g, " ").trim();

    // "Awash Bank: Your account 01304812345600 has been credited with ETB 750.00 from KASSAHUN GEMECHU. Ref: AWB849201."
    const regex =
      /(?:account\s*([\d*]+)\s*has been\s*)?credited with ETB\s*([\d,.]+)\s*(?:by|from)\s*([^.]+?)\.\s*(?:Ref|Txn)[:\s]*([A-Z0-9]+)/i;

    const match = cleanText.match(regex);
    if (match) {
      return {
        provider: "AWASH",
        amount: parseFloat(match[2].replace(/,/g, "")),
        currency: "ETB",
        payerName: match[3].trim(),
        payerPhoneOrAcc: match[1] ? match[1].trim() : undefined,
        referenceId: match[4].trim(),
        rawMessage,
        confidence: "HIGH",
      };
    }
    return null;
  }
}
