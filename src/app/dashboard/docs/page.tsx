"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { BookBookmark, Copy, Check, TerminalWindow, ShieldCheck, Lightning } from "@phosphor-icons/react";

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"node" | "python" | "telegram" | "rest">("node");
  const [copied, setCopied] = useState(false);

  const snippets = {
    node: `// Node.js Express Webhook Handler
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());

const WEBHOOK_SECRET = process.env.BIRRRELAY_WEBHOOK_SECRET;

app.post("/webhook/birrrelay", (req, res) => {
  const signature = req.headers["x-birrrelay-signature"];
  const payload = JSON.stringify(req.body);

  // 1. Verify HMAC-SHA256 Signature
  const expectedSig = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  if (signature !== expectedSig) {
    return res.status(401).send("Invalid signature");
  }

  // 2. Extract verified payment data
  const { provider, amount, payer_name, reference_id } = req.body.data;
  console.log(\`Received \${amount} ETB via \${provider} from \${payer_name} (Ref: \${reference_id})\`);

  // 3. Fulfill order / grant user access
  fulfillOrder(reference_id, amount);

  res.status(200).send("OK");
});

app.listen(3000, () => console.log("Server running on port 3000"));`,

    python: `# Python FastAPI Webhook Handler
from fastapi import FastAPI, Header, HTTPException, Request
import hmac
import hashlib
import json

app = FastAPI()
WEBHOOK_SECRET = "whsec_your_secret_here"

@app.post("/webhook/birrrelay")
async def handle_payment(request: Request, x_birrrelay_signature: str = Header(None)):
    raw_body = await request.body()
    
    # 1. Verify HMAC-SHA256 Signature
    expected_sig = hmac.new(
        WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256
    ).hexdigest()

    if x_birrrelay_signature != expected_sig:
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = json.loads(raw_body)
    data = payload.get("data", {})
    
    # 2. Process verified payment
    provider = data.get("provider")      # "TELEBIRR" or "CBE"
    amount = data.get("amount")          # 350.00
    ref_id = data.get("reference_id")    # "CKL928301"
    payer = data.get("payer_name")       # "Abebe Bikila"
    
    print(f"Verified {amount} ETB payment from {payer} (Ref: {ref_id})")
    
    # 3. Mark user as paid
    return {"status": "success"}`,

    telegram: `// Monetized Telegram Bot with BirrRelay
import { Telegraf } from "telegraf";
import express from "express";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const app = express();
app.use(express.json());

// 1. Bot prompts user to pay
bot.command("buy", (ctx) => {
  ctx.reply(
    "⭐ Upgrade to Premium (250 ETB)\\n\\n" +
    "Send 250 ETB to:\\n" +
    "📱 Telebirr: 0911223344 (Your Name)\\n" +
    "🏦 CBE: 100012345678 (Your Name)\\n\\n" +
    "⚡ Your access will unlock automatically within 5 seconds!"
  );
});

// 2. BirrRelay notifies your bot automatically when money arrives
app.post("/webhook/birrrelay", async (req, res) => {
  const { amount, payer_name, reference_id } = req.body.data;
  
  // Find customer by name or reference and activate
  await bot.telegram.sendMessage(
    TARGET_CHAT_ID,
    \`🎉 Payment of \${amount} ETB received from \${payer_name}! Your Premium account is now active.\`
  );
  
  res.status(200).send("OK");
});

app.listen(4000);
bot.launch();`,

    rest: `# Verify.et Style REST Lookup
# Check if a customer's reference ID has been received on your account:

curl -X GET "https://your-domain.com/api/v1/verify?ref=FT242289912039" \\
  -H "x-api-key: br_live_your_api_key_here"

# Response (200 OK):
{
  "verified": true,
  "status": "VERIFIED",
  "transaction": {
    "provider": "CBE",
    "amount": 1500.0,
    "currency": "ETB",
    "payer_name": "BIRUK TADESSE",
    "reference_id": "FT242289912039",
    "created_at": "2026-08-15T18:20:00.000Z"
  }
}`,
  };

  function copySnippet() {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="pb-6 border-b border-[var(--line)]">
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
            Developer Documentation & SDKs
            <BookBookmark size={22} weight="duotone" className="text-[var(--complement)]" />
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Copy-paste integration code for your web apps, APIs, and Telegram bots.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-8 border-b border-[var(--line)] pb-3 overflow-x-auto">
          {[
            { id: "node", label: "Node.js / Express" },
            { id: "python", label: "Python (FastAPI / Flask)" },
            { id: "telegram", label: "Telegram Bot (Telegraf)" },
            { id: "rest", label: "REST Verification API" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-eyu text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]"
                  : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--ink)] border border-[var(--line)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Snippet Box */}
        <div className="mt-6 p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] relative shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--line)]">
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {activeTab === "node"
                ? "webhook.ts"
                : activeTab === "python"
                ? "main.py"
                : activeTab === "telegram"
                ? "bot.js"
                : "curl_verify.sh"}
            </span>
            <button
              onClick={copySnippet}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--ink)] flex items-center gap-1.5 bg-[var(--surface-elevated)] border border-[var(--line)] px-3 py-1.5 rounded-eyu transition-colors font-mono"
            >
              {copied ? <Check size={13} weight="bold" className="text-[var(--accent)]" /> : <Copy size={13} weight="duotone" />}
              {copied ? "Copied to clipboard" : "Copy Code"}
            </button>
          </div>

          <pre className="font-mono text-xs text-[var(--complement)] overflow-x-auto leading-relaxed p-2">
            <code>{snippets[activeTab]}</code>
          </pre>
        </div>
      </main>
    </div>
  );
}
