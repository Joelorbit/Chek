package com.birrrelay

import java.util.regex.Pattern

data class ParsedPayment(
    val provider: String,
    val amount: Double,
    val currency: String = "ETB",
    val payerName: String,
    val payerPhoneOrAcc: String? = null,
    val referenceId: String,
    val balanceAfter: Double? = null,
    val rawMessage: String
)

object BankParser {

    /**
     * On-device privacy guard: Discards OTPs, debit deductions, verification codes, and personal SMS
     */
    fun isNonPaymentMessage(text: String): Boolean {
        val lower = text.lowercase()
        val privateKeywords = listOf(
            "otp", "verification code", "secret code", "do not share",
            "ይለፍ ቃል", "debited with", "you have transferred", "you paid",
            "purchased", "recharged", "airtime", "loan", "password",
            "you sent", "deducted", "withdrawn", "transfer failed",
            "expired", "rejected", "you have paid", "you transferred",
            "outgoing", "pin reset", "token"
        )
        return privateKeywords.any { lower.contains(it) }
    }

    /**
     * Parse incoming notification/SMS into structured payment event.
     * Patterns ordered by frequency and specificity.
     */
    fun parse(rawText: String): ParsedPayment? {
        if (isNonPaymentMessage(rawText)) {
            return null
        }

        val clean = rawText.replace("\\s+".toRegex(), " ").trim()

        // ──────────────────────────────────────────────────────────────
        // 1. CBE BranchReceipt URL Format (MOST MISSED — real production)
        // "Dear Mr Eyuel your Account 1********7638 has been credited with ETB 300.00.
        //  Your Current Balance is ETB 29440.39. Thank you for Banking with CBE!
        //  for Reciept https://apps.cbe.com.et:100/BranchReceipt/FT26214MQPWP&75487638"
        // ──────────────────────────────────────────────────────────────
        if (clean.contains("BranchReceipt", ignoreCase = true)) {
            val cbeUrlPattern = Pattern.compile(
                """(?:Dear\s+(?:Mr|Ms|Mrs|Dr|Ato)?\s*)?([\w\s]+?)\s+your\s+Account\s+([\d*]+)\s+has been credited with ETB\s*([\d,.]+).*?BranchReceipt/([A-Z0-9]+)""",
                Pattern.CASE_INSENSITIVE or Pattern.DOTALL
            )
            val cbeUrlMatch = cbeUrlPattern.matcher(clean)
            if (cbeUrlMatch.find()) {
                val amount = cbeUrlMatch.group(3)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                val balanceMatch = Pattern.compile(
                    """(?:Current Balance is|Balance[\s:]+)\s*ETB\s*([\d,.]+)""",
                    Pattern.CASE_INSENSITIVE
                ).matcher(clean)
                val balance = if (balanceMatch.find())
                    balanceMatch.group(1)?.replace(",", "")?.toDoubleOrNull() else null

                return ParsedPayment(
                    provider = "CBE",
                    amount = amount,
                    payerName = cbeUrlMatch.group(1)?.trim() ?: "CBE Customer",
                    payerPhoneOrAcc = cbeUrlMatch.group(2)?.trim(),
                    referenceId = cbeUrlMatch.group(4)?.trim() ?: return null,
                    balanceAfter = balance,
                    rawMessage = rawText
                )
            }
        }

        // ──────────────────────────────────────────────────────────────
        // 2. Amharic CBE Credit Notification
        // "ክቡር ደንበኛችን የሒሳብ ቁጥርዎ 1********7638 በ 300.00 ብር ገቢ ተደርጓል::
        //  ቀሪ ሒሳብዎ 29,440.39 ብር ነው:: የግብይት ቁጥር FT26214MQPWP"
        // ──────────────────────────────────────────────────────────────
        if (clean.contains("ገቢ ተደርጓል") || clean.contains("ብር ገቢ")) {
            val amhCbePattern = Pattern.compile(
                """([\d*]+)\s*በ\s*([\d,.]+)\s*ብር\s*ገቢ\s*ተደርጓል.*?(?:የግብይት\s*ቁጥር|ቁጥር|Ref)[\s:]*([A-Z0-9]+)""",
                Pattern.DOTALL
            )
            val amhMatch = amhCbePattern.matcher(clean)
            if (amhMatch.find()) {
                val balMatch = Pattern.compile("""([\d,.]+)\s*ብር\s*ነው""").matcher(clean)
                val balance = if (balMatch.find())
                    balMatch.group(1)?.replace(",", "")?.toDoubleOrNull() else null

                return ParsedPayment(
                    provider = "CBE",
                    amount = amhMatch.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                    payerName = "CBE Customer",
                    payerPhoneOrAcc = amhMatch.group(1)?.trim(),
                    referenceId = amhMatch.group(3)?.trim() ?: return null,
                    balanceAfter = balance,
                    rawMessage = rawText
                )
            }
        }

        // ──────────────────────────────────────────────────────────────
        // 3. Telebirr P2P English (127 sender / +251 prefix)
        // "You have received ETB 500.00 from ABEBE BIKILA (0911223344) with transaction number CKL9283741"
        // ──────────────────────────────────────────────────────────────
        val tbPattern1 = Pattern.compile(
            """You have received ETB\s*([\d,.]+)\s*from\s*([^(]+?)(?:\s*\(([+\d*\s]+)\))?\s*with transaction (?:number|ID|no)\s*([A-Z0-9]+)""",
            Pattern.CASE_INSENSITIVE
        )
        val tb1 = tbPattern1.matcher(clean)
        if (tb1.find()) {
            return ParsedPayment(
                provider = "TELEBIRR",
                amount = tb1.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                payerName = tb1.group(2)?.trim() ?: "Telebirr User",
                payerPhoneOrAcc = tb1.group(3)?.trim(),
                referenceId = tb1.group(4)?.trim() ?: return null,
                rawMessage = rawText
            )
        }

        // ──────────────────────────────────────────────────────────────
        // 4. Telebirr Short / Merchant Payment Variant
        // "Payment of ETB 1,200.00 received from YONAS BEKELE (0922334455). Transaction ID: CKL839201."
        // "Received ETB 250.00 from HAGOS TESFAYE. Txn: CKL392819."
        // ──────────────────────────────────────────────────────────────
        val tbPattern2 = Pattern.compile(
            """(?:Payment of|Received)\s*ETB\s*([\d,.]+)\s*(?:received\s*)?(?:from|by)\s*([^.(]+?)(?:\s*\(([+\d*\s]+)\))?\s*[.]\s*(?:Trans ID|Transaction ID|Txn ID|Txn|Ref)[:\s]*([A-Z0-9]+)""",
            Pattern.CASE_INSENSITIVE
        )
        val tb2 = tbPattern2.matcher(clean)
        if (tb2.find()) {
            return ParsedPayment(
                provider = "TELEBIRR",
                amount = tb2.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                payerName = tb2.group(2)?.trim() ?: "Telebirr Customer",
                payerPhoneOrAcc = tb2.group(3)?.trim(),
                referenceId = tb2.group(4)?.trim() ?: return null,
                rawMessage = rawText
            )
        }

        // ──────────────────────────────────────────────────────────────
        // 5. Telebirr Amharic P2P
        // "ከ 0911223344 (ABEBE BIKILA) 500.00 ብር ደርሶዎታል:: የግብይት ቁጥር CKL9283741"
        // ──────────────────────────────────────────────────────────────
        if (clean.contains("ደርሶዎታል") || clean.contains("ግብይት ቁጥር")) {
            val amPattern = Pattern.compile(
                """(?:ከ|from)\s*([+\d*\s]+)?(?:\s*\(([^)]+)\))?\s*([\d,.]+)\s*(?:ብር|ETB).*?(?:የግብይት ቁጥር|ቁጥር)[:\s]*([A-Z0-9]+)""",
                Pattern.CASE_INSENSITIVE
            )
            val amMatcher = amPattern.matcher(clean)
            if (amMatcher.find()) {
                val phone = amMatcher.group(1)?.trim()
                val payerName = amMatcher.group(2)?.trim() ?: phone ?: "Telebirr Customer"
                return ParsedPayment(
                    provider = "TELEBIRR",
                    amount = amMatcher.group(3)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                    payerName = payerName,
                    payerPhoneOrAcc = phone,
                    referenceId = amMatcher.group(4)?.trim() ?: return null,
                    rawMessage = rawText
                )
            }
        }

        // ──────────────────────────────────────────────────────────────
        // 6. CBE Mobile Banking Standard (1000... 13-digit accounts)
        // "Dear Customer, your account 1000123456789 has been credited with ETB 1,500.00 by BIRUK TADESSE. Ref: FT242289912039."
        // ──────────────────────────────────────────────────────────────
        val cbePattern = Pattern.compile(
            """your\s+(?:account|Account)\s*([\d*]+)\s*has been (?:credited with|Credited with|credited)\s*ETB\s*([\d,.]+).*?(?:by|from)\s*([^.]+?)\.\s*(?:Ref|Txn ID|Reference|Txn)[:\s]*([A-Z0-9]+)""",
            Pattern.CASE_INSENSITIVE
        )
        val cbeMatcher = cbePattern.matcher(clean)
        if (cbeMatcher.find()) {
            return ParsedPayment(
                provider = "CBE",
                amount = cbeMatcher.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                payerName = cbeMatcher.group(3)?.trim() ?: "CBE Depositor",
                payerPhoneOrAcc = cbeMatcher.group(1)?.trim(),
                referenceId = cbeMatcher.group(4)?.trim() ?: return null,
                rawMessage = rawText
            )
        }

        // ──────────────────────────────────────────────────────────────
        // 7. Bank of Abyssinia (BOA)
        // "Bank of Abyssinia: Account 8492*** credited with ETB 1,000.00 from DAWIT MELESE. Ref: BOA928371."
        // "BOA Alert: Your account 12345678 has received ETB 2,500.00 from HELEN TESHOME. Txn: BOA881920."
        // ──────────────────────────────────────────────────────────────
        if (clean.contains("abyssinia", ignoreCase = true) || clean.contains("boa", ignoreCase = true)) {
            val boaPattern = Pattern.compile(
                """(?:account|BOA|Alert:)?\s*([\d*]+)?\s*.*?(?:credited with|credited|received|has received)\s*ETB\s*([\d,.]+)\s*(?:by|from)\s*([^.]+?)\.\s*(?:Ref|Txn|Txn ID)[:\s]*([A-Z0-9]+)""",
                Pattern.CASE_INSENSITIVE
            )
            val boaMatcher = boaPattern.matcher(clean)
            if (boaMatcher.find()) {
                return ParsedPayment(
                    provider = "BOA",
                    amount = boaMatcher.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                    payerName = boaMatcher.group(3)?.trim() ?: "BOA Customer",
                    payerPhoneOrAcc = boaMatcher.group(1)?.trim(),
                    referenceId = boaMatcher.group(4)?.trim() ?: return null,
                    rawMessage = rawText
                )
            }
        }

        // ──────────────────────────────────────────────────────────────
        // 8. Awash Bank (01304... 14-digit accounts)
        // "Awash Bank: Your account 01304812345600 has been credited with ETB 750.00 from KASSAHUN GEMECHU. Ref: AWB849201."
        // ──────────────────────────────────────────────────────────────
        if (clean.contains("awash", ignoreCase = true)) {
            val awashPattern = Pattern.compile(
                """account\s*([\d*]+)\s*has been (?:credited with|credited)\s*ETB\s*([\d,.]+)\s*(?:from|by)\s*([^.]+?)\.\s*(?:Ref|Txn)[:\s]*([A-Z0-9]+)""",
                Pattern.CASE_INSENSITIVE
            )
            val awMatcher = awashPattern.matcher(clean)
            if (awMatcher.find()) {
                return ParsedPayment(
                    provider = "AWASH",
                    amount = awMatcher.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                    payerName = awMatcher.group(3)?.trim() ?: "Awash Customer",
                    payerPhoneOrAcc = awMatcher.group(1)?.trim(),
                    referenceId = awMatcher.group(4)?.trim() ?: return null,
                    rawMessage = rawText
                )
            }
        }

        // ──────────────────────────────────────────────────────────────
        // 9. CBE Birr Mobile Wallet
        // "You have received ETB 300.00 from 251911223344 (SELAM TESFAYE). Trans ID: CBEB938291."
        // ──────────────────────────────────────────────────────────────
        if (clean.contains("cbe birr", ignoreCase = true) || clean.contains("cbebirr", ignoreCase = true)) {
            val cbeBirrPattern = Pattern.compile(
                """received ETB\s*([\d,.]+)\s*from\s*([+\d*\s]+)(?:\s*\(([^)]+)\))?.*?Trans ID[:\s]*([A-Z0-9]+)""",
                Pattern.CASE_INSENSITIVE
            )
            val cbMatcher = cbeBirrPattern.matcher(clean)
            if (cbMatcher.find()) {
                return ParsedPayment(
                    provider = "CBE_BIRR",
                    amount = cbMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                    payerName = cbMatcher.group(3)?.trim() ?: "CBE Birr User",
                    payerPhoneOrAcc = cbMatcher.group(2)?.trim(),
                    referenceId = cbMatcher.group(4)?.trim() ?: return null,
                    rawMessage = rawText
                )
            }
        }

        // ──────────────────────────────────────────────────────────────
        // 10. Robust Fallback: Any message containing ETB Amount + Reference ID
        // ──────────────────────────────────────────────────────────────
        val amountPattern = Pattern.compile("""(?:ETB|ብር)\s*([\d,.]+)""", Pattern.CASE_INSENSITIVE)
        val refPattern = Pattern.compile("""(?:Ref|Txn|Transaction No|ቁጥር)[:\s]*([A-Z0-9]{6,})""", Pattern.CASE_INSENSITIVE)
        val amMatch = amountPattern.matcher(clean)
        val refMatch = refPattern.matcher(clean)

        if (amMatch.find() && refMatch.find()) {
            val refId = refMatch.group(1)?.trim() ?: return null
            val provider = when {
                refId.startsWith("FT", ignoreCase = true) -> "CBE"
                refId.startsWith("CKL", ignoreCase = true) || refId.startsWith("TB", ignoreCase = true) -> "TELEBIRR"
                refId.startsWith("BOA", ignoreCase = true) -> "BOA"
                refId.startsWith("AW", ignoreCase = true) || refId.startsWith("AWB", ignoreCase = true) -> "AWASH"
                refId.startsWith("CBEB", ignoreCase = true) -> "CBE_BIRR"
                else -> "BANK"
            }
            return ParsedPayment(
                provider = provider,
                amount = amMatch.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0,
                payerName = "Bank Customer",
                referenceId = refId,
                rawMessage = rawText
            )
        }

        return null
    }
}