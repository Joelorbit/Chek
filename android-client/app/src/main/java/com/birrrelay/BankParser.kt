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
            "purchased", "recharged", "airtime", "loan", "password"
        )
        return privateKeywords.any { lower.contains(it) }
    }

    /**
     * Parse incoming notification/SMS into structured payment event
     */
    fun parse(rawText: String): ParsedPayment? {
        if (isNonPaymentMessage(rawText)) {
            return null
        }

        val clean = rawText.replace("\\s+".toRegex(), " ").trim()

        // 1. Telebirr P2P, Merchant & QR Payments (127 Sender)
        // "You have received ETB 500.00 from ABEBE BIKILA (0911223344) with transaction number CKL9283741 on 2026-08-15. Your current balance is ETB 12,450.00."
        val tbPattern1 = Pattern.compile(
            "You have received ETB\\s*([\\d,.]+)\\s*from\\s*([^(]+?)(?:\\s*\\(([\\d*+\\s]+)\\))?\\s*with transaction (?:number|ID|no)\\s*([A-Z0-9]+)",
            Pattern.CASE_INSENSITIVE
        )
        val tb1 = tbPattern1.matcher(clean)
        if (tb1.find()) {
            val amount = tb1.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val payerName = tb1.group(2)?.trim() ?: "Telebirr User"
            val phone = tb1.group(3)?.trim()
            val refId = tb1.group(4)?.trim() ?: return null

            return ParsedPayment(
                provider = "TELEBIRR",
                amount = amount,
                payerName = payerName,
                payerPhoneOrAcc = phone,
                referenceId = refId,
                rawMessage = rawText
            )
        }

        // Telebirr Short / Merchant Variant
        val tbPattern2 = Pattern.compile(
            "(?:Payment of|Received)\\s*ETB\\s*([\\d,.]+)\\s*(?:from|by)\\s*([^.]+?)\\.\\s*(?:Trans ID|Txn|Ref|Transaction No)[:\\s]*([A-Z0-9]+)",
            Pattern.CASE_INSENSITIVE
        )
        val tb2 = tbPattern2.matcher(clean)
        if (tb2.find()) {
            val amount = tb2.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val payerName = tb2.group(2)?.trim() ?: "Telebirr Customer"
            val refId = tb2.group(3)?.trim() ?: return null

            return ParsedPayment(
                provider = "TELEBIRR",
                amount = amount,
                payerName = payerName,
                referenceId = refId,
                rawMessage = rawText
            )
        }

        // Telebirr Amharic: "ከ 0911223344 (ABEBE BIKILA) 50.00 ብር ደርሶዎታል:: የግብይት ቁጥር CKL9283741"
        if (clean.contains("ደርሶዎታል") || clean.contains("ግብይት ቁጥር")) {
            val amPattern = Pattern.compile(
                "(?:ከ|from)\\s*([\\d*+\\s]+)?(?:\\s*\\(([^)]+)\\))?\\s*([\\d,.]+)\\s*(?:ብር|ETB).*?(?:የግብይት ቁጥር|ቁጥር)[:\\s]*([A-Z0-9]+)",
                Pattern.CASE_INSENSITIVE
            )
            val amMatcher = amPattern.matcher(clean)
            if (amMatcher.find()) {
                val phone = amMatcher.group(1)?.trim()
                val payerName = amMatcher.group(2)?.trim() ?: phone ?: "Telebirr Customer"
                val amount = amMatcher.group(3)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                val refId = amMatcher.group(4)?.trim() ?: return null

                return ParsedPayment(
                    provider = "TELEBIRR",
                    amount = amount,
                    payerName = payerName,
                    payerPhoneOrAcc = phone,
                    referenceId = refId,
                    rawMessage = rawText
                )
            }
        }

        // 2. CBE Mobile Banking (1000... 13-digit accounts & FT... references)
        // "Dear customer, your account 1000123456789 has been credited with ETB 1,500.00 by BIRUK TADESSE. Ref: FT242289912039. Current balance is ETB 45,210.00."
        val cbePattern = Pattern.compile(
            "your (?:account|Account)\\s*([\\d*]+)\\s*has been (?:credited with|Credited with|credited)\\s*ETB\\s*([\\d,.]+).*?(?:by|from)\\s*([^.]+?)\\.\\s*(?:Ref|Txn ID|Reference|Txn)[:\\s]*([A-Z0-9]+)",
            Pattern.CASE_INSENSITIVE
        )
        val cbeMatcher = cbePattern.matcher(clean)
        if (cbeMatcher.find()) {
            val acc = cbeMatcher.group(1)?.trim()
            val amount = cbeMatcher.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val payerName = cbeMatcher.group(3)?.trim() ?: "CBE Depositor"
            val refId = cbeMatcher.group(4)?.trim() ?: return null

            return ParsedPayment(
                provider = "CBE",
                amount = amount,
                payerName = payerName,
                payerPhoneOrAcc = acc,
                referenceId = refId,
                rawMessage = rawText
            )
        }

        // 3. Bank of Abyssinia (BOA)
        if (clean.contains("abyssinia", ignoreCase = true) || clean.contains("boa", ignoreCase = true)) {
            val boaPattern = Pattern.compile(
                "(?:account|BOA|Alert:)\\s*([\\d*]+)?.*?(?:credited with|credited|received|has received)\\s*ETB\\s*([\\d,.]+)\\s*(?:by|from)\\s*([^.]+?)\\.\\s*(?:Ref|Txn|Txn ID)[:\\s]*([A-Z0-9]+)",
                Pattern.CASE_INSENSITIVE
            )
            val boaMatcher = boaPattern.matcher(clean)
            if (boaMatcher.find()) {
                val acc = boaMatcher.group(1)?.trim()
                val amount = boaMatcher.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                val payerName = boaMatcher.group(3)?.trim() ?: "BOA Customer"
                val refId = boaMatcher.group(4)?.trim() ?: return null

                return ParsedPayment(
                    provider = "BOA",
                    amount = amount,
                    payerName = payerName,
                    payerPhoneOrAcc = acc,
                    referenceId = refId,
                    rawMessage = rawText
                )
            }
        }

        // 4. Awash Bank Credit Alert (01304... 14-digit accounts)
        if (clean.contains("awash", ignoreCase = true)) {
            val awashPattern = Pattern.compile(
                "account\\s*([\\d*]+)\\s*has been (?:credited with|credited)\\s*ETB\\s*([\\d,.]+)\\s*by\\s*([^.]+?)\\.\\s*(?:Ref|Txn)[:\\s]*([A-Z0-9]+)",
                Pattern.CASE_INSENSITIVE
            )
            val awMatcher = awashPattern.matcher(clean)
            if (awMatcher.find()) {
                val acc = awMatcher.group(1)?.trim()
                val amount = awMatcher.group(2)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                val payerName = awMatcher.group(3)?.trim() ?: "Awash Customer"
                val refId = awMatcher.group(4)?.trim() ?: return null

                return ParsedPayment(
                    provider = "AWASH",
                    amount = amount,
                    payerName = payerName,
                    payerPhoneOrAcc = acc,
                    referenceId = refId,
                    rawMessage = rawText
                )
            }
        }

        // 5. CBE Birr Mobile Wallet
        if (clean.contains("cbe birr", ignoreCase = true) || clean.contains("cbebirr", ignoreCase = true)) {
            val cbeBirrPattern = Pattern.compile(
                "received ETB\\s*([\\d,.]+)\\s*from\\s*([\\d*+\\s]+)(?:\\s*\\(([^)]+)\\))?.*?Trans ID[:\\s]*([A-Z0-9]+)",
                Pattern.CASE_INSENSITIVE
            )
            val cbMatcher = cbeBirrPattern.matcher(clean)
            if (cbMatcher.find()) {
                val amount = cbMatcher.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
                val phone = cbMatcher.group(2)?.trim()
                val payerName = cbMatcher.group(3)?.trim() ?: "CBE Birr User"
                val refId = cbMatcher.group(4)?.trim() ?: return null

                return ParsedPayment(
                    provider = "CBE_BIRR",
                    amount = amount,
                    payerName = payerName,
                    payerPhoneOrAcc = phone,
                    referenceId = refId,
                    rawMessage = rawText
                )
            }
        }

        // 6. Robust Fallback: Any message containing Amount & Reference
        val amountPattern = Pattern.compile("(?:ETB|ብር)\\s*([\\d,.]+)", Pattern.CASE_INSENSITIVE)
        val refPattern = Pattern.compile("(?:Ref|Txn|Transaction No|ቁጥር)[:\\s]*([A-Z0-9]{6,})", Pattern.CASE_INSENSITIVE)
        val amMatch = amountPattern.matcher(clean)
        val refMatch = refPattern.matcher(clean)

        if (amMatch.find() && refMatch.find()) {
            val amount = amMatch.group(1)?.replace(",", "")?.toDoubleOrNull() ?: 0.0
            val refId = refMatch.group(1)?.trim() ?: return null

            val provider = when {
                refId.startsWith("FT", ignoreCase = true) -> "CBE"
                refId.startsWith("CKL", ignoreCase = true) || refId.startsWith("TB", ignoreCase = true) -> "TELEBIRR"
                refId.startsWith("BOA", ignoreCase = true) -> "BOA"
                refId.startsWith("AW", ignoreCase = true) -> "AWASH"
                else -> "BANK"
            }

            return ParsedPayment(
                provider = provider,
                amount = amount,
                payerName = "Bank Customer",
                referenceId = refId,
                rawMessage = rawText
            )
        }

        return null
    }
}
