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

            val senderLower = sender.lowercase()
            val isKnownBankSender = sender == "127" ||
                    senderLower.contains("cbe") ||
                    sender == "889" ||
                    senderLower.contains("abyssinia") ||
                    senderLower.contains("boa") ||
                    senderLower.contains("awash")

            val payment = BankParser.parse(rawMessage)
            if (payment != null) {
                Log.i(TAG, "⚡ Valid Payment SMS intercepted! Provider: ${payment.provider}, Amount: ${payment.amount}, Ref: ${payment.referenceId}")

                // 1. Save to local device storage immediately
                val store = LocalPaymentStore(context)
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
                store.savePayment(stored)

                // 2. Broadcast to UI for immediate card render
                val logIntent = Intent("com.chek.PAYMENT_RECEIVED").apply {
                    putExtra("provider", payment.provider)
                    putExtra("amount", payment.amount)
                    putExtra("payerName", payment.payerName)
                    putExtra("payerPhone", payment.payerPhoneOrAcc ?: "")
                    putExtra("referenceId", payment.referenceId)
                    putExtra("rawMessage", rawMessage)
                    setPackage(context.packageName)
                }
                context.sendBroadcast(logIntent)

                // 3. Relay to server asynchronously
                ApiClient.sendPaymentEvent(context, payment) { success ->
                    if (success) {
                        store.markAsRelayed(payment.referenceId)
                    }
                }
            } else {
                // If from known bank shortcode, forward to server for cloud regex matching
                if (isKnownBankSender && !BankParser.isNonPaymentMessage(rawMessage)) {
                    Log.i(TAG, "Forwarding raw bank SMS to server from sender: $sender")
                    ApiClient.sendRawSmsEvent(context, rawMessage)

                    val logIntent = Intent("com.chek.RAW_SMS_LOG").apply {
                        putExtra("sender", sender)
                        putExtra("rawMessage", rawMessage)
                        setPackage(context.packageName)
                    }
                    context.sendBroadcast(logIntent)
                }
            }
        }
    }
}
