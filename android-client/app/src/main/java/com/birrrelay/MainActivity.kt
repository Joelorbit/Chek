package com.birrrelay

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : Activity() {

    private lateinit var etServerUrl: EditText
    private lateinit var etPairingCode: EditText
    private lateinit var btnPair: Button
    private lateinit var tvStatus: TextView
    private lateinit var btnThemeToggle: Button
    private lateinit var rootLayout: ScrollView

    // Multi-Theme Presets from Joelorbit/Mytheme
    private val themePresets = listOf(
        ThemeConfig("Eyu Charcoal", "#232323", "#2A2A2A", "#D3D5D0", "#5A6237", "#B48148"),
        ThemeConfig("Cyber Olive", "#192017", "#222B1E", "#E2E6D8", "#728C34", "#A4C639"),
        ThemeConfig("Emerald Sage", "#14201C", "#1D2D27", "#D5E5DF", "#4EA082", "#C29F53"),
        ThemeConfig("Solar Ochre", "#241C16", "#30251E", "#EBDCCB", "#D99B43", "#C86341"),
        ThemeConfig("Eyu Light Cream", "#F5F6F4", "#FFFFFF", "#232323", "#5A6237", "#B48148")
    )
    private var currentThemeIndex = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        rootLayout = findViewById(R.id.rootLayout)
        etServerUrl = findViewById(R.id.etServerUrl)
        etPairingCode = findViewById(R.id.etPairingCode)
        btnPair = findViewById(R.id.btnPair)
        tvStatus = findViewById(R.id.tvStatus)
        btnThemeToggle = findViewById(R.id.btnThemeToggle)

        val prefs = getSharedPreferences("birrrelay_prefs", Context.MODE_PRIVATE)
        currentThemeIndex = prefs.getInt("theme_index", 0)
        applyTheme(themePresets[currentThemeIndex])

        btnThemeToggle.setOnClickListener {
            currentThemeIndex = (currentThemeIndex + 1) % themePresets.size
            prefs.edit().putInt("theme_index", currentThemeIndex).apply()
            applyTheme(themePresets[currentThemeIndex])
        }

        // Restore saved server URL
        val savedServer = prefs.getString("server_url", "https://your-domain.com")
        etServerUrl.setText(savedServer)

        if (prefs.getBoolean("is_paired", false)) {
            val deviceId = prefs.getString("device_id", "")
            tvStatus.text = "● Active Relay (Device: ${deviceId?.take(8)}...)"
            tvStatus.setTextColor(Color.parseColor(themePresets[currentThemeIndex].accent))
            btnPair.text = "Re-pair Device"
        }

        btnPair.setOnClickListener {
            val server = etServerUrl.text.toString().trim()
            val code = etPairingCode.text.toString().trim()

            if (server.isEmpty() || code.length != 6) {
                Toast.makeText(this, "Please enter a valid server URL and 6-digit PIN", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Check notification access permission
            if (!isNotificationServiceEnabled()) {
                Toast.makeText(this, "Please enable Notification Access for BirrRelay", Toast.LENGTH_LONG).show()
                startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                return@setOnClickListener
            }

            pairDevice(server, code)
        }
    }

    private fun applyTheme(theme: ThemeConfig) {
        rootLayout.setBackgroundColor(Color.parseColor(theme.bg))
        btnThemeToggle.text = "🎨 ${theme.name}"
        btnThemeToggle.setTextColor(Color.parseColor(theme.ink))
        btnPair.setBackgroundColor(Color.parseColor(theme.accent))
        btnPair.setTextColor(Color.parseColor(if (theme.name.contains("Light")) "#FFFFFF" else theme.ink))
        window.statusBarColor = Color.parseColor(theme.bg)
        window.navigationBarColor = Color.parseColor(theme.bg)
    }

    private fun isNotificationServiceEnabled(): Boolean {
        val pkgName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
        return flat != null && flat.contains(pkgName)
    }

    private fun pairDevice(serverUrl: String, pairingCode: String) {
        btnPair.isEnabled = false
        tvStatus.text = "⏳ Pairing with BirrRelay server..."

        CoroutineScope(Dispatchers.IO).launch {
            val apiClient = ApiClient(this@MainActivity)
            val success = apiClient.pairWithCode(serverUrl, pairingCode)

            withContext(Dispatchers.Main) {
                btnPair.isEnabled = true
                if (success) {
                    tvStatus.text = "● Connected & Relaying Payments"
                    tvStatus.setTextColor(Color.parseColor(themePresets[currentThemeIndex].accent))
                    Toast.makeText(this@MainActivity, "Device paired successfully!", Toast.LENGTH_SHORT).show()
                } else {
                    tvStatus.text = "✕ Pairing failed. Check PIN or server URL."
                    tvStatus.setTextColor(Color.parseColor("#9E4235"))
                }
            }
        }
    }

    data class ThemeConfig(
        val name: String,
        val bg: String,
        val card: String,
        val ink: String,
        val accent: String,
        val complement: String
    )
}
