package com.birrrelay

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class NotificationListener : NotificationListenerService() {

    private val TAG = "BirrRelayNotification"

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val fullMessage = "$title $text".trim()

        val packageName = sbn.packageName.lowercase()

        // Filter: Only process financial/SMS notifications
        val isFinancialApp = packageName.contains("telebirr") ||
                packageName.contains("cbe") ||
                packageName.contains("messaging") ||
                packageName.contains("mms") ||
                packageName.contains("bank")

        if (!isFinancialApp) return

        Log.d(TAG, "Evaluating notification from $packageName: $fullMessage")

        // Parse with on-device privacy filter
        val payment = BankParser.parse(fullMessage)
        if (payment != null) {
            Log.i(TAG, "Valid payment detected! Provider: ${payment.provider}, Amount: ${payment.amount}, Ref: ${payment.referenceId}")
            ApiClient.sendPaymentEvent(applicationContext, payment)
        }
    }
}
