export type BankProvider =
  | "TELEBIRR"
  | "CBE"
  | "CBE_BIRR"
  | "AWASH"
  | "BOA"
  | "UNKNOWN";

export interface ParsedPayment {
  provider: BankProvider;
  amount: number;
  currency: string;
  payerName: string;
  payerPhoneOrAcc?: string;
  referenceId: string;
  balanceAfter?: number;
  transactionDate?: string;
  rawMessage: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface BankParser {
  provider: BankProvider;
  canParse(rawMessage: string): boolean;
  parse(rawMessage: string): ParsedPayment | null;
}
