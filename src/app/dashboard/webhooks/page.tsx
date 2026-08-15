"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  WebhooksLogo,
  FloppyDisk,
  CheckCircle,
  Copy,
  Check,
  ShieldCheck,
  ArrowsClockwise,
  Clock,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react";

interface WebhookLog {
  id: string;
  endpoint: string;
  event: string;
  payload: string;
  responseCode: number | null;
  responseBody: string | null;
  success: boolean;
  createdAt: string;
}

export default function WebhooksPage() {
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [logs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const storedKey = localStorage.getItem("birrrelay_api_key") || "";
      const headers: Record<string, string> = {};
      if (storedKey) headers["x-api-key"] = storedKey;

      const res = await fetch("/api/auth/me", { headers });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.user?.apiKey || "");
        setWebhookUrl(data.user?.webhookUrl || "");
        setWebhookSecret(data.user?.webhookSecret || "");
        setWebhookLogs(data.webhookLogs || []);
      }
    } catch (err) {
      console.error("Failed to load webhook config:", err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;

    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/v1/webhooks/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ webhookUrl }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save webhook URL:", err);
    } finally {
      setSaving(false);
    }
  }

  function copySecret() {
    navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="pb-6 border-b border-[var(--line)]">
          <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
            Webhook Delivery & Endpoints
            <WebhooksLogo size={22} weight="duotone" className="text-[var(--accent)]" />
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Configure your destination URL where Chek forwards verified bank events in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] shadow-sm">
              <h2 className="font-heading text-sm font-bold text-[var(--ink)] mb-4">Webhook Endpoint</h2>

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div>
                  <label className="block font-mono font-semibold uppercase text-[var(--text-muted)] mb-1.5 text-[11px]">
                    Target URL (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://my-app.com/api/payment-webhook"
                    className="w-full bg-[var(--surface-pressed)] border border-[var(--line)] rounded-eyu px-3.5 py-2 text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                  <p className="text-[10px] text-[var(--text-faint)] mt-1 font-mono">
                    Chek will send an HMAC-signed POST request.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 rounded-eyu font-bold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 border border-[var(--accent)]/60 transition-all flex items-center justify-center gap-2 text-xs shadow-sm disabled:opacity-50"
                >
                  <FloppyDisk size={16} weight="duotone" />
                  {saving ? "Saving..." : "Save Webhook URL"}
                </button>

                {savedSuccess && (
                  <div className="p-2.5 rounded-eyu bg-[var(--accent-soft)] border border-[var(--accent)]/50 text-[var(--accent-strong)] dark:text-[var(--ink)] text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                    <CheckCircle size={14} weight="duotone" className="text-[var(--accent)]" /> Webhook URL saved successfully!
                  </div>
                )}
              </form>
            </div>

            {/* Signing Secret Box */}
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] shadow-sm">
              <h2 className="font-heading text-sm font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
                <ShieldCheck size={16} weight="duotone" className="text-[var(--complement)]" /> Signing Secret
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Used to verify that webhook payloads originated from Chek.
              </p>

              <div className="flex items-center gap-2 bg-[var(--surface-pressed)] p-2.5 rounded-eyu border border-[var(--line)] font-mono text-xs text-[var(--ink)]">
                <span className="truncate flex-1">
                  {showSecret ? webhookSecret : "••••••••••••••••••••••••••••••••"}
                </span>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[var(--text-muted)] hover:text-[var(--ink)] p-1"
                >
                  {showSecret ? <EyeSlash size={14} weight="duotone" /> : <Eye size={14} weight="duotone" />}
                </button>
                <button onClick={copySecret} className="text-[var(--text-muted)] hover:text-[var(--ink)] p-1">
                  {copiedSecret ? <Check size={14} weight="bold" className="text-[var(--accent)]" /> : <Copy size={14} weight="duotone" />}
                </button>
              </div>
            </div>
          </div>

          {/* Delivery Logs Column */}
          <div className="lg:col-span-2">
            <div className="p-6 sm:p-7 rounded-eyu bg-[var(--surface)] border border-[var(--line)] shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-sm font-bold text-[var(--ink)]">Recent Webhook Deliveries</h2>
                <button
                  onClick={fetchConfig}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--ink)] flex items-center gap-1 font-mono"
                >
                  <ArrowsClockwise size={13} weight="duotone" /> Refresh
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-10 rounded-eyu border border-dashed border-[var(--line)] text-center text-[var(--text-faint)] text-xs font-mono">
                  No webhook delivery attempts yet. When a payment is processed, its dispatch log will appear here.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-eyu bg-[var(--surface-pressed)] border border-[var(--line)] text-xs font-mono"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-eyu font-bold text-[11px] ${
                              log.success
                                ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/40"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {log.responseCode || "ERR"}
                          </span>
                          <span className="text-[var(--ink)] truncate max-w-xs">{log.endpoint}</span>
                        </div>
                        <span className="text-[var(--text-faint)] flex items-center gap-1">
                          <Clock size={12} weight="duotone" />
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      {log.responseBody && (
                        <div className="mt-2 text-[11px] text-[var(--text-muted)] bg-[var(--surface)] p-2 rounded-eyu border border-[var(--line)] truncate">
                          Response: {log.responseBody}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
