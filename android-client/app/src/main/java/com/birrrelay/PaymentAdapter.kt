package com.birrrelay

import android.graphics.Color
import android.graphics.Typeface
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class PaymentAdapter(
    private val onCardClick: (StoredPayment) -> Unit
) : ListAdapter<StoredPayment, PaymentAdapter.ViewHolder>(DIFF_CALLBACK) {

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<StoredPayment>() {
            override fun areItemsTheSame(old: StoredPayment, new: StoredPayment) =
                old.referenceId == new.referenceId

            override fun areContentsTheSame(old: StoredPayment, new: StoredPayment) =
                old == new
        }

        // EyuTheme provider colors
        fun providerColor(provider: String): Int = when (provider.uppercase()) {
            "TELEBIRR"  -> Color.parseColor("#B48148")  // Golden Ochre
            "CBE"       -> Color.parseColor("#5A6237")  // Olive Moss
            "BOA"       -> Color.parseColor("#7E5026")  // Terracotta
            "AWASH"     -> Color.parseColor("#4EA082")  // Sage
            "CBE_BIRR"  -> Color.parseColor("#6C7642")  // Olive Strong
            else        -> Color.parseColor("#5A6237")
        }
    }

    inner class ViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        val tvProviderBadge: TextView = itemView.findViewById(R.id.tvProviderBadge)
        val tvAmount: TextView = itemView.findViewById(R.id.tvAmount)
        val tvPayer: TextView = itemView.findViewById(R.id.tvPayer)
        val tvRef: TextView = itemView.findViewById(R.id.tvRef)
        val tvStatus: TextView = itemView.findViewById(R.id.tvStatus)
        val tvTimestamp: TextView = itemView.findViewById(R.id.tvTimestamp)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.payment_card_item, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val payment = getItem(position)

        // Provider badge
        val color = providerColor(payment.provider)
        holder.tvProviderBadge.text = "● ${payment.provider.replace("_", " ")}"
        holder.tvProviderBadge.setTextColor(color)

        // Amount
        holder.tvAmount.text = "+${String.format("%.2f", payment.amount)} ${payment.currency}"

        // Payer
        val phoneStr = if (!payment.payerPhoneOrAcc.isNullOrEmpty()) " (${payment.payerPhoneOrAcc})" else ""
        holder.tvPayer.text = "From: ${payment.payerName}$phoneStr"

        // Reference ID
        holder.tvRef.text = payment.referenceId
        holder.tvRef.typeface = Typeface.MONOSPACE

        // Sync status
        if (payment.isRelayed) {
            holder.tvStatus.text = "● Synced ✓"
            holder.tvStatus.setTextColor(Color.parseColor("#5A6237"))
        } else {
            holder.tvStatus.text = "● On Device"
            holder.tvStatus.setTextColor(Color.parseColor("#848580"))
        }

        // Timestamp (relative)
        holder.tvTimestamp.text = formatTimestamp(payment.timestamp)

        // Click → inspector bottom sheet
        holder.itemView.setOnClickListener { onCardClick(payment) }
    }

    private fun formatTimestamp(ts: Long): String {
        val now = System.currentTimeMillis()
        val diffMs = now - ts
        val diffH = diffMs / (1000 * 60 * 60)
        val sdf = SimpleDateFormat("hh:mm a", Locale.getDefault())
        val timeStr = sdf.format(Date(ts))

        return when {
            diffMs < 60 * 1000 -> "Just now"
            diffMs < 60 * 60 * 1000 -> "${diffMs / 60000}m ago • $timeStr"
            diffH < 24 -> "Today • $timeStr"
            diffH < 48 -> "Yesterday • $timeStr"
            else -> {
                val dateSdf = SimpleDateFormat("MMM d", Locale.getDefault())
                "${dateSdf.format(Date(ts))} • $timeStr"
            }
        }
    }
}
