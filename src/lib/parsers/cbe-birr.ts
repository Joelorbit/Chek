import { BankParser, ParsedPayment } from "./types";

export class CbeBirrParser implements BankParser {
  provider = "CBE_BIRR" as const;

  canParse(rawMessage: string): boolean {
    const text = rawMessage.toLowerCase();
    return text.includes("cbebirr") || text.includes("cbe birr") || (text.includes("cbe-birr") && text.includes("received"));
  }

  parse(rawMessage: string): ParsedPayment | null {
    const cleanText = rawMessage.replace(/\s+/g, " ").trim();

    // "You have received ETB 300.00 from 251911223344 (SELAM TESFAYE). Trans ID: CBEB938291. Balance: ETB 2,500.00"
    const regex =
      /received\s*ETB\s*([\d,.]+)\s*from\s*([\d+*]+)?\s*(?:\(([^)]+)\))?\s*.*?(?:Trans ID|Txn|Ref)[:\s]*([A-Z0-9]+)/i;

    const match = cleanText.match(regex);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ""));
      const phone = match[2]?.trim();
      const name = match[3]?.trim() || phone || "CBE Birr User";
      const ref = match[4]?.trim();

      return {
        provider: "CBE_BIRR",
        amount,
        currency: "ETB",
        payerName: name,
        payerPhoneOrAcc: phone,
        referenceId: ref,
        rawMessage,
        confidence: "HIGH",
      };
    }
    return null;
  }
}
