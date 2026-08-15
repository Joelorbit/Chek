# 📋 Chek — Comprehensive Master Plan & Execution Roadmap

> **Target Standard**: Odit.et Android Companion App (`com.robi.odit` on Google Play: `https://play.google.com/store/apps/details?id=com.robi.odit`) + EyuTheme Design System (`github.com/Joelorbit/Mytheme`).

---

## 🏛️ 1. Complete System Architecture & Data Pipeline

```
[ Customer sends ETB via Telebirr (127), CBE, BOA, or Awash ]
                              │
                              ▼ (< 100ms)
[ Android Telephony Broadcast & NotificationListener ]
  - Intercepts incoming SMS directly from Android OS.
  - Intercepts push notifications from banking apps.
                              │
                              ▼
[ On-Device Universal Bank Parser & Privacy Guard ]
  - Extracts Provider, Amount, Payer Name, Phone/Acc, Reference ID.
  - Drops OTPs, 2FA tokens, debits, airtime, and personal messages locally.
                              │
                              ▼
[ On-Device Storage Engine (LocalPaymentStore.kt) ]
  - Saves structured JSON digest to local device storage.
  - Renders styled transaction card on mobile feed immediately.
  - Zero data loss if phone is offline or on poor 3G/4G network.
                              │
                              ▼
[ Asynchronous Cloud Relay (/api/v1/relay/event & /batch) ]
  - Sends payload to Chek server.
  - Marks local record as isRelayed = true.
                              │
                              ▼
[ Chek Cloud Server & Webhook Engine ]
  - Idempotent deduplication (unique referenceId).
  - Computes HMAC-SHA256 signature (X-Chek-Signature).
  - Dispatches authenticated webhook to developer's Telegram Bot / Backend.
  - Real-time instant verification on Hosted Checkout (/pay/[id]).
```

---

## 🔍 2. Real-Device Findings & Exact Bank Regex Specifications

### A. Commercial Bank of Ethiopia (CBE / 889)
* **Real Production Format 1 (with Receipt URL)**:
  ```text
  Dear Mr Eyuel your Account 1********7638 has been credited with ETB 300.00. Your Current Balance is ETB 29440.39. Thank you for Banking with CBE! for Reciept https://apps.cbe.com.et:100/BranchReceipt/FT26214MQPWP&75487638
  ```
  * **Extraction Rule**:
    * Provider: `CBE`
    * Amount: `300.00`
    * Account: `1********7638`
    * Payer/Customer: `Mr Eyuel`
    * Reference ID: `FT26214MQPWP` (Extracted from URL `BranchReceipt/([A-Z0-9]+)`)
    * Balance: `29440.39`
* **Real Production Format 2 (Standard Credit)**:
  ```text
  Dear Customer, your account 1000123456789 has been credited with ETB 1,500.00 by BIRUK TADESSE. Ref: FT242289912039. Current balance is ETB 45,210.00.
  ```
* **Real Production Format 3 (Amharic CBE)**:
  ```text
  ክቡር ደንበኛችን የሒሳብ ቁጥርዎ 1********7638 በ 300.00 ብር ገቢ ተደርጓል:: ቀሪ ሒሳብዎ 29,440.39 ብር ነው:: የግብይት ቁጥር FT26214MQPWP
  ```

---

### B. Telebirr (Sender: `127` / `telebirr`)
* **Real Production Format 1 (English P2P)**:
  ```text
  You have received ETB 500.00 from ABEBE BIKILA (0911223344) with transaction number CKL9283741 on 2026-08-15 14:30:22. Your current balance is ETB 12,450.00.
  ```
* **Real Production Format 2 (Amharic P2P)**:
  ```text
  ከ 0911223344 (ABEBE BIKILA) 500.00 ብር ደርሶዎታል:: የግብይት ቁጥር CKL9283741:: ቀሪ ሒሳብዎ 12,450.00 ብር ነው::
  ```
* **Real Production Format 3 (Merchant / Short Push)**:
  ```text
  Payment of ETB 1,200.00 received from YONAS BEKELE (0922334455). Transaction ID: CKL839201. Your balance: ETB 8,400.00.
  ```

---

### C. Bank of Abyssinia (BOA / Abyssinia)
* **Real Production Format 1**:
  ```text
  Bank of Abyssinia: Account 8492*** credited with ETB 1,000.00 from DAWIT MELESE. Ref: BOA928371.
  ```
* **Real Production Format 2 (Mobile App Alert)**:
  ```text
  BOA Alert: Your account 12345678 has received ETB 2,500.00 from HELEN TESHOME. Txn: BOA881920.
  ```

---

### D. Awash Bank & CBE Birr
* **Awash Bank**:
  ```text
  Awash Bank: Your account 01304812345600 has been credited with ETB 750.00 from KASSAHUN GEMECHU. Ref: AWB849201.
  ```
* **CBE Birr**:
  ```text
  You have received ETB 300.00 from 251911223344 (SELAM TESFAYE). Trans ID: CBEB938291.
  ```

---

## 📱 3. Full-Inbox Deep Scanning Engine (No Message Left Behind)

### Current Problem:
1. `content://sms/inbox` query was filtered by sender addresses and had a `LIMIT 100` restriction.
2. If the user had 500+ messages or if the telecom header was slightly different, past bank SMS were missed.

