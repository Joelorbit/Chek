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
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RelativeLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : Activity() {

    private lateinit var rootContainer: RelativeLayout
    private lateinit var topBar: LinearLayout
    private lateinit var tvAppTitle: TextView
    private lateinit var tvTopStatus: TextView
    private lateinit var tvBatteryBadge: TextView
    private lateinit var bottomDock: LinearLayout

    // Dock Tabs
    private lateinit var dockTabHome: LinearLayout
    private lateinit var dockTabRelay: LinearLayout
    private lateinit var dockTabSettings: LinearLayout
    private lateinit var tvDockHomeText: TextView
    private lateinit var tvDockRelayText: TextView
    private lateinit var tvDockSettingsText: TextView

    // Tab Views
    private lateinit var tabHomeView: LinearLayout
    private lateinit var tabRelayView: LinearLayout
    private lateinit var tabSettingsView: LinearLayout

    // Home Tab Components
    private lateinit var tvHomeVolume: TextView
    private lateinit var tvHomeCount: TextView
    private lateinit var tvHomeFeed: TextView
    private lateinit var cardVolumeSummary: LinearLayout
    private lateinit var cardFeedStream: LinearLayout

    // Relay Tab Components
    private lateinit var etServerUrl: EditText
    private lateinit var etPairingCode: EditText
    private lateinit var btnPair: Button
    private lateinit var btnTestPing: Button
    private lateinit var btnGrantNotification: Button
    private lateinit var btnGrantSms: Button
    private lateinit var cardRelayConfig: LinearLayout
    private lateinit var cardPermissions: LinearLayout

    // Settings Tab Components
    private lateinit var btnThemeToggle: Button
    private lateinit var tvTerminalLogs: TextView
    private lateinit var cardTheme: LinearLayout
    private lateinit var cardTerminal: LinearLayout

    private var isDarkMode = true
    private var totalVolume = 0.0
    private var totalCount = 0

    private val paymentReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val logText = intent?.getStringExtra("payment_log")
            val amount = intent?.getDoubleExtra("amount", 0.0) ?: 0.0
            if (!logText.isNullOrEmpty()) {
                runOnUiThread {
                    if (amount > 0) {
                        totalVolume += amount
                        totalCount += 1
                        tvHomeVolume.text = String.format("%.2f ETB", totalVolume)
                        tvHomeCount.text = "$totalCount payments relayed • 0% gateway cuts"
                    }
                    tvHomeFeed.text = "$logText\n\n${tvHomeFeed.text}"
                    tvTerminalLogs.text = "[${System.currentTimeMillis()}] $logText\n${tvTerminalLogs.text}"
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        rootContainer = findViewById(R.id.rootContainer)
        topBar = findViewById(R.id.topBar)
        tvAppTitle = findViewById(R.id.tvAppTitle)
        tvTopStatus = findViewById(R.id.tvTopStatus)
        tvBatteryBadge = findViewById(R.id.tvBatteryBadge)
        bottomDock = findViewById(R.id.bottomDock)

        dockTabHome = findViewById(R.id.dockTabHome)
        dockTabRelay = findViewById(R.id.dockTabRelay)
        dockTabSettings = findViewById(R.id.dockTabSettings)
        tvDockHomeText = findViewById(R.id.tvDockHomeText)
        tvDockRelayText = findViewById(R.id.tvDockRelayText)
        tvDockSettingsText = findViewById(R.id.tvDockSettingsText)

        tabHomeView = findViewById(R.id.tabHomeView)
        tabRelayView = findViewById(R.id.tabRelayView)
        tabSettingsView = findViewById(R.id.tabSettingsView)

        tvHomeVolume = findViewById(R.id.tvHomeVolume)
        tvHomeCount = findViewById(R.id.tvHomeCount)
        tvHomeFeed = findViewById(R.id.tvHomeFeed)
        cardVolumeSummary = findViewById(R.id.cardVolumeSummary)
        cardFeedStream = findViewById(R.id.cardFeedStream)

        etServerUrl = findViewById(R.id.etServerUrl)
        etPairingCode = findViewById(R.id.etPairingCode)
        btnPair = findViewById(R.id.btnPair)
        btnTestPing = findViewById(R.id.btnTestPing)
        btnGrantNotification = findViewById(R.id.btnGrantNotification)
        btnGrantSms = findViewById(R.id.btnGrantSms)
        cardRelayConfig = findViewById(R.id.cardRelayConfig)
        cardPermissions = findViewById(R.id.cardPermissions)

        btnThemeToggle = findViewById(R.id.btnThemeToggle)
        tvTerminalLogs = findViewById(R.id.tvTerminalLogs)
        cardTheme = findViewById(R.id.cardTheme)
        cardTerminal = findViewById(R.id.cardTerminal)

        // Setup Dock Navigation Tabs
        dockTabHome.setOnClickListener { switchTab(0) }
        dockTabRelay.setOnClickListener { switchTab(1) }
        dockTabSettings.setOnClickListener { switchTab(2) }

        // Restore saved server URL
        val savedUrl = ApiClient.getServerUrl(this)
        if (savedUrl != "https://your-domain.com") {
            etServerUrl.setText(savedUrl)
        }

        // Restore paired status
        if (ApiClient.isPaired(this)) {
            tvTopStatus.text = "● Companion Relay Active"
            tvTopStatus.setTextColor(Color.parseColor("#5A6237"))
        }

        // Permissions Check
        checkAndRequestPermissions()
        updateBatteryDisplay()

        btnGrantNotification.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnGrantSms.setOnClickListener {
            checkAndRequestPermissions()
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

    private fun switchTab(tabIndex: Int) {
        tabHomeView.visibility = if (tabIndex == 0) View.VISIBLE else View.GONE
        tabRelayView.visibility = if (tabIndex == 1) View.VISIBLE else View.GONE
        tabSettingsView.visibility = if (tabIndex == 2) View.VISIBLE else View.GONE

        val activeColor = Color.parseColor("#5A6237")
        val inactiveColor = if (isDarkMode) Color.parseColor("#848580") else Color.parseColor("#666666")

        tvDockHomeText.setTextColor(if (tabIndex == 0) activeColor else inactiveColor)
        tvDockRelayText.setTextColor(if (tabIndex == 1) activeColor else inactiveColor)
        tvDockSettingsText.setTextColor(if (tabIndex == 2) activeColor else inactiveColor)
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
        tvBatteryBadge.text = "🔋 $pct%"
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

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        return flat != null && flat.contains(pkgName)
    }

    private fun testServerReachability(serverUrl: String) {
        btnTestPing.isEnabled = false
        btnTestPing.text = "..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.testConnection(serverUrl)

            withContext(Dispatchers.Main) {
                btnTestPing.isEnabled = true
                btnTestPing.text = "⚡ Ping"
                Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun pairDevice(serverUrl: String, codeOrKey: String) {
        btnPair.isEnabled = false
        tvTopStatus.text = "⏳ Connecting to Chek..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.pair(serverUrl, codeOrKey)

            withContext(Dispatchers.Main) {
                btnPair.isEnabled = true
                if (result.success) {
                    tvTopStatus.text = "● Companion Relay Active"
                    tvTopStatus.setTextColor(Color.parseColor("#5A6237"))
                    Toast.makeText(this@MainActivity, "Connected & Paired Successfully!", Toast.LENGTH_SHORT).show()
                    switchTab(0)
                } else {
                    tvTopStatus.text = "✕ Pairing Failed"
                    tvTopStatus.setTextColor(Color.parseColor("#9E4235"))
                    Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun applyTheme() {
        if (isDarkMode) {
            rootContainer.setBackgroundColor(Color.parseColor("#232323"))
            topBar.setBackgroundColor(Color.parseColor("#232323"))
            bottomDock.setBackgroundColor(Color.parseColor("#2A2A2A"))

            cardVolumeSummary.setBackgroundColor(Color.parseColor("#2A2A2A"))
            cardFeedStream.setBackgroundColor(Color.parseColor("#2A2A2A"))
            cardRelayConfig.setBackgroundColor(Color.parseColor("#2A2A2A"))
            cardPermissions.setBackgroundColor(Color.parseColor("#2A2A2A"))
            cardTheme.setBackgroundColor(Color.parseColor("#2A2A2A"))
            cardTerminal.setBackgroundColor(Color.parseColor("#2A2A2A"))

            tvAppTitle.setTextColor(Color.parseColor("#D3D5D0"))
            btnThemeToggle.text = "☀️ Switch to Crisp White Mode"
            btnThemeToggle.setTextColor(Color.parseColor("#D3D5D0"))
            btnThemeToggle.setBackgroundColor(Color.parseColor("#323232"))
            window.statusBarColor = Color.parseColor("#232323")
        } else {
            rootContainer.setBackgroundColor(Color.parseColor("#F5F6F4"))
            topBar.setBackgroundColor(Color.parseColor("#F5F6F4"))
            bottomDock.setBackgroundColor(Color.parseColor("#FFFFFF"))

            cardVolumeSummary.setBackgroundColor(Color.parseColor("#FFFFFF"))
            cardFeedStream.setBackgroundColor(Color.parseColor("#FFFFFF"))
            cardRelayConfig.setBackgroundColor(Color.parseColor("#FFFFFF"))
            cardPermissions.setBackgroundColor(Color.parseColor("#FFFFFF"))
            cardTheme.setBackgroundColor(Color.parseColor("#FFFFFF"))
            cardTerminal.setBackgroundColor(Color.parseColor("#FFFFFF"))

            tvAppTitle.setTextColor(Color.parseColor("#232323"))
            btnThemeToggle.text = "🌙 Switch to Charcoal Dark Mode"
            btnThemeToggle.setTextColor(Color.parseColor("#232323"))
            btnThemeToggle.setBackgroundColor(Color.parseColor("#EAEAEA"))
            window.statusBarColor = Color.parseColor("#F5F6F4")
        }
    }
}
