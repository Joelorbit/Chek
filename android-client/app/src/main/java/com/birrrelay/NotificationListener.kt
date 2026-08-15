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

        val fullMessage = "$title $text $bigText $subText".trim()
        val pkg = sbn.packageName.lowercase()

        // Ignore internal system noise
        if (pkg.startsWith("com.android.systemui") || pkg.contains("download")) {
            return
        }

        Log.d(TAG, "Notification from $pkg: $fullMessage")

        // Parse through on-device privacy guard & bank regex
        val payment = BankParser.parse(fullMessage)
        if (payment != null) {
            Log.i(TAG, "⚡ Valid Ethiopian payment detected! Provider: ${payment.provider}, Amount: ${payment.amount}, Ref: ${payment.referenceId}")
            ApiClient.sendPaymentEvent(applicationContext, payment)

            // Broadcast to MainActivity for live UI display
            val intent = Intent("com.chek.PAYMENT_RECEIVED").apply {
                putExtra("payment_log", "⚡ [${payment.provider}] +${payment.amount} ETB\nFrom: ${payment.payerName}\nRef: ${payment.referenceId}\nStatus: Relayed to Server ✓")
                setPackage(packageName)
            }
            sendBroadcast(intent)
        } else {
            // Forward raw SMS/notification if financial keywords present
            val lower = fullMessage.lowercase()
            if ((lower.contains("cbe") || lower.contains("telebirr") || lower.contains("awash") || lower.contains("credited with")) && !BankParser.isNonPaymentMessage(fullMessage)) {
                ApiClient.sendRawSmsEvent(applicationContext, fullMessage)
            }
        }
    }
}
