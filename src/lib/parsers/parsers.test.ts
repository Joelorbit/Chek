import { describe, expect, it } from "vitest";
import { parseBankMessage, isNonPaymentMessage } from "./index";

describe("Ethiopian Bank Parsers Test Suite", () => {
  describe("Telebirr Parser Suite (127 Sender)", () => {
    it("should parse standard English P2P transfer with 09 phone", () => {
      const msg =
        "You have received ETB 500.00 from ABEBE BIKILA (0911223344) with transaction number CKL9283741 on 2026-08-15 14:30:22. Your current balance is ETB 12,450.00.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("TELEBIRR");
      expect(result?.amount).toBe(500);
      expect(result?.payerName).toBe("ABEBE BIKILA");
      expect(result?.payerPhoneOrAcc).toBe("0911223344");
      expect(result?.referenceId).toBe("CKL9283741");
      expect(result?.balanceAfter).toBe(12450);
    });

    it("should parse Telebirr transfer with 07 phone prefix", () => {
      const msg =
        "You have received ETB 250.00 from SAMUEL TADDESE (0712345678) with transaction number TB2408151234 on 2026-08-15. Your current balance is ETB 1,250.00.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("TELEBIRR");
      expect(result?.amount).toBe(250);
      expect(result?.payerName).toBe("SAMUEL TADDESE");
      expect(result?.payerPhoneOrAcc).toBe("0712345678");
      expect(result?.referenceId).toBe("TB2408151234");
    });

    it("should parse Telebirr with country code prefix 2519...", () => {
      const msg =
        "You have received ETB 100.00 from MUKTAR HASSEN (+251911998877) with transaction number CKL1029384 on 2026-08-15.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("TELEBIRR");
      expect(result?.amount).toBe(100);
      expect(result?.payerName).toBe("MUKTAR HASSEN");
      expect(result?.referenceId).toBe("CKL1029384");
    });

    it("should parse formatted numbers with commas and decimals", () => {
      const msg =
        "You have received ETB 12,500.50 from BIRUK TADESSE (0944112233) with transaction number CKL8829102 on 2026-08-15. Your current balance is ETB 45,000.00.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.amount).toBe(12500.5);
      expect(result?.referenceId).toBe("CKL8829102");
    });

    it("should parse short Telebirr notification variant", () => {
      const msg = "Received ETB 250.00 from HAGOS TESFAYE. Txn: CKL392819. Balance: ETB 1,500.00";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("TELEBIRR");
      expect(result?.amount).toBe(250);
      expect(result?.payerName).toBe("HAGOS TESFAYE");
      expect(result?.referenceId).toBe("CKL392819");
    });

    it("should parse Telebirr merchant payment format", () => {
      const msg =
        "Payment of ETB 1,200.00 received from YONAS BEKELE (0922334455). Transaction ID: CKL839201. Your balance: ETB 8,400.00.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("TELEBIRR");
      expect(result?.amount).toBe(1200);
      expect(result?.payerName).toBe("YONAS BEKELE");
      expect(result?.referenceId).toBe("CKL839201");
    });
  });

  describe("CBE (Commercial Bank of Ethiopia) Parser Suite", () => {
    it("should parse standard CBE Mobile banking credit SMS with full 13-digit account", () => {
      const msg =
        "Dear Customer, your account 1000123456789 has been credited with ETB 1,500.00 by BIRUK TADESSE. Ref: FT242289912039. Current balance is ETB 45,210.00.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(1500);
      expect(result?.payerName).toBe("BIRUK TADESSE");
      expect(result?.payerPhoneOrAcc).toBe("1000123456789");
      expect(result?.referenceId).toBe("FT242289912039");
      expect(result?.balanceAfter).toBe(45210);
    });

    it("should parse masked CBE account format 1000****5678", () => {
      const msg =
        "Dear Customer, your account 1000****5678 has been credited with ETB 750.00 by TESHOME KASSA. Ref: FT2608159281.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(750);
      expect(result?.payerName).toBe("TESHOME KASSA");
      expect(result?.referenceId).toBe("FT2608159281");
    });

    it("should parse lowercase cbe message with odd spaces", () => {
      const msg =
        "dear customer, your account 1000998877 has been credited with etb 350.00 by EYUEL MEKONNEN. Ref: FT992811. Current balance is ETB 5,000.00.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(350);
      expect(result?.payerName).toBe("EYUEL MEKONNEN");
      expect(result?.referenceId).toBe("FT992811");
    });

    it("should parse short CBE alert format", () => {
      const msg = "Account 1000928192 credited ETB 800.00 by KEBEDE KASSA. Ref: FT83920192.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(800);
      expect(result?.payerName).toBe("KEBEDE KASSA");
      expect(result?.referenceId).toBe("FT83920192");
    });

    it("should parse CBE BranchReceipt URL format (real production — most missed)", () => {
      const msg =
        "Dear Mr Eyuel your Account 1********7638 has been credited with ETB 300.00. Your Current Balance is ETB 29440.39. Thank you for Banking with CBE! for Reciept https://apps.cbe.com.et:100/BranchReceipt/FT26214MQPWP&75487638";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(300);
      expect(result?.referenceId).toBe("FT26214MQPWP");
      expect(result?.payerPhoneOrAcc).toBe("1********7638");
      expect(result?.balanceAfter).toBe(29440.39);
    });

    it("should parse Amharic CBE credit notification", () => {
      const msg =
        "ክቡር ደንበኛችን የሒሳብ ቁጥርዎ 1********7638 በ 300.00 ብር ገቢ ተደርጓል:: ቀሪ ሒሳብዎ 29,440.39 ብር ነው:: የግብይት ቁጥር FT26214MQPWP";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(300);
      expect(result?.referenceId).toBe("FT26214MQPWP");
    });

    it("should parse CBE large transfer with BranchReceipt URL and 5000 ETB", () => {
      const msg =
        "Dear Mr Eyuel your Account 1000****7638 has been credited with ETB 5,000.00. Your Current Balance is ETB 34440.39. Thank you for Banking with CBE! for Reciept https://apps.cbe.com.et:100/BranchReceipt/FT262163J7WX&75487638";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE");
      expect(result?.amount).toBe(5000);
      expect(result?.referenceId).toBe("FT262163J7WX");
    });
  });

  describe("Bank of Abyssinia (BOA) Parser Suite", () => {
    it("should parse standard Bank of Abyssinia credit SMS", () => {
      const msg =
        "Bank of Abyssinia: Account 8492*** credited with ETB 1,000.00 from DAWIT MELESE. Ref: BOA928371.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("BOA");
      expect(result?.amount).toBe(1000);
      expect(result?.payerName).toBe("DAWIT MELESE");
      expect(result?.referenceId).toBe("BOA928371");
    });

    it("should parse BOA mobile app push alert", () => {
      const msg =
        "BOA Alert: Your account 12345678 has received ETB 2,500.00 from HELEN TESHOME. Txn: BOA881920.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("BOA");
      expect(result?.amount).toBe(2500);
      expect(result?.payerName).toBe("HELEN TESHOME");
      expect(result?.referenceId).toBe("BOA881920");
    });
  });

  describe("Awash Bank & CBE Birr Suites", () => {
    it("should parse Awash Bank credit alert with 14-digit account", () => {
      const msg =
        "Awash Bank: Your account 01304812345600 has been credited with ETB 750.00 from KASSAHUN GEMECHU. Ref: AWB849201.";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("AWASH");
      expect(result?.amount).toBe(750);
      expect(result?.payerName).toBe("KASSAHUN GEMECHU");
      expect(result?.payerPhoneOrAcc).toBe("01304812345600");
      expect(result?.referenceId).toBe("AWB849201");
    });

    it("should parse CBE Birr transfer", () => {
      const msg =
        "You have received ETB 300.00 from 251911223344 (SELAM TESFAYE). Trans ID: CBEB938291. Balance: ETB 2,500.00";
      const result = parseBankMessage(msg);

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("CBE_BIRR");
      expect(result?.amount).toBe(300);
      expect(result?.payerName).toBe("SELAM TESFAYE");
      expect(result?.referenceId).toBe("CBEB938291");
    });
  });

  describe("Privacy & Anti-Leak Filtering (Negative Tests)", () => {
    it("should reject 2FA OTP codes from Telebirr", () => {
      const otpMsg = "Your Telebirr verification code is 492810. Do not share this code with anyone.";
      expect(isNonPaymentMessage(otpMsg)).toBe(true);
      expect(parseBankMessage(otpMsg)).toBeNull();
    });

    it("should reject CBE internet banking OTP", () => {
      const otpMsg = "Your CBE Mobile Banking OTP is 839201. Valid for 5 minutes. Do not share.";
      expect(isNonPaymentMessage(otpMsg)).toBe(true);
      expect(parseBankMessage(otpMsg)).toBeNull();
    });

    it("should reject Outgoing debit transactions (when user spends money)", () => {
      const debitMsg =
        "You have transferred ETB 300.00 to ALMAZ BEKELE. Your current balance is ETB 4,000.00.";
      expect(isNonPaymentMessage(debitMsg)).toBe(true);
      expect(parseBankMessage(debitMsg)).toBeNull();
    });

    it("should reject airtime purchase message", () => {
      const msg = "You bought airtime of ETB 50.00 for 0911223344. Remaining balance: ETB 200.00";
      expect(isNonPaymentMessage(msg)).toBe(true);
      expect(parseBankMessage(msg)).toBeNull();
    });

    it("should reject random private SMS from family/friends", () => {
      const personalMsg = "Hey bro, are you coming home for dinner tonight?";
      expect(parseBankMessage(personalMsg)).toBeNull();
    });
  });
});
