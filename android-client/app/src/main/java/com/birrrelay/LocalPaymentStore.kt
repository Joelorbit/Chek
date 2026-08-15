package com.birrrelay

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class StoredPayment(
    val id: String,
    val provider: String,
    val amount: Double,
    val currency: String = "ETB",
    val payerName: String,
    val payerPhoneOrAcc: String?,
    val referenceId: String,
    val rawMessage: String,
    val timestamp: Long,
    var isRelayed: Boolean = false
) {
    fun toJson(): JSONObject {
        return JSONObject().apply {
            put("id", id)
            put("provider", provider)
            put("amount", amount)
            put("currency", currency)
            put("payerName", payerName)
            put("payerPhoneOrAcc", payerPhoneOrAcc ?: "")
            put("referenceId", referenceId)
            put("rawMessage", rawMessage)
            put("timestamp", timestamp)
            put("isRelayed", isRelayed)
        }
    }

    companion object {
        fun fromJson(json: JSONObject): StoredPayment {
            return StoredPayment(
                id = json.optString("id", System.currentTimeMillis().toString()),
                provider = json.optString("provider", "BANK"),
                amount = json.optDouble("amount", 0.0),
                currency = json.optString("currency", "ETB"),
                payerName = json.optString("payerName", "Customer"),
                payerPhoneOrAcc = json.optString("payerPhoneOrAcc").ifEmpty { null },
                referenceId = json.optString("referenceId", "REF"),
                rawMessage = json.optString("rawMessage", ""),
                timestamp = json.optLong("timestamp", System.currentTimeMillis()),
                isRelayed = json.optBoolean("isRelayed", false)
            )
        }
    }
}

class LocalPaymentStore(context: Context) {

    private val prefs = context.getSharedPreferences("chek_local_payments", Context.MODE_PRIVATE)
    private val KEY_PAYMENTS = "payments_json_array"

    @Synchronized
    fun getAllPayments(): List<StoredPayment> {
        val jsonStr = prefs.getString(KEY_PAYMENTS, "[]") ?: "[]"
        val list = mutableListOf<StoredPayment>()
        try {
            val arr = JSONArray(jsonStr)
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(StoredPayment.fromJson(obj))
            }
        } catch (_: Exception) {}
        return list.sortedByDescending { it.timestamp }
    }

    @Synchronized
    fun savePayment(payment: StoredPayment): Boolean {
        val payments = getAllPayments().toMutableList()
        // Check if reference already stored (prevent duplicates)
        if (payments.any { it.referenceId.equals(payment.referenceId, ignoreCase = true) }) {
            return false
        }
        payments.add(0, payment)

        // Keep maximum 200 items locally
        val trimmed = if (payments.size > 200) payments.take(200) else payments
        val arr = JSONArray()
        for (p in trimmed) {
            arr.put(p.toJson())
        }
        prefs.edit().putString(KEY_PAYMENTS, arr.toString()).apply()
        return true
    }

    @Synchronized
    fun markAsRelayed(referenceId: String) {
        val payments = getAllPayments().toMutableList()
        var updated = false
        for (p in payments) {
            if (p.referenceId.equals(referenceId, ignoreCase = true)) {
                p.isRelayed = true
                updated = true
            }
        }
        if (updated) {
            val arr = JSONArray()
            for (p in payments) {
                arr.put(p.toJson())
            }
            prefs.edit().putString(KEY_PAYMENTS, arr.toString()).apply()
        }
    }

    fun getTotalVolume(): Double {
        return getAllPayments().sumOf { it.amount }
    }

    fun getPaymentCount(): Int {
        return getAllPayments().size
    }
}
