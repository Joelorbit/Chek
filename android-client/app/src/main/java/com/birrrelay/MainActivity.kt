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
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.cardview.widget.CardView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : Activity() {

    // ── Top Bar ──
    private lateinit var tvAppTitle: TextView
    private lateinit var tvTopStatus: TextView
    private lateinit var tvBatteryBadge: TextView

    // ── Bottom Dock ──
    private lateinit var dockTabHome: LinearLayout
    private lateinit var dockTabRelay: LinearLayout
    private lateinit var dockTabSettings: LinearLayout
    private lateinit var tvDockHomeText: TextView
    private lateinit var tvDockRelayText: TextView
    private lateinit var tvDockSettingsText: TextView

    // ── Tab Views ──
    private lateinit var tabHomeView: LinearLayout
    private lateinit var tabRelayView: View
    private lateinit var tabSettingsView: View

    // ── Home Tab ──
    private lateinit var tvHomeVolume: TextView
    private lateinit var tvHomeCount: TextView
    private lateinit var tvEmptyFeed: CardView
    private lateinit var rvPayments: RecyclerView
    private lateinit var btnSyncPastSms: Button
    private lateinit var chipAll: TextView
    private lateinit var chipCbe: TextView
    private lateinit var chipTelebirr: TextView
    private lateinit var chipBoa: TextView
    private lateinit var chipAwash: TextView

    // ── Relay Tab ──
    private lateinit var etServerUrl: EditText
    private lateinit var btnTestPing: Button
    private lateinit var btnPair: Button
    private lateinit var btnGrantNotification: Button
    private lateinit var btnGrantSms: Button

    // PIN boxes (OTP-style, 6 individual fields)
    private lateinit var pinBox1: EditText
    private lateinit var pinBox2: EditText
    private lateinit var pinBox3: EditText
    private lateinit var pinBox4: EditText
    private lateinit var pinBox5: EditText
    private lateinit var pinBox6: EditText

    // ── Console Tab ──
    private lateinit var btnThemeToggle: Button
    private lateinit var tvTerminalLogs: TextView
    private lateinit var btnClearLogs: Button

    // ── State ──
    private var isDarkMode = true
    private var currentFilter: String? = null // null = All
    private lateinit var paymentAdapter: PaymentAdapter
    private val allPayments = mutableListOf<StoredPayment>()

    private val paymentReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            runOnUiThread {
                loadPaymentsFromStore()
                val log = intent?.getStringExtra("payment_log") ?: ""
                if (log.isNotEmpty()) appendLog(log)
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        bindViews()
        setupRecyclerView()
        setupPinBoxAutoAdvance()
        setupDockNavigation()
        setupFilterChips()
        setupRelayTab()
        setupConsoleTab()
        checkAndRequestPermissions()
        updateBatteryDisplay()
        updatePermissionButtons()

        // Restore paired state
        if (ApiClient.isPaired(this)) {
            setStatusActive()
        }

        loadPaymentsFromStore()
    }

    // ──────────────────────────────────────────────────────────────
    // VIEW BINDING
    // ──────────────────────────────────────────────────────────────
    private fun bindViews() {
        tvAppTitle = findViewById(R.id.tvAppTitle)
        tvTopStatus = findViewById(R.id.tvTopStatus)
        tvBatteryBadge = findViewById(R.id.tvBatteryBadge)

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
        rvPayments = findViewById(R.id.rvPayments)
        btnSyncPastSms = findViewById(R.id.btnSyncPastSms)
        chipAll = findViewById(R.id.chipAll)
        chipCbe = findViewById(R.id.chipCbe)
        chipTelebirr = findViewById(R.id.chipTelebirr)
        chipBoa = findViewById(R.id.chipBoa)
        chipAwash = findViewById(R.id.chipAwash)

        etServerUrl = findViewById(R.id.etServerUrl)
        btnTestPing = findViewById(R.id.btnTestPing)
        btnPair = findViewById(R.id.btnPair)
        btnGrantNotification = findViewById(R.id.btnGrantNotification)
        btnGrantSms = findViewById(R.id.btnGrantSms)

        pinBox1 = findViewById(R.id.pinBox1)
        pinBox2 = findViewById(R.id.pinBox2)
        pinBox3 = findViewById(R.id.pinBox3)
        pinBox4 = findViewById(R.id.pinBox4)
        pinBox5 = findViewById(R.id.pinBox5)
        pinBox6 = findViewById(R.id.pinBox6)

        btnThemeToggle = findViewById(R.id.btnThemeToggle)
        tvTerminalLogs = findViewById(R.id.tvTerminalLogs)
        btnClearLogs = findViewById(R.id.btnClearLogs)

        // Restore saved server URL
        etServerUrl.setText(ApiClient.getServerUrl(this))
    }

    // ──────────────────────────────────────────────────────────────
    // RECYCLER VIEW
    // ──────────────────────────────────────────────────────────────
    private fun setupRecyclerView() {
        paymentAdapter = PaymentAdapter { payment ->
            // Tap on card → open inspector bottom sheet
            PaymentInspectorDialog(this, payment).show()
        }
        rvPayments.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = paymentAdapter
            setHasFixedSize(false)
        }
    }

    // ──────────────────────────────────────────────────────────────
    // OTP PIN BOXES — Auto-advance on digit entry
    // ──────────────────────────────────────────────────────────────
    private fun setupPinBoxAutoAdvance() {
        val boxes = listOf(pinBox1, pinBox2, pinBox3, pinBox4, pinBox5, pinBox6)
        boxes.forEachIndexed { i, box ->
            box.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    if (!s.isNullOrEmpty() && i < boxes.size - 1) {
                        boxes[i + 1].requestFocus()
                    }
                }
            })
            // Backspace — go to previous box
            box.setOnKeyListener { _, keyCode, _ ->
                if (keyCode == android.view.KeyEvent.KEYCODE_DEL && box.text.isEmpty() && i > 0) {
                    boxes[i - 1].requestFocus()
                    true
                } else false
            }
        }
    }

    private fun getPinValue(): String {
        return listOf(pinBox1, pinBox2, pinBox3, pinBox4, pinBox5, pinBox6)
            .joinToString("") { it.text.toString() }
    }

    private fun clearPinBoxes() {
        listOf(pinBox1, pinBox2, pinBox3, pinBox4, pinBox5, pinBox6).forEach { it.text.clear() }
    }

    // ──────────────────────────────────────────────────────────────
    // DOCK NAVIGATION
    // ──────────────────────────────────────────────────────────────
    private fun setupDockNavigation() {
        dockTabHome.setOnClickListener { switchTab(0) }
        dockTabRelay.setOnClickListener { switchTab(1) }
        dockTabSettings.setOnClickListener { switchTab(2) }
    }

    private fun switchTab(tabIndex: Int) {
        tabHomeView.visibility = if (tabIndex == 0) View.VISIBLE else View.GONE
        tabRelayView.visibility = if (tabIndex == 1) View.VISIBLE else View.GONE
        tabSettingsView.visibility = if (tabIndex == 2) View.VISIBLE else View.GONE

        val active = Color.parseColor("#5A6237")
        val inactive = Color.parseColor("#848580")

        tvDockHomeText.setTextColor(if (tabIndex == 0) active else inactive)
        tvDockRelayText.setTextColor(if (tabIndex == 1) active else inactive)
        tvDockSettingsText.setTextColor(if (tabIndex == 2) active else inactive)
    }

    // ──────────────────────────────────────────────────────────────
    // FILTER CHIPS
    // ──────────────────────────────────────────────────────────────
    private fun setupFilterChips() {
        val chips = mapOf(
            chipAll to null,
            chipCbe to "CBE",
            chipTelebirr to "TELEBIRR",
            chipBoa to "BOA",
            chipAwash to "AWASH"
        )
        chips.forEach { (chip, filter) ->
            chip.setOnClickListener {
                currentFilter = filter
                chips.keys.forEach { it.isSelected = false }
                chip.isSelected = true
                applyFilter()
            }
        }
    }

    private fun applyFilter() {
        val filtered = if (currentFilter == null) {
            allPayments
        } else {
            allPayments.filter { it.provider.equals(currentFilter, ignoreCase = true) }
        }
        paymentAdapter.submitList(filtered.toList())
        updateEmptyState(filtered.isEmpty())
    }

    // ──────────────────────────────────────────────────────────────
    // RELAY TAB
    // ──────────────────────────────────────────────────────────────
    private fun setupRelayTab() {
        btnGrantNotification.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        btnGrantSms.setOnClickListener {
            checkAndRequestPermissions()
        }

        btnTestPing.setOnClickListener {
            val server = etServerUrl.text.toString().trim()
            if (server.isEmpty()) {
                Toast.makeText(this, "Enter a Server URL first", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            testServerPing(server)
        }

        btnPair.setOnClickListener {
            val server = etServerUrl.text.toString().trim()
            val pin = getPinValue()

            if (server.isEmpty()) {
                Toast.makeText(this, "Enter your Server URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (pin.length != 6) {
                Toast.makeText(this, "Enter all 6 digits from the web dashboard", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (!isNotificationServiceEnabled()) {
                Toast.makeText(this, "Enable Notification Access first", Toast.LENGTH_LONG).show()
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                return@setOnClickListener
            }
            pairDevice(server, pin)
        }
    }

    // ──────────────────────────────────────────────────────────────
    // CONSOLE TAB
    // ──────────────────────────────────────────────────────────────
    private fun setupConsoleTab() {
        btnClearLogs.setOnClickListener {
            tvTerminalLogs.text = "[Chek Relay Engine Active]\nListening for bank transactions..."
        }

        btnThemeToggle.setOnClickListener {
            isDarkMode = !isDarkMode
            btnThemeToggle.text = if (isDarkMode) "Switch to Crisp White Mode" else "Switch to Charcoal Dark Mode"
            window.statusBarColor = Color.parseColor(if (isDarkMode) "#232323" else "#F5F6F4")
        }
    }

    // ──────────────────────────────────────────────────────────────
    // LOAD PAYMENTS + STATS
    // ──────────────────────────────────────────────────────────────
    private fun loadPaymentsFromStore() {
        val store = LocalPaymentStore(this)
        allPayments.clear()
        allPayments.addAll(store.getAllPayments())

        val total = store.getTotalVolume()
        val count = store.getPaymentCount()

        tvHomeVolume.text = String.format("%.2f ETB", total)
        tvHomeCount.text = "$count payment${if (count == 1) "" else "s"} intercepted  •  0% gateway cuts"

        applyFilter()
        updatePermissionButtons()
    }

    private fun updateEmptyState(isEmpty: Boolean) {
        tvEmptyFeed.visibility = if (isEmpty) View.VISIBLE else View.GONE
        rvPayments.visibility = if (isEmpty) View.GONE else View.VISIBLE
    }

    // ──────────────────────────────────────────────────────────────
    // DEEP SCAN SMS INBOX (Live Progress)
    // ──────────────────────────────────────────────────────────────
    private fun syncPastInboxSms() {
        btnSyncPastSms.isEnabled = false
        btnSyncPastSms.text = "⟳  Scanning..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val result = apiClient.syncInboxSms { scanned, total, found ->
                runOnUiThread {
                    btnSyncPastSms.text = if (total > 0) {
                        "Scanning $scanned / $total  ($found found)"
                    } else {
                        "Scanning... ($found found)"
                    }
                }
            }

            withContext(Dispatchers.Main) {
                btnSyncPastSms.isEnabled = true
                btnSyncPastSms.text = "⟳  Deep Scan SMS Inbox"
                loadPaymentsFromStore()
                Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_LONG).show()
                appendLog("[Scan Complete] ${result.message}")
            }
        }

        // Wire button click (needs to be done once in onCreate via btnSyncPastSms.setOnClickListener)
    }

    // ──────────────────────────────────────────────────────────────
    // NETWORK OPERATIONS
    // ──────────────────────────────────────────────────────────────
    private fun testServerPing(serverUrl: String) {
        btnTestPing.isEnabled = false
        btnTestPing.text = "..."

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient(this@MainActivity).testConnection(serverUrl)
            withContext(Dispatchers.Main) {
                btnTestPing.isEnabled = true
                btnTestPing.text = "⚡ Ping"
                Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_SHORT).show()
                appendLog("[Ping] $serverUrl → ${result.message}")
            }
        }
    }

    private fun pairDevice(serverUrl: String, pin: String) {
        btnPair.isEnabled = false
        tvTopStatus.text = "⏳ Pairing with Chek..."
        tvTopStatus.setTextColor(Color.parseColor("#B48148"))

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient(this@MainActivity).pair(serverUrl, pin)
            withContext(Dispatchers.Main) {
                btnPair.isEnabled = true
                if (result.success) {
                    setStatusActive()
                    clearPinBoxes()
                    Toast.makeText(this@MainActivity, "Paired! Relay engine is active.", Toast.LENGTH_SHORT).show()
                    appendLog("[Pair] Paired successfully with $serverUrl")
                    switchTab(0)
                    // Auto-sync past SMS inbox on first pairing
                    syncPastInboxSms()
                } else {
                    tvTopStatus.text = "✕ Pairing Failed"
                    tvTopStatus.setTextColor(Color.parseColor("#9E4235"))
                    Toast.makeText(this@MainActivity, result.message, Toast.LENGTH_LONG).show()
                    appendLog("[Pair Error] ${result.message}")
                }
            }
        }
    }

    // ──────────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────────
    private fun setStatusActive() {
        tvTopStatus.text = "● Relay Engine Active"
        tvTopStatus.setTextColor(Color.parseColor("#5A6237"))
    }

    private fun appendLog(message: String) {
        val ts = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        tvTerminalLogs.text = "[$ts] $message\n${tvTerminalLogs.text}"
    }

    private fun updateBatteryDisplay() {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val pct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
        tvBatteryBadge.text = "🔋 $pct%"
    }

    private fun updatePermissionButtons() {
        val smsGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        } else true
        val notifEnabled = isNotificationServiceEnabled()

        btnGrantSms.text = if (smsGranted) "✓ SMS Access Granted" else "⚠ Grant SMS Permission"
        btnGrantSms.backgroundTintList = android.content.res.ColorStateList.valueOf(
            Color.parseColor(if (smsGranted) "#2A3A1A" else "#323232")
        )
        btnGrantNotification.text = if (notifEnabled) "✓ Notification Access Active" else "⚠ Enable Notification Access"
        btnGrantNotification.backgroundTintList = android.content.res.ColorStateList.valueOf(
            Color.parseColor(if (notifEnabled) "#2A3A1A" else "#323232")
        )
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners") ?: return false
        return flat.contains(packageName)
    }

    private fun checkAndRequestPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val toRequest = mutableListOf<String>()
            if (checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED)
                toRequest.add(Manifest.permission.RECEIVE_SMS)
            if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED)
                toRequest.add(Manifest.permission.READ_SMS)
            if (toRequest.isNotEmpty()) requestPermissions(toRequest.toTypedArray(), 101)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 101) updatePermissionButtons()
    }

    // ──────────────────────────────────────────────────────────────
    // LIFECYCLE
    // ──────────────────────────────────────────────────────────────
    override fun onResume() {
        super.onResume()
        updateBatteryDisplay()
        updatePermissionButtons()
        loadPaymentsFromStore()

        // Wire sync button here to avoid multiple onClick registrations
        btnSyncPastSms.setOnClickListener { syncPastInboxSms() }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(paymentReceiver, IntentFilter("com.chek.PAYMENT_RECEIVED"), Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            registerReceiver(paymentReceiver, IntentFilter("com.chek.PAYMENT_RECEIVED"))
        }
    }

    override fun onPause() {
        super.onPause()
        try { unregisterReceiver(paymentReceiver) } catch (_: Exception) {}
    }
}
