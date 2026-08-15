import { BankParser, ParsedPayment } from "./types";

export class CbeParser implements BankParser {
  provider = "CBE" as const;

  canParse(rawMessage: string): boolean {
    const text = rawMessage.toLowerCase();
    if (
      text.includes("awash") ||
      text.includes("abyssinia") ||
      text.includes("boa") ||
      text.includes("cbebirr") ||
      text.includes("cbe birr") ||
      text.includes("telebirr")
    ) {
      return false;
    }

    return (
      text.includes("cbe") ||
      text.includes("commercial bank of ethiopia") ||
      (text.includes("credited with etb") && (text.includes("ref") || text.includes("ft"))) ||
      (text.includes("የሂሳብ ቁጥር") && text.includes("ገቢ ተደርጓል")) ||
      /\bft[a-z0-9]+/i.test(rawMessage)
    );
  }

  parse(rawMessage: string): ParsedPayment | null {
    const cleanText = rawMessage.replace(/\s+/g, " ").trim();

    // Pattern 1: Standard CBE Mobile Banking Credit Alert (with 1000... 13-digit account)
    // "Dear Customer, your account 1000123456789 has been credited with ETB 1,500.00 by BIRUK TADESSE. Ref: FT242289912039. Current balance is ETB 45,210.00."
    const standardRegex =
      /(?:Dear\s+([^,]+),\s*)?your (?:account|Account)\s*([\d*]+)\s*has been (?:credited with|Credited with)\s*ETB\s*([\d,.]+)\s*(?:on\s*[\d\-:\s/]+)?\s*(?:by|from)\s*([^.]+?)\.\s*(?:Ref|Txn ID|Reference|Txn)[:\s]*([A-Z0-9]+)(?:\.\s*(?:Current balance is|Balance:|Bal:)\s*ETB\s*([\d,.]+))?/i;

    const match = cleanText.match(standardRegex);
    if (match) {
      const accNo = match[2]?.trim();
      const amountStr = match[3].replace(/,/g, "");
      const payerName = match[4].trim();
      const refId = match[5].trim();
      const balanceStr = match[6] ? match[6].replace(/,/g, "") : undefined;

      return {
        provider: "CBE",
        amount: parseFloat(amountStr),
        currency: "ETB",
        payerName,
        payerPhoneOrAcc: accNo,
        referenceId: refId,
        balanceAfter: balanceStr ? parseFloat(balanceStr) : undefined,
        rawMessage,
        confidence: "HIGH",
      };
    }

    // Pattern 2: Direct Transfer / Branch Deposit Format
    // "Your account 1000284719203 has been credited with ETB 3,000.00 from TESFAYE GIRMA. Reference: FT262271892019."
    const directRegex =
      /Your (?:account|Account)\s*([\d*]+)\s*has been credited with ETB\s*([\d,.]+)\s*(?:from|by)\s*([^.]+?)\.\s*(?:Reference|Ref|Txn)[:\s]*([A-Z0-9]+)/i;
    const directMatch = cleanText.match(directRegex);
    if (directMatch) {
      return {
        provider: "CBE",
        amount: parseFloat(directMatch[2].replace(/,/g, "")),
        currency: "ETB",
        payerName: directMatch[3].trim(),
        payerPhoneOrAcc: directMatch[1].trim(),
        referenceId: directMatch[4].trim(),
        rawMessage,
        confidence: "HIGH",
      };
    }

    // Pattern 3: Short CBE Alert
    // "Account ***123 credited ETB 800.00 by KEBEDE KASSA. Ref: FT83920192. Bal: ETB 9,000.00"
    const shortRegex =
      /Account\s*([\d*]+)\s*(?:credited with|credited)\s*ETB\s*([\d,.]+)\s*(?:by|from)\s*([^.]+?)\.\s*(?:Ref|Txn)[:\s]*([A-Z0-9]+)/i;
    const shortMatch = cleanText.match(shortRegex);
    if (shortMatch) {
      return {
        provider: "CBE",
        amount: parseFloat(shortMatch[2].replace(/,/g, "")),
        currency: "ETB",
        payerName: shortMatch[3].trim(),
        payerPhoneOrAcc: shortMatch[1].trim(),
        referenceId: shortMatch[4].trim(),
        rawMessage,
        confidence: "HIGH",
      };
    }

    // Pattern 4: Fallback extraction
    const amountMatch = cleanText.match(/ETB\s*([\d,.]+)/i);
    const refMatch =
      cleanText.match(/(?:Ref|Txn|Reference)[:\s]*([A-Z0-9]{6,})/i) ||
      cleanText.match(/\b(FT[A-Z0-9]+)\b/i);
    const payerMatch = cleanText.match(/(?:by|from)\s+([A-Z\s]{3,30})(?:\.|\s+Ref)/i);
    const accMatch = cleanText.match(/\b(1000[\d*]{6,9})\b/);

    if (amountMatch && refMatch) {
      return {
        provider: "CBE",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        currency: "ETB",
        payerName: payerMatch ? payerMatch[1].trim() : "CBE Depositor",
        payerPhoneOrAcc: accMatch ? accMatch[1] : undefined,
        referenceId: refMatch[1].trim(),
        rawMessage,
        confidence: "MEDIUM",
      };
    }

    return null;
  }
}
