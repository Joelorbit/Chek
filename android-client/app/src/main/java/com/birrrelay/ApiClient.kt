package com.birrrelay

import android.content.Context
import android.net.Uri
import android.os.BatteryManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ApiClient(private val context: Context) {

    companion object {
        private const val TAG = "ChekApiClient"
        private const val PREFS_NAME = "chek_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_IS_PAIRED = "is_paired"

        fun getServerUrl(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_SERVER_URL, "http://192.168.1.11:3000") ?: "http://192.168.1.11:3000"
        }

        fun getDeviceToken(context: Context): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_DEVICE_TOKEN, null)
        }

        fun isPaired(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_IS_PAIRED, false)
        }

        fun sendPaymentEvent(context: Context, payment: ParsedPayment, onComplete: ((Boolean) -> Unit)? = null) {
            val token = getDeviceToken(context)
            val serverUrl = getServerUrl(context)

            CoroutineScope(Dispatchers.IO).launch {
                var success = false
                try {
                    val url = URL("$serverUrl/api/v1/relay/event")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    if (token != null) conn.setRequestProperty("x-device-token", token)
                    conn.doOutput = true
                    conn.connectTimeout = 12000
                    conn.readTimeout = 12000

                    val payload = JSONObject().apply {
                        put("provider", payment.provider)
                        put("amount", payment.amount)
                        put("payerName", payment.payerName)
                        put("payerPhone", payment.payerPhoneOrAcc)
                        put("referenceId", payment.referenceId)
                        put("rawMessage", payment.rawMessage)
                    }

                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

                    val responseCode = conn.responseCode
                    Log.d(TAG, "Payment event sent. Status code: $responseCode")
                    success = responseCode in 200..299
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to relay payment event", e)
                } finally {
                    onComplete?.invoke(success)
                }
            }
        }

        fun sendRawSmsEvent(context: Context, rawMessage: String) {
            val token = getDeviceToken(context)
            val serverUrl = getServerUrl(context)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL("$serverUrl/api/v1/relay/event")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    if (token != null) conn.setRequestProperty("x-device-token", token)
                    conn.doOutput = true
                    conn.connectTimeout = 12000
                    conn.readTimeout = 12000

                    val payload = JSONObject().apply {
                        put("rawMessage", rawMessage)
                    }

                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

                    val responseCode = conn.responseCode
                    Log.d(TAG, "Raw SMS relay sent. Status code: $responseCode")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to relay raw SMS", e)
                }
            }
        }

        fun sendHeartbeat(context: Context) {
            val token = getDeviceToken(context)
            val serverUrl = getServerUrl(context)

            val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL("$serverUrl/api/v1/relay/ping")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    if (token != null) conn.setRequestProperty("x-device-token", token)
                    conn.doOutput = true
                    conn.connectTimeout = 8000
                    conn.readTimeout = 8000

                    val payload = JSONObject().apply {
                        put("batteryLevel", batteryPct)
                    }

                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }
                    Log.d(TAG, "Heartbeat ping sent successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Heartbeat ping failed", e)
                }
            }
        }
    }

    data class PairResult(val success: Boolean, val message: String, val latencyMs: Long = 0)
    data class SyncResult(val success: Boolean, val message: String, val count: Int = 0)

    /**
     * Scan past SMS inbox for 127, CBE, Abyssinia, Awash, store locally, and sync them to server
     */
    fun syncInboxSms(): SyncResult {
        return try {
            val serverUrl = getServerUrl(context)
            val token = getDeviceToken(context)
            val store = LocalPaymentStore(context)

            val uri = Uri.parse("content://sms/inbox")
            val cursor = context.contentResolver.query(
                uri,
                arrayOf("address", "body", "date"),
                null,
                null,
                "date DESC LIMIT 100"
            )

            val messagesArray = JSONArray()
            var localParsedCount = 0

            cursor?.use {
                val addrIdx = it.getColumnIndex("address")
                val bodyIdx = it.getColumnIndex("body")
                val dateIdx = it.getColumnIndex("date")

                while (it.moveToNext()) {
                    val address = if (addrIdx >= 0) it.getString(addrIdx) ?: "" else ""
                    val body = if (bodyIdx >= 0) it.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx >= 0) it.getLong(dateIdx) else System.currentTimeMillis()

                    val addrLower = address.lowercase()
                    val isBank = address == "127" || addrLower.contains("cbe") || address == "889" ||
                            addrLower.contains("abyssinia") || addrLower.contains("boa") || addrLower.contains("awash")

                    val parsed = BankParser.parse(body)
                    if (parsed != null) {
                        // 1. Save to local on-device store
                        val stored = StoredPayment(
                            id = date.toString(),
                            provider = parsed.provider,
                            amount = parsed.amount,
                            currency = parsed.currency,
                            payerName = parsed.payerName,
                            payerPhoneOrAcc = parsed.payerPhoneOrAcc,
                            referenceId = parsed.referenceId,
                            rawMessage = parsed.rawMessage,
                            timestamp = date,
                            isRelayed = false
                        )
                        store.savePayment(stored)
                        localParsedCount++

                        val obj = JSONObject().apply {
                            put("provider", parsed.provider)
                            put("amount", parsed.amount)
                            put("payerName", parsed.payerName)
                            put("payerPhone", parsed.payerPhoneOrAcc)
                            put("referenceId", parsed.referenceId)
                            put("rawMessage", parsed.rawMessage)
                        }
                        messagesArray.put(obj)
                    } else if (isBank && !BankParser.isNonPaymentMessage(body)) {
                        val obj = JSONObject().apply {
                            put("rawMessage", body)
                        }
                        messagesArray.put(obj)
                    }
                }
            }

            if (messagesArray.length() == 0) {
                return SyncResult(true, "No bank SMS found in inbox to sync.", 0)
            }

            val url = URL("$serverUrl/api/v1/relay/batch")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            if (token != null) conn.setRequestProperty("x-device-token", token)
            conn.doOutput = true
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            val payload = JSONObject().apply {
                put("messages", messagesArray)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

            val code = conn.responseCode
            if (code in 200..299) {
                val resp = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val json = JSONObject(resp)
                val inserted = json.optInt("insertedCount", 0)
                SyncResult(true, "Synced $localParsedCount past transactions ($inserted new on server)!", localParsedCount)
            } else {
                SyncResult(true, "Stored $localParsedCount transactions on device (Server sync code: $code).", localParsedCount)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync inbox error", e)
            SyncResult(false, e.localizedMessage ?: "Sync failed", 0)
        }
    }

    /**
     * Test reachability and ping the Chek server
     */
    fun testConnection(serverUrl: String): PairResult {
        val start = System.currentTimeMillis()
        return try {
            var cleanUrl = serverUrl.trim().trimEnd('/')
            if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                cleanUrl = "http://$cleanUrl"
            }

            val url = URL("$cleanUrl/api/v1/device/pair")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "OPTIONS"
            conn.connectTimeout = 6000
            conn.readTimeout = 6000

            val code = conn.responseCode
            val latency = System.currentTimeMillis() - start
            if (code in 200..299 || code == 405 || code == 400) {
                PairResult(true, "Server reachable! (${latency}ms)", latency)
            } else {
                PairResult(false, "Server returned HTTP $code (${latency}ms)", latency)
            }
        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - start
            PairResult(false, "Cannot connect: ${e.localizedMessage ?: "Connection timed out"}", latency)
        }
    }

    /**
     * Pair phone with Chek using 6-Digit PIN
     */
    fun pair(serverUrl: String, sixDigitPin: String): PairResult {
        val start = System.currentTimeMillis()
        return try {
            val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            var cleanUrl = serverUrl.trim().trimEnd('/')
            if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                cleanUrl = "http://$cleanUrl"
            }

            val cleanPin = sixDigitPin.trim().replace(" ", "")

            val url = URL("$cleanUrl/api/v1/device/pair")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 12000
            conn.readTimeout = 12000

            val payload = JSONObject().apply {
                put("pairingCode", cleanPin)
                put("deviceName", android.os.Build.MODEL ?: "Android Phone")
                put("batteryLevel", batteryPct)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

            val responseCode = conn.responseCode
            val latency = System.currentTimeMillis() - start

            if (responseCode in 200..299) {
                val responseStr = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val json = JSONObject(responseStr)
                val deviceToken = json.optString("deviceToken")
                val deviceId = json.optString("deviceId")

                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                prefs.edit()
                    .putString(KEY_SERVER_URL, cleanUrl)
                    .putString(KEY_DEVICE_TOKEN, deviceToken)
                    .putString(KEY_DEVICE_ID, deviceId)
                    .putBoolean(KEY_IS_PAIRED, true)
                    .apply()

                PairResult(true, "● Paired & Online (${latency}ms)", latency)
            } else {
                val errorStream = conn.errorStream
                val errorMsg = if (errorStream != null) {
                    val errText = BufferedReader(InputStreamReader(errorStream)).use { it.readText() }
                    try {
                        JSONObject(errText).optString("error", errText)
                    } catch (_: Exception) {
                        errText
                    }
                } else {
                    "HTTP $responseCode"
                }
                PairResult(false, errorMsg, latency)
            }
        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - start
            Log.e(TAG, "Pairing network error", e)
            val msg = e.localizedMessage ?: "Network connection failed. Check your Server URL."
            PairResult(false, msg, latency)
        }
    }
}
