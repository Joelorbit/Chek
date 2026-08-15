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
        private const val KEY_IS_PAIRED = "is_paired"

        fun getServerUrl(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_SERVER_URL, "https://your-domain.com") ?: "https://your-domain.com"
        }

        fun getDeviceToken(context: Context): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(KEY_DEVICE_TOKEN, null)
        }

        fun sendPaymentEvent(context: Context, payment: ParsedPayment) {
            val token = getDeviceToken(context) ?: return
            val serverUrl = getServerUrl(context)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL("$serverUrl/api/v1/relay/event")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.setRequestProperty("x-device-token", token)
                    conn.doOutput = true
                    conn.connectTimeout = 8000

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
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to relay payment event", e)
                }
            }
        }

        fun sendHeartbeat(context: Context) {
            val token = getDeviceToken(context) ?: return
            val serverUrl = getServerUrl(context)

            val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val url = URL("$serverUrl/api/v1/relay/ping")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.setRequestProperty("x-device-token", token)
                    conn.doOutput = true
                    conn.connectTimeout = 5000

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

    data class PairResult(val success: Boolean, val message: String)

    /**
     * Pair this phone with the Chek server using the 6-digit PIN
     */
    fun pairWithCode(serverUrl: String, pairingCode: String): PairResult {
        return try {
            val bm = context.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)

            var cleanUrl = serverUrl.trim().trimEnd('/')
            if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
                cleanUrl = "http://$cleanUrl"
            }
            val cleanCode = pairingCode.replace(" ", "").trim()

            val url = URL("$cleanUrl/api/v1/device/pair")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            val payload = JSONObject().apply {
                put("pairingCode", cleanCode)
                put("deviceName", android.os.Build.MODEL ?: "Android Phone")
                put("batteryLevel", batteryPct)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

            val responseCode = conn.responseCode
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

                PairResult(true, "Device paired successfully!")
            } else {
                val errorStream = conn.errorStream
                val errorMsg = if (errorStream != null) {
                    val errText = BufferedReader(InputStreamReader(errorStream)).use { it.readText() }
                    try { JSONObject(errText).optString("error", errText) } catch (_: Exception) { errText }
                } else {
                    "HTTP $responseCode"
                }
                PairResult(false, errorMsg)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Pairing network error", e)
            PairResult(false, e.localizedMessage ?: "Network connection failed. Check Wi-Fi & URL.")
        }
    }
}
