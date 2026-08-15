package com.birrrelay

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.BatteryManager
import android.os.Build
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
    private lateinit var tvBrandTitle: TextView
    private lateinit var etServerUrl: EditText
    private lateinit var etPairingCode: EditText
    private lateinit var btnPair: Button
    private lateinit var btnTestPing: Button
    private lateinit var tvStatus: TextView
    private lateinit var tvBatteryPct: TextView
    private lateinit var tvPrivacyNotice: TextView
    private lateinit var tvLiveLog: TextView
    private lateinit var mainCard: LinearLayout
    private lateinit var statusCard: LinearLayout
    private lateinit var logCard: LinearLayout

    private var isDarkMode = true

    private val paymentReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val logText = intent?.getStringExtra("payment_log")
            if (!logText.isNullOrEmpty()) {
                runOnUiThread {
                    tvLiveLog.text = logText
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        rootLayout = findViewById(R.id.rootLayout)
        btnThemeToggle = findViewById(R.id.btnThemeToggle)
        tvBrandTitle = findViewById(R.id.tvBrandTitle)
        etServerUrl = findViewById(R.id.etServerUrl)
        etPairingCode = findViewById(R.id.etPairingCode)
        btnPair = findViewById(R.id.btnPair)
        btnTestPing = findViewById(R.id.btnTestPing)
        tvStatus = findViewById(R.id.tvStatus)
        tvBatteryPct = findViewById(R.id.tvBatteryPct)
        tvPrivacyNotice = findViewById(R.id.tvPrivacyNotice)
        tvLiveLog = findViewById(R.id.tvLiveLog)
        mainCard = findViewById(R.id.mainCard)
        statusCard = findViewById(R.id.statusCard)
        logCard = findViewById(R.id.logCard)

        // Request SMS permissions if not granted
        checkAndRequestPermissions()

        // Display current battery level
        updateBatteryDisplay()

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

    override fun onResume() {
        super.onResume()
        updateBatteryDisplay()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(paymentReceiver, IntentFilter("com.chek.PAYMENT_RECEIVED"), Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(paymentReceiver, IntentFilter("com.chek.PAYMENT_RECEIVED"))
        }
    }

    override fun onPause() {
        super.onPause()
        try {
            unregisterReceiver(paymentReceiver)
        } catch (_: Exception) {}
    }

    private fun updateBatteryDisplay() {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val pct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
        tvBatteryPct.text = "🔋 $pct%"
    }

    private fun checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val permissionsToRequest = mutableListOf<String>()
            if (checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.RECEIVE_SMS)
            }
            if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_SMS)
            }
            if (permissionsToRequest.isNotEmpty()) {
                requestPermissions(permissionsToRequest.toTypedArray(), 101)
            }
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
            logCard.setBackgroundColor(Color.parseColor("#2A2A2A"))
            tvBrandTitle.setTextColor(Color.parseColor("#D3D5D0"))
            btnThemeToggle.text = "☀️ Light"
            btnThemeToggle.setTextColor(Color.parseColor("#D3D5D0"))
            btnThemeToggle.setBackgroundColor(Color.parseColor("#323232"))
            btnPair.setBackgroundColor(Color.parseColor("#5A6237"))
            btnPair.setTextColor(Color.parseColor("#D3D5D0"))
            window.statusBarColor = Color.parseColor("#232323")
        } else {
            rootLayout.setBackgroundColor(Color.parseColor("#F5F6F4"))
            mainCard.setBackgroundColor(Color.parseColor("#FFFFFF"))
            statusCard.setBackgroundColor(Color.parseColor("#FFFFFF"))
            logCard.setBackgroundColor(Color.parseColor("#FFFFFF"))
            tvBrandTitle.setTextColor(Color.parseColor("#232323"))
            btnThemeToggle.text = "🌙 Dark"
            btnThemeToggle.setTextColor(Color.parseColor("#232323"))
            btnThemeToggle.setBackgroundColor(Color.parseColor("#EAEAEA"))
            btnPair.setBackgroundColor(Color.parseColor("#5A6237"))
            btnPair.setTextColor(Color.parseColor("#FFFFFF"))
            window.statusBarColor = Color.parseColor("#F5F6F4")
        }
    }
}
