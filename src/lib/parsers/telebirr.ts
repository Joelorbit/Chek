import { BankParser, ParsedPayment } from "./types";

export class TelebirrParser implements BankParser {
  provider = "TELEBIRR" as const;

  canParse(rawMessage: string): boolean {
    const text = rawMessage.toLowerCase();
    return (
      text.includes("telebirr") ||
      (text.includes("you have received etb") && (text.includes("transaction") || text.includes("txn"))) ||
      (text.includes("payment of etb") && text.includes("received from")) ||
      (text.includes("ከ") && text.includes("ደርሶዎታል") && text.includes("ግብይት ቁጥር")) ||
      /\b(ckl|tb)[a-z0-9]+/i.test(rawMessage)
    );
  }

  parse(rawMessage: string): ParsedPayment | null {
    const cleanText = rawMessage.replace(/\s+/g, " ").trim();

    // Pattern 1: Standard English P2P Transfer (with 09... or 07... or 251... phone)
    // "You have received ETB 500.00 from ABEBE BIKILA (0911223344) with transaction number CKL9283741 on 2026-08-15 14:30:22. Your current balance is ETB 12,450.00."
    const p2pRegex =
      /You have received ETB\s*([\d,.]+)\s*from\s*([^(]+?)(?:\s*\(([\d*+\s]+)\))?\s*with transaction (?:number|ID|no)\s*([A-Z0-9]+)(?:\s*on\s*([\d\-:\s/]+))?(?:\.\s*Your (?:current )?balance is ETB\s*([\d,.]+))?/i;

    const p2pMatch = cleanText.match(p2pRegex);
    if (p2pMatch) {
      const amountStr = p2pMatch[1].replace(/,/g, "");
      const payerName = p2pMatch[2].trim();
      const payerPhone = p2pMatch[3] ? p2pMatch[3].trim().replace(/\s+/g, "") : undefined;
      const refId = p2pMatch[4].trim();
      const dateStr = p2pMatch[5] ? p2pMatch[5].trim() : undefined;
      const balanceStr = p2pMatch[6] ? p2pMatch[6].replace(/,/g, "") : undefined;

      return {
        provider: "TELEBIRR",
        amount: parseFloat(amountStr),
        currency: "ETB",
        payerName,
        payerPhoneOrAcc: payerPhone,
        referenceId: refId,
        balanceAfter: balanceStr ? parseFloat(balanceStr) : undefined,
        transactionDate: dateStr,
        rawMessage,
        confidence: "HIGH",
      };
    }

    // Pattern 2: Telebirr Merchant / Business Payment
    // "Payment of ETB 1,200.00 received from YONAS BEKELE (0922334455). Transaction ID: CKL839201. Your balance: ETB 8,400.00."
    const merchantRegex =
      /Payment of ETB\s*([\d,.]+)\s*received from\s*([^(]+?)(?:\s*\(([\d*+\s]+)\))?\.\s*(?:Transaction ID|Txn ID|Ref)[:\s]*([A-Z0-9]+)(?:\.\s*(?:Your )?balance[:\s]*ETB\s*([\d,.]+))?/i;
    const merchantMatch = cleanText.match(merchantRegex);
    if (merchantMatch) {
      return {
        provider: "TELEBIRR",
        amount: parseFloat(merchantMatch[1].replace(/,/g, "")),
        currency: "ETB",
        payerName: merchantMatch[2].trim(),
        payerPhoneOrAcc: merchantMatch[3] ? merchantMatch[3].trim() : undefined,
        referenceId: merchantMatch[4].trim(),
        balanceAfter: merchantMatch[5] ? parseFloat(merchantMatch[5].replace(/,/g, "")) : undefined,
        rawMessage,
        confidence: "HIGH",
      };
    }

    // Pattern 3: Short Telebirr Push Notification
    // "Received ETB 250.00 from HAGOS TESFAYE. Txn: CKL392819. Balance: ETB 1,500.00"
    const shortRegex =
      /(?:Received|received)\s*ETB\s*([\d,.]+)\s*from\s*([^.]+?)(?:\.|\s+)(?:Txn|Txn ID|Transaction No|Ref|with transaction number)[:\s]*([A-Z0-9]+)/i;
    const shortMatch = cleanText.match(shortRegex);
    if (shortMatch) {
      return {
        provider: "TELEBIRR",
        amount: parseFloat(shortMatch[1].replace(/,/g, "")),
        currency: "ETB",
        payerName: shortMatch[2].trim(),
        referenceId: shortMatch[3].trim(),
        rawMessage,
        confidence: "HIGH",
      };
    }

    // Pattern 4: Robust fallback extraction
    const amountMatch = cleanText.match(/ETB\s*([\d,.]+)/i);
    const refMatch =
      cleanText.match(/(?:transaction number|Transaction ID|Txn|Ref|ቁጥር)[:\s]*([A-Z0-9]{6,})/i) ||
      cleanText.match(/\b((?:CKL|TB)[A-Z0-9]+)\b/i);
    const payerMatch = cleanText.match(/(?:from|ከ)\s+([A-Z\s]{3,30})(?:\(|\.|\swith)/i);
    const phoneMatch = cleanText.match(/\b(09\d{8}|07\d{8}|\+?251[79]\d{8})\b/);

    if (amountMatch && refMatch) {
      return {
        provider: "TELEBIRR",
        amount: parseFloat(amountMatch[1].replace(/,/g, "")),
        currency: "ETB",
        payerName: payerMatch ? payerMatch[1].trim() : "Telebirr Customer",
        payerPhoneOrAcc: phoneMatch ? phoneMatch[1] : undefined,
        referenceId: refMatch[1].trim(),
        rawMessage,
        confidence: "MEDIUM",
      };
    }

    return null;
  }
}
