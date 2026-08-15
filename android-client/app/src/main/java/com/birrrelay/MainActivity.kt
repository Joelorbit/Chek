package com.birrrelay

import android.Manifest
import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RelativeLayout
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
    private lateinit var tvEmptyFeed: TextView
    private lateinit var llPaymentCards: LinearLayout
    private lateinit var btnSyncPastSms: Button
    private lateinit var cardVolumeSummary: LinearLayout

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

    private val paymentReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            runOnUiThread {
                loadPaymentsFromStore()
                val rawLog = intent?.getStringExtra("rawMessage") ?: ""
                if (rawLog.isNotEmpty()) {
                    tvTerminalLogs.text = "[${System.currentTimeMillis()}] $rawLog\n${tvTerminalLogs.text}"
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
        tvEmptyFeed = findViewById(R.id.tvEmptyFeed)
        llPaymentCards = findViewById(R.id.llPaymentCards)
        btnSyncPastSms = findViewById(R.id.btnSyncPastSms)
        cardVolumeSummary = findViewById(R.id.cardVolumeSummary)

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
        etServerUrl.setText(savedUrl)

        // Restore paired status
        if (ApiClient.isPaired(this)) {
            tvTopStatus.text = "● Companion Relay Active"
            tvTopStatus.setTextColor(Color.parseColor("#5A6237"))
        }

        // Permissions Check
        checkAndRequestPermissions()
        updateBatteryDisplay()
        loadPaymentsFromStore()

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
            val pin = etPairingCode.text.toString().trim()

            if (server.isEmpty()) {
                Toast.makeText(this, "Please enter your Server URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (pin.length != 6) {
                Toast.makeText(this, "Enter the 6-digit PIN from the Chek web dashboard", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            if (!isNotificationServiceEnabled()) {
                Toast.makeText(this, "Please enable Notification Access for Chek", Toast.LENGTH_LONG).show()
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                return@setOnClickListener
            }

            pairDevice(server, pin)
        }

        btnSyncPastSms.setOnClickListener {
            syncPastInboxSms()
        }
    }

    private fun loadPaymentsFromStore() {
        val store = LocalPaymentStore(this)
        val payments = store.getAllPayments()
        val totalVolume = store.getTotalVolume()
        val count = store.getPaymentCount()

        tvHomeVolume.text = String.format("%.2f ETB", totalVolume)
        tvHomeCount.text = "$count payments intercepted • 0% gateway cuts"

        llPaymentCards.removeAllViews()

        if (payments.isEmpty()) {
            tvEmptyFeed.visibility = View.VISIBLE
        } else {
            tvEmptyFeed.visibility = View.GONE
            for (p in payments) {
                val cardView = createPaymentCardView(p)
                llPaymentCards.addView(cardView)
            }
        }
    }

    private fun createPaymentCardView(p: StoredPayment): View {
        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundResource(if (isDarkMode) R.drawable.card_rounded_dark else R.drawable.card_rounded_light)
            setPadding(36, 32, 36, 32)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = 24
            }
            layoutParams = lp
        }

        // Header Row: Provider Badge + Amount
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val providerBadgeColor = when (p.provider.uppercase()) {
            "TELEBIRR" -> Color.parseColor("#B48148") // Ochre
            "CBE" -> Color.parseColor("#5A6237") // Olive
            "BOA" -> Color.parseColor("#7E5026") // Terracotta
            "AWASH" -> Color.parseColor("#4EA082") // Sage
            else -> Color.parseColor("#5A6237")
        }

        val tvBadge = TextView(this).apply {
            text = "● ${p.provider}"
            textSize = 10f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(providerBadgeColor)
            setPadding(16, 6, 16, 6)
            setBackgroundColor(Color.parseColor(if (isDarkMode) "#1E1E1E" else "#EDEBE7"))
        }

        val tvAmount = TextView(this).apply {
            text = String.format("+%.2f %s", p.amount, p.currency)
            textSize = 17f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(if (isDarkMode) Color.parseColor("#D3D5D0") else Color.parseColor("#232323"))
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        headerRow.addView(tvBadge)
        headerRow.addView(tvAmount)
        card.addView(headerRow)

        // Payer Row
        val tvPayer = TextView(this).apply {
            val phoneStr = if (!p.payerPhoneOrAcc.isNullOrEmpty()) " (${p.payerPhoneOrAcc})" else ""
            text = "From: ${p.payerName}$phoneStr"
            textSize = 12f
            setTextColor(if (isDarkMode) Color.parseColor("#848580") else Color.parseColor("#666666"))
            setPadding(0, 12, 0, 8)
        }
        card.addView(tvPayer)

        // Footer Row: Ref Pill + Status
        val footerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val tvRef = TextView(this).apply {
            text = "Ref: [${p.referenceId}]"
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setTextColor(Color.parseColor("#B48148"))
        }

        val tvStatus = TextView(this).apply {
            text = if (p.isRelayed) "● Cloud Synced ✓" else "● Saved on Device"
            textSize = 10f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor(if (p.isRelayed) "#5A6237" else "#848580"))
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        footerRow.addView(tvRef)
        footerRow.addView(tvStatus)
        card.addView(footerRow)

        return card
    }

    private fun syncPastInboxSms() {
        btnSyncPastSms.isEnabled = false
        btnSyncPastSms.text = "⏳ Scanning SMS Inbox..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.syncInboxSms()

            withContext(Dispatchers.Main) {
                btnSyncPastSms.isEnabled = true
                btnSyncPastSms.text = "🔄 Sync Past Bank SMS Inbox"
                loadPaymentsFromStore()
                Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_LONG).show()
                tvTerminalLogs.text = "[${System.currentTimeMillis()}] ${result.message}\n${tvTerminalLogs.text}"
            }
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
        loadPaymentsFromStore()
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

    private fun pairDevice(serverUrl: String, pin: String) {
        btnPair.isEnabled = false
        tvTopStatus.text = "⏳ Pairing with Chek..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.pair(serverUrl, pin)

            withContext(Dispatchers.Main) {
                btnPair.isEnabled = true
                if (result.success) {
                    tvTopStatus.text = "● Companion Relay Active"
                    tvTopStatus.setTextColor(Color.parseColor("#5A6237"))
                    Toast.makeText(this@MainActivity, "Paired Successfully with Chek!", Toast.LENGTH_SHORT).show()
                    switchTab(0)
                    // Auto-sync past SMS inbox upon pairing
                    syncPastInboxSms()
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
            bottomDock.setBackgroundResource(R.drawable.dock_rounded_dark)

            cardVolumeSummary.setBackgroundResource(R.drawable.card_rounded_dark)
            tvEmptyFeed.setBackgroundResource(R.drawable.card_rounded_dark)
            cardRelayConfig.setBackgroundResource(R.drawable.card_rounded_dark)
            cardPermissions.setBackgroundResource(R.drawable.card_rounded_dark)
            cardTheme.setBackgroundResource(R.drawable.card_rounded_dark)
            cardTerminal.setBackgroundResource(R.drawable.card_rounded_dark)

            tvAppTitle.setTextColor(Color.parseColor("#D3D5D0"))
            tvHomeVolume.setTextColor(Color.parseColor("#D3D5D0"))
            btnThemeToggle.text = "Switch to Crisp White Mode"
            btnThemeToggle.setTextColor(Color.parseColor("#D3D5D0"))
            btnThemeToggle.setBackgroundColor(Color.parseColor("#323232"))
            window.statusBarColor = Color.parseColor("#232323")
        } else {
            rootContainer.setBackgroundColor(Color.parseColor("#F5F6F4"))
            topBar.setBackgroundColor(Color.parseColor("#F5F6F4"))
            bottomDock.setBackgroundResource(R.drawable.dock_rounded_light)

            cardVolumeSummary.setBackgroundResource(R.drawable.card_rounded_light)
            tvEmptyFeed.setBackgroundResource(R.drawable.card_rounded_light)
            cardRelayConfig.setBackgroundResource(R.drawable.card_rounded_light)
            cardPermissions.setBackgroundResource(R.drawable.card_rounded_light)
            cardTheme.setBackgroundResource(R.drawable.card_rounded_light)
            cardTerminal.setBackgroundResource(R.drawable.card_rounded_light)

            tvAppTitle.setTextColor(Color.parseColor("#232323"))
            tvHomeVolume.setTextColor(Color.parseColor("#232323"))
            btnThemeToggle.text = "Switch to Charcoal Dark Mode"
            btnThemeToggle.setTextColor(Color.parseColor("#232323"))
            btnThemeToggle.setBackgroundColor(Color.parseColor("#EAEAEA"))
            window.statusBarColor = Color.parseColor("#F5F6F4")
        }
        loadPaymentsFromStore()
    }
}