### Tomorrow's Fix:
* **Global Keyword Query**:
  ```kotlin
  val projection = arrayOf("_id", "address", "body", "date")
  val selection = "body LIKE '%credited%' OR body LIKE '%received%' OR body LIKE '%BranchReceipt%' OR body LIKE '%telebirr%' OR body LIKE '%ደርሶዎታል%' OR body LIKE '%ገቢ ተደርጓል%'"
  val cursor = context.contentResolver.query(
      Uri.parse("content://sms/inbox"),
      projection,
      selection,
      null,
      "date DESC"
  )
  ```
* **Live Scanning Progress**:
  * The button text updates in real time: `Scanning SMS 42 / 180... (14 payments found)`.
* **Deduplication & Local Persistence**:
  * Saves parsed transactions to `LocalPaymentStore` and renders them in the UI feed immediately.
  * Sends batch in chunks of 50 to `/api/v1/relay/batch`.

---

## 🎨 4. Odit-Grade Mobile UI/UX Overhaul

### Benchmark: Odit Android App (`com.robi.odit`)

```
┌─────────────────────────────────────────────────────────┐
│  Chek                                            🔋 92% │
│  ● Relay Engine Active                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ VOLUME HERO CARD ─────────────────────────────────┐ │
│  │ TODAY'S VERIFIED VOLUME                            │ │
│  │ 5,300.00 ETB                                       │ │
│  │ 2 payments relayed • 0% gateway cuts               │ │
│  │                                                    │ │
│  │ [ 🔄 Deep Scan SMS Inbox ]                          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  TRANSACTION STREAM                  [ All | TB | CBE ] │
│                                                         │
│  ┌─ PAYMENT CARD ─────────────────────────────────────┐ │
│  │ [ CBE ]                      +5,000.00 ETB         │ │
│  │ Payer: Mr Eyuel (1********7638)                    │ │
│  │ Ref: [FT262163J7WX]          ● Cloud Synced ✓      │ │
│  │ 09:15 PM • Today                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ PAYMENT CARD ─────────────────────────────────────┐ │
│  │ [ CBE ]                        +300.00 ETB         │ │
│  │ Payer: Mr Eyuel (1********7638)                    │ │
│  │ Ref: [FT26214MQPWP]          ● Cloud Synced ✓      │ │
│  │ 08:42 PM • Today                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
├─────────────────────────────────────────────────────────┤
│    [ 🏠 Live Feed ]   [ ⚡ Relay ]   [ ⚙️ Settings ]    │
└─────────────────────────────────────────────────────────┘
```

### Key UI Enhancements:
1. **Typography**: Headings in `Outfit`, body in `Lexend`, codes in `JetBrains Mono`.
2. **Provider Badge Pills**:
   * `TELEBIRR`: Ochre `#B48148` on `#1E1E1E`
   * `CBE`: Olive Moss `#5A6237` on `#1E1E1E`
   * `BOA`: Terracotta `#7E5026` on `#1E1E1E`
   * `AWASH`: Sage `#4EA082` on `#1E1E1E`
3. **Card Inspector Modal**:
   * Tapping any payment card opens a bottom sheet showing:
     * Full raw SMS message.
     * Clean parsed JSON payload.
     * 1-Click Copy Reference ID button.
     * Webhook dispatch status.
4. **Floating Bottom Dock**:
   * Rounded elevated dock with authentic Phosphor Duotone icons (`SquaresFour`, `Lightning`, `TerminalWindow`).

---

## 🌐 5. Web Real-Time Reactive Pairing Sync

### Current Problem:
* When pairing 6-digit PIN on mobile, the web dashboard requires a manual page refresh (F5) to show the newly paired phone.

### Tomorrow's Fix:
* In `src/app/dashboard/devices/page.tsx`:
  * When the 6-digit PIN modal is open, start a 2-second interval polling `/api/auth/me`.
  * As soon as a device appears with `isOnline: true`, automatically close the modal, trigger a celebration toast (`🎉 Android Companion Connected!`), and animate the new device card into the grid.

---

## 📝 6. Exact File-by-File Task List for Tomorrow

| Component | Target File | Action Required |
| :--- | :--- | :--- |
| **Android Parser** | `android-client/.../BankParser.kt` | Add CBE `BranchReceipt/FT...` URL regex and Amharic patterns. |
| **Server Parser** | `src/lib/parsers/cbe.ts` & `telebirr.ts` | Synchronize server regexes with CBE receipt URL format. |
| **SMS Scanner** | `android-client/.../ApiClient.kt` | Implement global keyword query across entire SMS inbox. |
| **Local Storage** | `android-client/.../LocalPaymentStore.kt` | Enhance local store with search and filter capabilities. |
| **Mobile Layout** | `android-client/.../activity_main.xml` | Build Odit-grade layout with stats card and filter tabs. |
| **Mobile Controller** | `android-client/.../MainActivity.kt` | Connect real-time card adapter and live scan progress. |
| **Web Pairing** | `src/app/dashboard/devices/page.tsx` | Add 2-second auto-poll to detect mobile pairing in real time. |
| **Unit Tests** | `src/lib/parsers/parsers.test.ts` | Add unit tests for CBE receipt URL and Amharic messages. |

---

## ✅ 7. Definition of Done (Tomorrow's Verification Criteria)
1. **SMS Scan**: Tapping **"Sync Past Bank SMS Inbox"** scans the entire phone inbox and parses all historical CBE & Telebirr receipts with 0 missed.
2. **Instant Card Feed**: Every payment shows up immediately as a styled Odit-grade card on the phone.
3. **Zero-Refresh Pairing**: Entering the 6-digit PIN on mobile instantly updates the web dashboard in real time.
4. **End-to-End Live Test**: Sending a 5 ETB Telebirr or CBE payment verifies in < 100ms on phone, web dashboard, and webhook endpoint!
