# 📋 Chek — Comprehensive Action Plan & Tomorrow's Roadmap

## 🎯 Executive Summary & Reference Goals
We are building **Chek** to be the definitive, zero-fee, personal account payment verification companion for developers and bot builders in Ethiopia. 

Our benchmark for the mobile companion app is the **Odit Android App** (`com.robi.odit` on Google Play: `https://play.google.com/store/apps/details?id=com.robi.odit`).

---

## 🔍 Root Cause Analysis of Tonight's Real-Device Findings

### 1. The SMS Inbox Sync Issue ("Synced 0" / Only 2 Messages Captured)
* **What Happened on Real Phone**:
  * The web received two real CBE messages (`ETB 5,000.00` and `ETB 300.00`), but other past messages were missed, and the phone toast showed `Synced 0`.
* **Root Causes**:
  1. **CBE Receipt URL Reference Extraction**:
     Real CBE SMS formats put the reference inside a link:
     `Dear Mr Eyuel your Account 1********7638 has been credited with ETB 300.00... for Reciept https://apps.cbe.com.et:100/BranchReceipt/FT26214MQPWP&75487638`
     The parser was looking for `Ref: FT...` or `Txn: FT...` rather than extracting `FT26214MQPWP` directly from the URL or text!
  2. **SMS Inbox Query Filter & Limits**:
     `content://sms/inbox` had `LIMIT 100` and filtered by sender address. Since Ethiopian telecom SMS headers vary (`CBE`, `cbe`, `889`, `127`, `telebirr`, `UNKNOWN`), querying by body content keywords (`credited with`, `received ETB`, `BranchReceipt`, `ደርሶዎታል`) guarantees 100% catch rate across all messages.

---

### 2. The Web Dashboard Real-Time Pairing Refresh
* **What Happened**:
  * Mobile paired successfully (`● Connected`), but the web dashboard required a manual browser refresh to reflect the newly paired device.
* **Solution**:
  * Add automatic **polling / real-time heartbeat sync** on the `/dashboard/devices` and `/dashboard` pages (every 2.5 seconds while waiting for pairing), so the instant you tap **"Connect"** on the phone, the web dashboard automatically animates to **`● Online & Connected`** with zero refresh needed.

---

### 3. Mobile App UI / UX Overhaul (Odit.et Reference Standard)
* **What Needs Full Rebuilding**:
  * **Visual Polish**: Match Odit's native Kotlin UI with EyuTheme design tokens.
  * **Typography**: Clean `Outfit` headings and `Lexend` body.
  * **Live Stream Layout**: Clean Material card layout with smooth elevation, distinct provider chips (`TB` Ochre `#B48148`, `CBE` Olive `#5A6237`, `BOA` Terracotta `#7E5026`), amount display, and copy-able reference badge.
  * **Bottom Dock Navigation**: Pixel-perfect Phosphor icons with active state indicators.

---

## 🛠️ Action Items & Tomorrow's Execution Plan

### 📌 Module A: Universal Ethiopian Bank Regex & SMS Sync Engine

```kotlin
// 1. Universal CBE Parser including URL Receipts
val cbeUrlPattern = Pattern.compile(
    "(?:your Account|account)\\s*([\\d*]+).*?(?:credited with|credited)\\s*ETB\\s*([\\d,.]+).*?(?:BranchReceipt/|Ref[:\\s]*|Txn[:\\s]*)([A-Z0-9]+)",
    Pattern.CASE_INSENSITIVE
)

// 2. Universal Telebirr (127) English & Amharic
val telebirrPattern = Pattern.compile(
    "(?:received ETB|payment of ETB|ከ).*?([\\d,.]+)\\s*(?:from|ETB|ብር).*?(?:transaction number|Trans ID|Txn|የግብይት ቁጥር)[:\\s]*([A-Z0-9]+)",
    Pattern.CASE_INSENSITIVE
)

// 3. Full Inbox Scan (No 100 limit, scans all banking texts)
val cursor = context.contentResolver.query(
    Uri.parse("content://sms/inbox"),
    arrayOf("address", "body", "date"),
    "body LIKE '%credited%' OR body LIKE '%received%' OR body LIKE '%BranchReceipt%' OR body LIKE '%telebirr%' OR body LIKE '%ደርሶዎታል%'",
    null,
    "date DESC"
)
```

---

### 📌 Module B: Mobile UI Rebuild (Odit-Grade)

1. **Header Card**:
   - Device status chip (`● Connected to Solo Dev`)
   - Battery indicator
   - Quick settings trigger
2. **Stats Grid**:
   - Total Verified Volume (ETB)
   - Total Relayed Payments Count
   - Active Relay Latency (ms)
3. **Interactive Actions**:
   - **`🔄 Deep Scan SMS Inbox`** (with live progress indicator: `Scanning 42 / 180 SMS...`)
4. **Transaction Stream**:
   - Native `RecyclerView` with `PaymentCardAdapter`
   - Filter chips: `All`, `Telebirr`, `CBE`, `BOA`, `Awash`
   - Tap on card to view raw SMS and full JSON payload modal.

---

### 📌 Module C: Web Real-Time Pairing Synchronization

1. **Auto-Polling on Pairing Modal**:
   - When 6-digit PIN modal is open on `/dashboard/devices`, poll `/api/auth/me` every 2s.
   - When device appears in database, auto-close modal, play success animation, and display newly paired phone.
2. **Live Transaction WebSocket / SSE Bridge**:
   - Instant transaction sound/toast when Android companion relays a new credit.

---

## 📊 Summary Checklist for Tomorrow

- [ ] **Bank Regex Update**: Add CBE `BranchReceipt/FT...` URL regex and Amharic patterns to `BankParser.kt` and `src/lib/parsers/`.
- [ ] **SMS Scanner**: Remove `LIMIT 100` and use body keyword queries in `ApiClient.kt`.
- [ ] **Mobile UI Rebuild**: Implement Odit-grade layout with `RecyclerView`, filter chips, and Phosphor icons.
- [ ] **Web Real-Time Sync**: Add 2-second auto-poll to `/dashboard/devices` and `/dashboard`.
- [ ] **End-to-End Real-Device Test**: Full test with real Telebirr and CBE transactions.
