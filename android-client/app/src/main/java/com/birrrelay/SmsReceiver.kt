package com.birrrelay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

class SmsReceiver : BroadcastReceiver() {

    private val TAG = "ChekSmsReceiver"

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        if (intent.action == Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val sender = messages[0].displayOriginatingAddress ?: ""
            val fullBody = StringBuilder()
            for (sms in messages) {
                fullBody.append(sms.displayMessageBody)
            }
            val rawMessage = fullBody.toString().trim()

            Log.d(TAG, "Incoming SMS from $sender: $rawMessage")

            // Parse through on-device bank parser & privacy guard
            val payment = BankParser.parse(rawMessage)
            if (payment != null) {
                Log.i(TAG, "⚡ Valid Payment SMS intercepted! Provider: ${payment.provider}, Amount: ${payment.amount}, Ref: ${payment.referenceId}")
                ApiClient.sendPaymentEvent(context, payment)

                val logIntent = Intent("com.chek.PAYMENT_RECEIVED").apply {
                    putExtra("payment_log", "⚡ [${payment.provider}] +${payment.amount} ETB\nFrom: ${payment.payerName}\nRef: ${payment.referenceId}\nStatus: Relayed to Server ✓")
                    setPackage(context.packageName)
                }
                context.sendBroadcast(logIntent)
            } else {
                val lower = rawMessage.lowercase()
                val isBankSms = lower.contains("cbe") || lower.contains("telebirr") || lower.contains("awash") ||
                        lower.contains("credited with") || lower.contains("received etb") || lower.contains("birr")

                if (isBankSms && !BankParser.isNonPaymentMessage(rawMessage)) {
                    Log.i(TAG, "Relaying potential payment SMS to server for cloud parsing...")
                    ApiClient.sendRawSmsEvent(context, rawMessage)
                }
            }
        }
    }
}
