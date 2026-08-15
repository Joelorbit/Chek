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

            val sender = (messages[0].displayOriginatingAddress ?: "").trim()
            val fullBody = StringBuilder()
            for (sms in messages) {
                fullBody.append(sms.displayMessageBody)
            }
            val rawMessage = fullBody.toString().trim()

            Log.i(TAG, "Incoming SMS from [$sender]: $rawMessage")

            // Check known Ethiopian banking senders & shortcodes
            val senderLower = sender.lowercase()
            val isKnownBankSender = sender == "127" || 
                    senderLower.contains("cbe") || 
                    sender == "889" || 
                    senderLower.contains("abyssinia") || 
                    senderLower.contains("boa") || 
                    senderLower.contains("awash")

            // Parse through on-device bank parser & privacy guard
            val payment = BankParser.parse(rawMessage)
            if (payment != null) {
                Log.i(TAG, "⚡ Valid Payment SMS intercepted! Provider: ${payment.provider}, Amount: ${payment.amount}, Ref: ${payment.referenceId}")
                ApiClient.sendPaymentEvent(context, payment)

                val logIntent = Intent("com.chek.PAYMENT_RECEIVED").apply {
                    putExtra("payment_log", "⚡ [${payment.provider}] +${payment.amount} ETB\nFrom: ${payment.payerName}\nRef: ${payment.referenceId}\nStatus: Relayed & Verified ✓")
                    putExtra("amount", payment.amount)
                    setPackage(context.packageName)
                }
                context.sendBroadcast(logIntent)
            } else {
                // If it came from 127, CBE, or Abyssinia, forward raw message to server for cloud regex parsing
                if (isKnownBankSender && !BankParser.isNonPaymentMessage(rawMessage)) {
                    Log.i(TAG, "Relaying bank SMS from sender $sender to Chek server...")
                    ApiClient.sendRawSmsEvent(context, rawMessage)

                    val logIntent = Intent("com.chek.PAYMENT_RECEIVED").apply {
                        putExtra("payment_log", "📩 [SMS from $sender] Forwarded to server for verification:\n$rawMessage")
                        setPackage(context.packageName)
                    }
                    context.sendBroadcast(logIntent)
                }
            }
        }
    }
}
