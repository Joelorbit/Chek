# Chek — Architecture & Agent Reference Guide

## 1. Project Overview
**Chek** is a device-based Ethiopian payment verification engine and webhook bridge designed for solo developers, bot creators, and indie hackers in Ethiopia. It automates personal account payments from **Commercial Bank of Ethiopia (CBE)**, **Telebirr**, **Awash Bank**, **CBE Birr**, and **Bank of Abyssinia (BOA)** with **0% transaction cuts** and **zero trade license required**.

---

## 2. System Architecture

```
[ Customer in Ethiopia ]
          │ (Sends payment via CBE, Telebirr, Awash)
          ▼
[ Android Device Companion App (`android-client/`) ]
          │
          │ 🔒 On-Device Privacy Guard (`BankParser.kt`)
          │ Drops OTPs, 2FA tokens, debits, and personal messages locally.
          ▼
[ Chek Cloud Server (`src/app/api/`) ]
          │
          │ 1. Replay attack validation (`referenceId` uniqueness)
          │ 2. Computes HMAC-SHA256 signature (`X-Chek-Signature`)
          │ 3. Dispatches webhooks with exponential backoff logging
          ▼
[ Developer Endpoints / Webhooks / Telegram Bots ]
```

---

## 3. Tech Stack & Design System
* **Framework**: Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS.
* **Database & ORM**: SQLite / PostgreSQL via Prisma (`prisma/schema.prisma`).
* **Design System**: **EyuTheme** (`github.com/Joelorbit/Mytheme`):
  * **Dark Mode**: Charcoal `#232323`, Matte surface `#2A2A2A`, Elevated `#323232`, Ink `#D3D5D0`.
  * **Light Mode**: Sage Cream `#F5F6F4`, Crisp surface `#FFFFFF`, Ink `#232323`.
  * **Accents**: Olive Moss `#5A6237`, Golden Ochre `#B48148`, Terracotta `#7E5026`.
  * **Typography**: Headings: `Outfit`, Body: `Lexend`, Monospace: `JetBrains Mono`.
  * **Iconography**: Phosphor Duotone (`@phosphor-icons/react` with `weight="duotone"`).
* **Android Companion App**:
  * Native Kotlin + Kotlin Coroutines (`android-client/`).
  * Ultra-small binary (< 2 MB) via ProGuard & R8 shrinking.
  * Adaptive branding launcher icons.

---

## 4. Key Endpoints & APIs

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/relay/event` | Ingests SMS/Notification text from Android client or cURL. |
| `POST` | `/api/v1/relay/ping` | 5-minute heartbeat reporting device status and battery %. |
| `GET` | `/api/v1/verify?ref=...` | Verify.et style REST transaction reference lookup. |
| `POST` | `/api/v1/device/generate-code` | Generates a 6-digit Odit.et-style pairing PIN. |
| `POST` | `/api/v1/device/pair` | Handshake exchanging 6-digit PIN for device token. |
| `POST` | `/api/v1/simulate` | Interactive sandbox payment simulator. |
| `POST` | `/api/v1/webhooks/config` | Configures target webhook URL and signing secrets. |

---

## 5. Testing & Verification Guidelines
* **Run Unit Tests**: `npx vitest run` (16 unit tests covering regex patterns, HMAC security, OTP privacy filters).
* **Run Production Build**: `npx next build` (validates all static/dynamic routes with TypeScript).
* **Local Dev Server**: `npm run dev` at `http://localhost:3000`.
