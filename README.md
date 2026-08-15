# 🧾 Chek — Device-Based Ethiopian Payment Verification & Webhook Relay

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-EyuTheme-38B2AC?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Android](https://img.shields.io/badge/Android-Kotlin-3DDC84?style=flat-square&logo=android)](https://kotlinlang.org/)
[![Tests](https://img.shields.io/badge/Vitest-16%20Passed-green?style=flat-square&logo=vitest)](https://vitest.dev/)

**Chek** is an open-source, device-based payment verification engine and webhook bridge designed for solo developers and Telegram bot creators in Ethiopia.

It intercepts incoming bank notifications and SMS from personal **CBE**, **Telebirr**, **Awash Bank**, **CBE Birr**, and **Bank of Abyssinia** accounts, parses them on-device, and relays verified HMAC-signed webhooks to your web applications and bots in under 2 seconds.

---

## ✨ Key Features

* **0% Transaction Fees**: Zero cut taken on any transaction.
* **No Business License Required**: Operates using standard personal banking SMS/push alerts.
* **6-Digit Device Pairing**: Effortless Odit.et-style pairing between the Android companion app and web console.
* **🔒 On-Device Privacy Guard**: OTPs, 2FA codes, debit deduction alerts, and personal SMS are discarded locally on the phone.
* **Cryptographic Security**: Every webhook is signed with `HMAC-SHA256` (`X-Chek-Signature`).
* **Verify.et REST API**: Instant transaction reference lookup endpoint (`GET /api/v1/verify?ref=FT242289912039`).
* **EyuTheme Design System**: Tailored dual dark/white palette with Outfit display, Lexend typography, and Phosphor Duotone icons.
* **Interactive Sandbox & Mobile Tester**: Test end-to-end payment flows and 6-digit PIN pairing in your browser without spending 1 Birr.

---

## 🏗️ Architecture

```
[ Customer in Ethiopia ]
          │ (Sends payment via CBE, Telebirr, Awash)
          ▼
[ Android Device Companion App (`android-client/`) ]
          │
          │ 🔒 On-Device Privacy Filter (`BankParser.kt`)
          ▼
[ Chek Relay Engine (`src/app/api/`) ]
          │
          │ 1. Replay attack validation (`referenceId` uniqueness)
          │ 2. Signs with HMAC-SHA256 (`X-Chek-Signature`)
          │ 3. Dispatches webhooks with exponential backoff
          ▼
[ Developer Endpoints / Telegram Bots / Webapps ]
```

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Joelorbit/Chek.git
cd Chek
npm install
```

### 2. Setup Database
```bash
npx prisma db push
```

### 3. Run Dev Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** to launch the Chek Developer Console!

---

## 🧪 Testing

### Automated Unit Tests (16/16 Passing)
```bash
npx vitest run
```

### Verify.et Style REST Lookup
```bash
curl -X GET "http://localhost:3000/api/v1/verify?ref=FT242289912039" \
  -H "x-api-key: br_live_YOUR_KEY"
```

---

## 📱 Android Companion App (`android-client/`)

* Native Android Kotlin companion app (`android-client/`).
* ProGuard & R8 enabled to generate an ultra-small `< 2 MB` APK.
* Automatic cloud builds configured in `.github/workflows/build-apk.yml`.

---

## 📜 License
MIT License. Built with ❤️ for Ethiopian developers.
