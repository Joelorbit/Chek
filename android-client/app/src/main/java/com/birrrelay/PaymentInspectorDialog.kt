package com.birrrelay

import android.app.Dialog
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Full-screen bottom-sheet-style dialog showing all payment details.
 * Displays raw SMS, parsed JSON, Copy Ref, and Share buttons.
 */
class PaymentInspectorDialog(
    context: Context,
    private val payment: StoredPayment
) : Dialog(context, android.R.style.Theme_Translucent_NoTitleBar) {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        buildLayout()

        window?.apply {
            setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            setGravity(Gravity.BOTTOM)
            setBackgroundDrawableResource(android.R.color.transparent)
            setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        }
    }

    private fun buildLayout() {
        val ctx = context
        val dp = ctx.resources.displayMetrics.density

        // ── Dim overlay (tap to dismiss) ──
        val root = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.BOTTOM
            setBackgroundColor(Color.argb(160, 0, 0, 0))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setOnClickListener { dismiss() }
        }

        // ── Sheet container ──
        val sheet = LinearLayout(ctx).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#2A2A2A"))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams = lp
            setPadding((20 * dp).toInt(), (20 * dp).toInt(), (20 * dp).toInt(), (32 * dp).toInt())
            setOnClickListener { /* consume — don't dismiss */ }
        }

        // ── Handle bar ──
        val handle = View(ctx).apply {
            setBackgroundColor(Color.parseColor("#444444"))
            val lp = LinearLayout.LayoutParams((40 * dp).toInt(), (4 * dp).toInt())
            lp.gravity = Gravity.CENTER_HORIZONTAL
            lp.bottomMargin = (16 * dp).toInt()
            layoutParams = lp
        }
        sheet.addView(handle)

        // ── Provider + Amount header ──
        val headerRow = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = (12 * dp).toInt()
            layoutParams = lp
        }
        val provColor = PaymentAdapter.providerColor(payment.provider)
        val tvProvider = TextView(ctx).apply {
            text = "● ${payment.provider.replace("_", " ")}"
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(provColor)
            setPadding((12 * dp).toInt(), (4 * dp).toInt(), (12 * dp).toInt(), (4 * dp).toInt())
            setBackgroundColor(Color.parseColor("#1A1A1A"))
        }
        val tvAmountHeader = TextView(ctx).apply {
            text = "+${String.format("%.2f", payment.amount)} ${payment.currency}"
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#D3D5D0"))
            gravity = Gravity.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        headerRow.addView(tvProvider)
        headerRow.addView(tvAmountHeader)
        sheet.addView(headerRow)

        // ── Payer line ──
        val tvPayer = TextView(ctx).apply {
            val phoneStr = if (!payment.payerPhoneOrAcc.isNullOrEmpty()) " (${payment.payerPhoneOrAcc})" else ""
            text = "From: ${payment.payerName}$phoneStr"
            textSize = 13f
            setTextColor(Color.parseColor("#848580"))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = (4 * dp).toInt()
            layoutParams = lp
        }
        sheet.addView(tvPayer)

        // ── Timestamp ──
        val sdf = SimpleDateFormat("MMM d, yyyy • hh:mm a", Locale.getDefault())
        val tvTime = TextView(ctx).apply {
            text = sdf.format(Date(payment.timestamp))
            textSize = 11f
            setTextColor(Color.parseColor("#555550"))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = (16 * dp).toInt()
            layoutParams = lp
        }
        sheet.addView(tvTime)

        // ── Section: Parsed JSON ──
        sheet.addView(sectionLabel(ctx, "PARSED PAYMENT DATA", dp))
        val parsedJson = buildParsedJson()
        val tvJson = TextView(ctx).apply {
            text = parsedJson
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setTextColor(Color.parseColor("#B48148"))
            setBackgroundColor(Color.parseColor("#1A1A1A"))
            setPadding((12 * dp).toInt(), (10 * dp).toInt(), (12 * dp).toInt(), (10 * dp).toInt())
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = (16 * dp).toInt()
            layoutParams = lp
        }
        sheet.addView(tvJson)

        // ── Section: Raw SMS ──
        sheet.addView(sectionLabel(ctx, "RAW SMS MESSAGE", dp))
        val scrollRaw = ScrollView(ctx).apply {
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (100 * dp).toInt()
            )
            lp.bottomMargin = (16 * dp).toInt()
            layoutParams = lp
        }
        val tvRaw = TextView(ctx).apply {
            text = payment.rawMessage
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setTextColor(Color.parseColor("#848580"))
            setBackgroundColor(Color.parseColor("#1A1A1A"))
            setPadding((12 * dp).toInt(), (10 * dp).toInt(), (12 * dp).toInt(), (10 * dp).toInt())
        }
        scrollRaw.addView(tvRaw)
        sheet.addView(scrollRaw)

        // ── Webhook status ──
        val statusColor = if (payment.isRelayed) "#5A6237" else "#848580"
        val statusText = if (payment.isRelayed) "● Relayed to Chek Server ✓" else "● Saved on Device (not yet relayed)"
        val tvWebhook = TextView(ctx).apply {
            text = statusText
            textSize = 11f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor(statusColor))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = (16 * dp).toInt()
            layoutParams = lp
        }
        sheet.addView(tvWebhook)

        // ── Action Buttons ──
        val btnRow = LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            layoutParams = lp
        }

        // Copy Ref ID button
        val btnCopy = Button(ctx).apply {
            text = "📋 Copy Ref ID"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#D3D5D0"))
            setBackgroundColor(Color.parseColor("#5A6237"))
            val lp = LinearLayout.LayoutParams(0, (48 * dp).toInt(), 1f)
            lp.marginEnd = (8 * dp).toInt()
            layoutParams = lp
            setOnClickListener {
                val clipboard = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                clipboard.setPrimaryClip(ClipData.newPlainText("Ref ID", payment.referenceId))
                Toast.makeText(ctx, "Copied: ${payment.referenceId}", Toast.LENGTH_SHORT).show()
                text = "✓ Copied!"
                postDelayed({ text = "📋 Copy Ref ID" }, 2000)
            }
        }

        // Share button
        val btnShare = Button(ctx).apply {
            text = "↗ Share"
            textSize = 13f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#B48148"))
            setBackgroundColor(Color.parseColor("#323232"))
            val lp = LinearLayout.LayoutParams(0, (48 * dp).toInt(), 1f)
            layoutParams = lp
            setOnClickListener {
                val shareText = buildShareText()
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, shareText)
                }
                ctx.startActivity(Intent.createChooser(intent, "Share Payment Receipt"))
            }
        }

        btnRow.addView(btnCopy)
        btnRow.addView(btnShare)
        sheet.addView(btnRow)

        root.addView(sheet)
        setContentView(root)
    }

    private fun sectionLabel(ctx: Context, text: String, dp: Float): TextView {
        return TextView(ctx).apply {
            this.text = text
            textSize = 9f
            typeface = Typeface.DEFAULT_BOLD
            setTextColor(Color.parseColor("#B48148"))
            letterSpacing = 0.12f
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            lp.bottomMargin = (6 * dp).toInt()
            layoutParams = lp
        }
    }

    private fun buildParsedJson(): String {
        return """{
  "provider": "${payment.provider}",
  "amount": ${payment.amount},
  "currency": "${payment.currency}",
  "payerName": "${payment.payerName}",
  "payerAccount": "${payment.payerPhoneOrAcc ?: "null"}",
  "referenceId": "${payment.referenceId}",
  "isRelayed": ${payment.isRelayed},
  "timestamp": ${payment.timestamp}
}"""
    }

    private fun buildShareText(): String {
        val sdf = SimpleDateFormat("MMM d, yyyy hh:mm a", Locale.getDefault())
        return """Chek Payment Receipt
──────────────────
Provider: ${payment.provider}
Amount: ${String.format("%.2f", payment.amount)} ${payment.currency}
From: ${payment.payerName}${if (!payment.payerPhoneOrAcc.isNullOrEmpty()) " (${payment.payerPhoneOrAcc})" else ""}
Ref: ${payment.referenceId}
Time: ${sdf.format(Date(payment.timestamp))}
──────────────────
Verified by Chek · chek.et"""
    }
}
