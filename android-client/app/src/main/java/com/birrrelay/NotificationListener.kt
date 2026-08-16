package com.birrrelay

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationListener : NotificationListenerService() {

    private val TAG = "ChekNotification"

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""

        // Prefer bigText (contains full bank credit message) over short text
        val fullMessage = when {
            bigText.length > text.length -> "$title $bigText $subText"
            else -> "$title $text $subText"
        }.trim()

        val pkg = sbn.packageName.lowercase()

        // Ignore system noise
        if (pkg.startsWith("com.android.systemui") ||
            pkg.contains("download") ||
            pkg.contains("com.android.mms") && fullMessage.length < 10) {
            return
        }

        Log.d(TAG, "Notification from [$pkg]: ${fullMessage.take(120)}")

        // ── On-device Privacy Guard + Bank Parser ──
        val payment = BankParser.parse(fullMessage)

        if (payment != null) {
            Log.i(TAG, "⚡ Payment detected via notification! Provider: ${payment.provider}, Amount: ${payment.amount} ETB, Ref: ${payment.referenceId}")

            // 1. Save to local on-device store FIRST (mirrors SmsReceiver flow)
            val store = LocalPaymentStore(applicationContext)
            val stored = StoredPayment(
                id = System.currentTimeMillis().toString(),
                provider = payment.provider,
                amount = payment.amount,
                currency = payment.currency,
                payerName = payment.payerName,
                payerPhoneOrAcc = payment.payerPhoneOrAcc,
                referenceId = payment.referenceId,
                rawMessage = payment.rawMessage,
                timestamp = System.currentTimeMillis(),
                isRelayed = false
            )
            val saved = store.savePayment(stored)
            Log.d(TAG, "Local store save result: $saved (false = duplicate)")

            // 2. Relay to server asynchronously, mark as relayed on success
            ApiClient.sendPaymentEvent(applicationContext, payment) { success ->
                if (success) {
                    store.markAsRelayed(payment.referenceId)
                    Log.i(TAG, "✓ Relay confirmed by server. Ref: ${payment.referenceId}")
                } else {
                    Log.w(TAG, "⚠ Server relay failed for Ref: ${payment.referenceId} — will retry on next sync")
                }
            }

            // 3. Broadcast to MainActivity for live UI card render
            val intent = Intent("com.chek.PAYMENT_RECEIVED").apply {
                putExtra("provider", payment.provider)
                putExtra("amount", payment.amount)
                putExtra("payerName", payment.payerName)
                putExtra("payerPhone", payment.payerPhoneOrAcc ?: "")
                putExtra("referenceId", payment.referenceId)
                putExtra("rawMessage", payment.rawMessage)
                putExtra("payment_log",
                    "⚡ [${payment.provider}] +${payment.amount} ETB\nFrom: ${payment.payerName}\nRef: ${payment.referenceId}"
                )
                setPackage(packageName)
            }
            sendBroadcast(intent)

        } else {
            // Forward raw if it contains financial keywords but wasn't cleanly parsed
            val lower = fullMessage.lowercase()
            val hasFinancialKeyword = lower.contains("cbe") || lower.contains("telebirr") ||
                    lower.contains("awash") || lower.contains("abyssinia") ||
                    lower.contains("credited with") || lower.contains("branchreceipt") ||
                    lower.contains("ገቢ ተደርጓል") || lower.contains("ደርሶዎታል")

            if (hasFinancialKeyword && !BankParser.isNonPaymentMessage(fullMessage)) {
                Log.d(TAG, "Forwarding raw notification for server-side parsing: ${fullMessage.take(80)}")
                ApiClient.sendRawSmsEvent(applicationContext, fullMessage)
            }
        }
    }
}
