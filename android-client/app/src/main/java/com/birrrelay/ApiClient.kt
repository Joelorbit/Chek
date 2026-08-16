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
        const val PREFS_NAME = "chek_prefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_IS_PAIRED = "is_paired"
        private const val BATCH_CHUNK_SIZE = 50
        private const val MAX_SMS_SCAN = 500

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

        /**
         * Send a fully parsed payment event to the server.
         * Called from SmsReceiver and NotificationListener after successful BankParser.parse().
         */
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
                        put("currency", payment.currency)
                        put("payerName", payment.payerName)
                        put("payerPhone", payment.payerPhoneOrAcc ?: JSONObject.NULL)
                        put("referenceId", payment.referenceId)
                        put("balanceAfter", payment.balanceAfter ?: JSONObject.NULL)
                        put("rawMessage", payment.rawMessage)
                    }

                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

                    val responseCode = conn.responseCode
                    Log.d(TAG, "Payment event sent. Provider: ${payment.provider}, Ref: ${payment.referenceId}, HTTP: $responseCode")
                    success = responseCode in 200..299
                    if (!success) {
                        val errBody = try {
                            conn.errorStream?.bufferedReader()?.readText() ?: "no body"
                        } catch (e: Exception) { "stream error" }
                        Log.e(TAG, "Server rejected payment: HTTP $responseCode — $errBody")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to relay payment event", e)
                } finally {
                    onComplete?.invoke(success)
                }
            }
        }

        /**
         * Forward raw SMS text to server for cloud-side parsing fallback.
         */
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

                    val payload = JSONObject().apply { put("rawMessage", rawMessage) }
                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

                    val responseCode = conn.responseCode
                    Log.d(TAG, "Raw SMS relay sent. HTTP: $responseCode")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to relay raw SMS", e)
                }
            }
        }

        /**
         * Send 5-minute heartbeat ping to keep device online status updated.
         */
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

                    OutputStreamWriter(conn.outputStream).use {
                        it.write(JSONObject().apply { put("batteryLevel", batteryPct) }.toString())
                    }
                    Log.d(TAG, "Heartbeat ping sent. Battery: $batteryPct%")
                } catch (e: Exception) {
                    Log.e(TAG, "Heartbeat ping failed", e)
                }
            }
        }
    }

    data class PairResult(val success: Boolean, val message: String, val latencyMs: Long = 0)
    data class SyncResult(val success: Boolean, val message: String, val count: Int = 0)

    /**
     * Full inbox deep scan — global keyword body query (no address filter, no broken LIMIT).
     * Scans last 7 days, reports live progress via callback, sends in chunks of 50.
     *
     * @param onProgress Callback invoked on every 10 scanned messages: (scanned, total, found)
     */
    fun syncInboxSms(
        onProgress: ((scanned: Int, total: Int, found: Int) -> Unit)? = null
    ): SyncResult {
        return try {
            val serverUrl = getServerUrl(context)
            val token = getDeviceToken(context)
            val store = LocalPaymentStore(context)

            // ── Global keyword body scan (last 7 days) ──
            // No address filter — catches Telebirr from +251, CBE from "CBEMobile", "889", etc.
            // No LIMIT in sortOrder — Android content resolver ignores LIMIT there.
            val sevenDaysAgo = System.currentTimeMillis() - (7L * 24 * 60 * 60 * 1000)
            val selection = """
                date >= $sevenDaysAgo AND (
                    body LIKE '%credited%' OR
                    body LIKE '%received%' OR
                    body LIKE '%BranchReceipt%' OR
                    body LIKE '%telebirr%' OR
                    body LIKE '%ደርሶዎታል%' OR
                    body LIKE '%ገቢ ተደርጓል%' OR
                    body LIKE '%ETB%' OR
                    body LIKE '%ብር%' OR
                    body LIKE '%Abyssinia%' OR
                    body LIKE '%Awash%'
                )
            """.trimIndent()

            val uri = Uri.parse("content://sms/inbox")
            val cursor = context.contentResolver.query(
                uri,
                arrayOf("_id", "address", "body", "date"),
                selection,
                null,
                "date DESC"
            )

            val total = cursor?.count ?: 0
            Log.d(TAG, "SMS deep scan: $total messages matched keyword filter")
            onProgress?.invoke(0, total, 0)

            val allParsed = mutableListOf<JSONObject>()
            var scannedCount = 0
            var foundCount = 0

            cursor?.use {
                val bodyIdx = it.getColumnIndex("body")
                val dateIdx = it.getColumnIndex("date")

                while (it.moveToNext() && scannedCount < MAX_SMS_SCAN) {
                    val body = if (bodyIdx >= 0) it.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx >= 0) it.getLong(dateIdx) else System.currentTimeMillis()

                    scannedCount++

                    val parsed = BankParser.parse(body)
                    if (parsed != null) {
                        // Save to local store immediately (idempotent)
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
                        foundCount++

                        allParsed.add(JSONObject().apply {
                            put("provider", parsed.provider)
                            put("amount", parsed.amount)
                            put("currency", parsed.currency)
                            put("payerName", parsed.payerName)
                            put("payerPhone", parsed.payerPhoneOrAcc ?: JSONObject.NULL)
                            put("referenceId", parsed.referenceId)
                            put("balanceAfter", parsed.balanceAfter ?: JSONObject.NULL)
                            put("rawMessage", parsed.rawMessage)
                        })
                    } else if (!BankParser.isNonPaymentMessage(body)) {
                        // Pass raw message for cloud-side parsing fallback
                        allParsed.add(JSONObject().apply { put("rawMessage", body) })
                    }

                    // Report progress every 10 messages
                    if (scannedCount % 10 == 0) {
                        onProgress?.invoke(scannedCount, total, foundCount)
                    }
                }
            }

            onProgress?.invoke(scannedCount, total, foundCount)

            if (allParsed.isEmpty()) {
                return SyncResult(true, "No bank SMS found in inbox (last 7 days).", 0)
            }

            // ── Send in chunks of 50 to avoid payload limits ──
            var totalInserted = 0
            val chunks = allParsed.chunked(BATCH_CHUNK_SIZE)
            for (chunk in chunks) {
                try {
                    val url = URL("$serverUrl/api/v1/relay/batch")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    if (token != null) conn.setRequestProperty("x-device-token", token)
                    conn.doOutput = true
                    conn.connectTimeout = 20000
                    conn.readTimeout = 20000

                    val messagesArray = JSONArray()
                    chunk.forEach { messagesArray.put(it) }
                    val payload = JSONObject().apply { put("messages", messagesArray) }
                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

                    val code = conn.responseCode
                    if (code in 200..299) {
                        val resp = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                        totalInserted += JSONObject(resp).optInt("insertedCount", 0)
                    }
                    Log.d(TAG, "Batch chunk of ${chunk.size} sent. HTTP: $code")
                } catch (e: Exception) {
                    Log.e(TAG, "Chunk relay error", e)
                }
            }

            SyncResult(
                true,
                "✓ Scanned $scannedCount messages • $foundCount payments found • $totalInserted new on server",
                foundCount
            )
        } catch (e: Exception) {
            Log.e(TAG, "Sync inbox error", e)
            SyncResult(false, "Sync failed: ${e.localizedMessage ?: "Unknown error"}", 0)
        }
    }

    /**
     * Test server reachability with latency measurement.
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
                PairResult(true, "✓ Server reachable (${latency}ms)", latency)
            } else {
                PairResult(false, "Server returned HTTP $code (${latency}ms)", latency)
            }
        } catch (e: Exception) {
            val latency = System.currentTimeMillis() - start
            PairResult(false, "Cannot connect: ${e.localizedMessage ?: "Timed out"}", latency)
        }
    }

    /**
     * Pair phone with Chek using 6-Digit PIN from web dashboard.
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

            val url = URL("$cleanUrl/api/v1/device/pair")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 12000
            conn.readTimeout = 12000

            val payload = JSONObject().apply {
                put("pairingCode", sixDigitPin.trim().replace(" ", ""))
                put("deviceName", android.os.Build.MODEL ?: "Android Phone")
                put("batteryLevel", batteryPct)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()) }

            val responseCode = conn.responseCode
            val latency = System.currentTimeMillis() - start

            if (responseCode in 200..299) {
                val responseStr = BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                val json = JSONObject(responseStr)

                context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
                    .putString(KEY_SERVER_URL, cleanUrl)
                    .putString(KEY_DEVICE_TOKEN, json.optString("deviceToken"))
                    .putString(KEY_DEVICE_ID, json.optString("deviceId"))
                    .putBoolean(KEY_IS_PAIRED, true)
                    .apply()

                PairResult(true, "● Paired & Online (${latency}ms)", latency)
            } else {
                val errText = conn.errorStream?.bufferedReader()?.readText() ?: "HTTP $responseCode"
                val errMsg = try { JSONObject(errText).optString("error", errText) } catch (_: Exception) { errText }
                PairResult(false, errMsg, latency)
            }
        } catch (e: Exception) {
            PairResult(false, e.localizedMessage ?: "Network connection failed. Check your Server URL.", System.currentTimeMillis() - start)
        }
    }
}
