package com.birrrelay

import android.content.Context
import android.os.BatteryManager
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
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
        private const val KEY_API_KEY = "api_key"
        private const val KEY_IS_PAIRED = "is_paired"

        fun getServerUrl(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_SERVER_URL, "https://your-domain.com") ?: "https://your-domain.com"
        }

        fun getDeviceToken(context: Context): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_DEVICE_TOKEN, null)
        }

        fun getApiKey(context: Context): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_API_KEY, null)
        }

        fun isPaired(context: Context): Boolean {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getBoolean(KEY_IS_PAIRED, false)
        }

        fun sendPaymentEvent(context: Context, payment: ParsedPayment) {
            val token = getDeviceToken(context)
            val apiKey = getApiKey(context)
            if (token == null && apiKey == null) return

            val serverUrl = getServerUrl(context)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL("$serverUrl/api/v1/relay/event")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    if (token != null) conn.setRequestProperty("x-device-token", token)
                    if (apiKey != null) conn.setRequestProperty("x-api-key", apiKey)
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
        fun sendRawSmsEvent(context: Context, rawMessage: String) {
            val token = getDeviceToken(context)
            val apiKey = getApiKey(context)
            if (token == null && apiKey == null) return

            val serverUrl = getServerUrl(context)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL("$serverUrl/api/v1/relay/event")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    if (token != null) conn.setRequestProperty("x-device-token", token)
                    if (apiKey != null) conn.setRequestProperty("x-api-key", apiKey)
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
            val apiKey = getApiKey(context)
            if (token == null && apiKey == null) return

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
                    if (apiKey != null) conn.setRequestProperty("x-api-key", apiKey)
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
     * Pair phone with Chek using 6-Digit PIN or Direct API Key
     */
    fun pair(serverUrl: String, codeOrKey: String): PairResult {
        val start = System.currentTimeMillis()
        return try {
            val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            var cleanUrl = serverUrl.trim().trimEnd('/')
            if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                cleanUrl = "http://$cleanUrl"
            }

            val cleanInput = codeOrKey.trim()
            val isApiKey = cleanInput.startsWith("br_live_")

            val url = URL("$cleanUrl/api/v1/device/pair")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 12000
            conn.readTimeout = 12000

            val payload = JSONObject().apply {
                if (isApiKey) {
                    put("apiKey", cleanInput)
                } else {
                    put("pairingCode", cleanInput.replace(" ", ""))
                }
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
                val editor = prefs.edit()
                    .putString(KEY_SERVER_URL, cleanUrl)
                    .putString(KEY_DEVICE_TOKEN, deviceToken)
                    .putString(KEY_DEVICE_ID, deviceId)
                    .putBoolean(KEY_IS_PAIRED, true)

                if (isApiKey) {
                    editor.putString(KEY_API_KEY, cleanInput)
                }
                editor.apply()

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
            val msg = e.localizedMessage ?: "Network connection failed. Check your Wi-Fi and Server URL."
            PairResult(false, msg, latency)
        }
    }
}
