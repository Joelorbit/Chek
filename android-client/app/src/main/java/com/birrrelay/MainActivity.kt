package com.birrrelay

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : Activity() {

    private lateinit var rootLayout: ScrollView
    private lateinit var btnThemeToggle: Button
    private lateinit var etServerUrl: EditText
    private lateinit var etPairingCode: EditText
    private lateinit var btnPair: Button
    private lateinit var btnTestPing: Button
    private lateinit var tvStatus: TextView
    private lateinit var mainCard: LinearLayout
    private lateinit var statusCard: LinearLayout

    private var isDarkMode = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        rootLayout = findViewById(R.id.rootLayout)
        btnThemeToggle = findViewById(R.id.btnThemeToggle)
        etServerUrl = findViewById(R.id.etServerUrl)
        etPairingCode = findViewById(R.id.etPairingCode)
        btnPair = findViewById(R.id.btnPair)
        btnTestPing = findViewById(R.id.btnTestPing)
        tvStatus = findViewById(R.id.tvStatus)
        mainCard = findViewById(R.id.mainCard)
        statusCard = findViewById(R.id.statusCard)

        // Restore saved server URL if available
        val savedUrl = ApiClient.getServerUrl(this)
        if (savedUrl != "https://your-domain.com") {
            etServerUrl.setText(savedUrl)
        }

        // Restore saved paired status
        if (ApiClient.isPaired(this)) {
            tvStatus.text = "● Connected & Relaying Payments"
            tvStatus.setTextColor(Color.parseColor("#5A6237"))
        }

        btnThemeToggle.setOnClickListener {
            isDarkMode = !isDarkMode
            applyTheme()
        }

        btnTestPing.setOnClickListener {
            val server = etServerUrl.text.toString().trim()
            if (server.isEmpty()) {
                Toast.makeText(this, "Enter a Server URL first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            testServerReachability(server)
        }

        btnPair.setOnClickListener {
            val server = etServerUrl.text.toString().trim()
            val codeOrKey = etPairingCode.text.toString().trim()

            if (server.isEmpty()) {
                Toast.makeText(this, "Please enter your Server URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (codeOrKey.isEmpty()) {
                Toast.makeText(this, "Enter your 6-digit PIN or API Key", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (!isNotificationServiceEnabled()) {
                Toast.makeText(this, "Please enable Notification Access for Chek", Toast.LENGTH_LONG).show()
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                return@setOnClickListener
            }

            pairDevice(server, codeOrKey)
        }
    }

    private fun testServerReachability(serverUrl: String) {
        btnTestPing.isEnabled = false
        btnTestPing.text = "..."
        tvStatus.text = "⏳ Testing reachability..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.testConnection(serverUrl)

            withContext(Dispatchers.Main) {
                btnTestPing.isEnabled = true
                btnTestPing.text = "⚡ Ping"
                if (result.success) {
                    tvStatus.text = "● " + result.message
                    tvStatus.setTextColor(Color.parseColor("#5A6237"))
                    Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_SHORT).show()
                } else {
                    tvStatus.text = "✕ " + result.message
                    tvStatus.setTextColor(Color.parseColor("#9E4235"))
                    Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        return flat != null && flat.contains(pkgName)
    }

    private fun pairDevice(serverUrl: String, codeOrKey: String) {
        btnPair.isEnabled = false
        tvStatus.text = "⏳ Connecting with Chek server..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.pair(serverUrl, codeOrKey)

            withContext(Dispatchers.Main) {
                btnPair.isEnabled = true
                if (result.success) {
                    tvStatus.text = result.message
                    tvStatus.setTextColor(Color.parseColor("#5A6237"))
                    Toast.makeText(this@MainActivity, "Connected & Paired Successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    tvStatus.text = "✕ " + result.message
                    tvStatus.setTextColor(Color.parseColor("#9E4235"))
                    Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun applyTheme() {
        if (isDarkMode) {
            rootLayout.setBackgroundColor(Color.parseColor("#232323"))
            mainCard.setBackgroundColor(Color.parseColor("#2A2A2A"))
            statusCard.setBackgroundColor(Color.parseColor("#2A2A2A"))
            btnThemeToggle.text = "☀️ Light"
            btnThemeToggle.setTextColor(Color.parseColor("#D3D5D0"))
            btnPair.setBackgroundColor(Color.parseColor("#5A6237"))
            btnPair.setTextColor(Color.parseColor("#D3D5D0"))
            window.statusBarColor = Color.parseColor("#232323")
        } else {
            rootLayout.setBackgroundColor(Color.parseColor("#F5F6F4"))
            mainCard.setBackgroundColor(Color.parseColor("#FFFFFF"))
            statusCard.setBackgroundColor(Color.parseColor("#FFFFFF"))
            btnThemeToggle.text = "🌙 Dark"
            btnThemeToggle.setTextColor(Color.parseColor("#232323"))
            btnPair.setBackgroundColor(Color.parseColor("#5A6237"))
            btnPair.setTextColor(Color.parseColor("#FFFFFF"))
            window.statusBarColor = Color.parseColor("#F5F6F4")
        }
    }
}
