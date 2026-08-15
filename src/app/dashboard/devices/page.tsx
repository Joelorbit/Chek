"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  DeviceMobile,
  BatteryCharging,
  WifiHigh,
  WifiSlash,
  Plus,
  Clock,
  Copy,
  Check,
  Key,
  ArrowsClockwise,
} from "@phosphor-icons/react";

interface Device {
  id: string;
  deviceName: string;
  deviceToken: string;
  batteryLevel: number;
  isOnline: boolean;
  lastPingAt: string | null;
  createdAt: string;
}

export default function DevicesPage() {
  const [apiKey, setApiKey] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let key = localStorage.getItem("birrrelay_api_key");
    if (!key) {
      // Auto-register / load default demo key
      fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "dev@chek.et", password: "password123", name: "Solo Dev" }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user?.apiKey) {
            localStorage.setItem("birrrelay_api_key", data.user.apiKey);
            setApiKey(data.user.apiKey);
            fetchDevices(data.user.apiKey);
          }
        })
        .catch(() => {});
    } else {
      setApiKey(key);
      fetchDevices(key);
    }
  }, []);

  async function fetchDevices(key: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "x-api-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Failed to load devices:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateCode() {
    if (!apiKey) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/device/generate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ deviceName: "Android Companion" }),
      });
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode);
      }
    } catch (err) {
      console.error("Error generating code:", err);
    } finally {
      setGenerating(false);
    }
  }

  function copyPin() {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  }

  function copyKey() {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--line)]">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
              Connected Android Devices
              <DeviceMobile size={22} weight="duotone" className="text-[var(--accent)]" />
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Pair your Android companion phone via 6-digit PIN or direct API Key.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => apiKey && fetchDevices(apiKey)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--surface)] hover:bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--line)] transition-all shadow-sm"
              title="Refresh Devices"
            >
              <ArrowsClockwise size={15} weight="bold" />
              Refresh
            </button>
            <button
              onClick={generateCode}
              disabled={generating}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 border border-[var(--accent)]/60 transition-all disabled:opacity-50 shadow-sm"
            >
              <Plus size={16} weight="bold" />
              {generating ? "Generating PIN..." : "Pair New Device"}
            </button>
          </div>
        </div>

        {/* 6-Digit Pairing & API Key Box */}
        {pairingCode && (
          <div className="my-6 p-6 sm:p-8 rounded-eyu bg-[var(--surface)] border-2 border-[var(--accent)] shadow-md">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-10 h-10 rounded-eyu bg-[var(--accent-soft)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--ink)] mx-auto mb-3">
                <DeviceMobile size={20} weight="duotone" />
              </div>
              <h3 className="font-heading text-base font-bold text-[var(--ink)] mb-1">
                Enter Details in Chek Android App
              </h3>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Open the Chek app on your phone and enter either the 6-digit PIN or your API Key:
              </p>

              {/* Method 1: 6-Digit PIN */}
              <div className="p-4 rounded-eyu bg-[var(--surface-pressed)] border border-[var(--line)] mb-4">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                  Option 1: Quick 6-Digit PIN
                </span>
                <div className="inline-flex items-center justify-center gap-2 sm:gap-3 font-mono text-3xl font-extrabold text-[var(--complement)] tracking-widest px-4 py-2">
                  {pairingCode.split("").map((digit, i) => (
                    <span key={i} className="w-7 text-center">
                      {digit}
                    </span>
                  ))}
                </div>
                <div className="mt-2">
                  <button
                    onClick={copyPin}
                    className="px-3 py-1 rounded-eyu text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--line)] inline-flex items-center gap-1.5 transition-colors font-mono"
                  >
                    {copiedPin ? <Check size={13} weight="bold" className="text-[var(--accent)]" /> : <Copy size={13} weight="duotone" />}
                    {copiedPin ? "Copied PIN" : "Copy PIN"}
                  </button>
                </div>
              </div>

              {/* Method 2: Direct API Key */}
              <div className="p-4 rounded-eyu bg-[var(--surface-pressed)] border border-[var(--line)] mb-5">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                  Option 2: Direct API Key (Never Expires)
                </span>
                <div className="flex items-center justify-between gap-2 bg-[var(--surface)] p-2 rounded-eyu border border-[var(--line)]">
                  <span className="font-mono text-xs text-[var(--ink)] truncate">{apiKey}</span>
                  <button
                    onClick={copyKey}
                    className="px-2.5 py-1 rounded-eyu text-xs font-semibold bg-[var(--accent-soft)] hover:bg-[var(--accent)] text-[var(--accent-strong)] dark:text-[var(--ink)] hover:text-white border border-[var(--accent)]/40 shrink-0 inline-flex items-center gap-1 font-mono transition-colors"
                  >
                    {copiedKey ? <Check size={12} weight="bold" /> : <Copy size={12} weight="duotone" />}
                    {copiedKey ? "Copied" : "Copy Key"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPairingCode(null)}
                  className="px-4 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--ink)] border border-[var(--line)] transition-colors"
                >
                  Close Box
                </button>
              </div>

              <p className="text-[11px] text-[var(--text-faint)] mt-4 flex items-center justify-center gap-1 font-mono">
                <Clock size={13} weight="duotone" /> PIN active for 60 minutes
              </p>
            </div>
          </div>
        )}

        {/* Devices List */}
        <div className="mt-8">
          <h2 className="text-sm font-bold text-[var(--ink)] mb-4">Active Device Relays</h2>

          {loading ? (
            <div className="p-8 rounded-eyu bg-[var(--surface)] border border-[var(--line)] text-center text-[var(--text-muted)] font-mono text-xs">
              Loading devices...
            </div>
          ) : devices.length === 0 ? (
            <div className="p-10 rounded-eyu bg-[var(--surface)] border border-dashed border-[var(--line)] text-center">
              <DeviceMobile size={28} weight="duotone" className="text-[var(--text-faint)] mx-auto mb-2" />
              <h3 className="font-heading text-sm font-bold text-[var(--ink)] mb-1">No Phone Paired Yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mb-4">
                Click &quot;Pair New Device&quot; above to connect your Android phone as a live payment relay.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((dev) => (
                <div
                  key={dev.id}
                  className="p-5 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-eyu bg-[var(--surface-elevated)] border border-[var(--line)] flex items-center justify-center text-[var(--ink)]">
                        <DeviceMobile size={20} weight="duotone" className="text-[var(--accent)]" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-[var(--ink)] text-sm">{dev.deviceName}</h3>
                        <span className="text-[10px] font-mono text-[var(--text-faint)]">ID: {dev.id.slice(0, 8)}...</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-eyu font-medium ${
                        dev.isOnline
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/40"
                          : "bg-[var(--surface-elevated)] text-[var(--text-muted)]"
                      }`}
                    >
                      {dev.isOnline ? <WifiHigh size={13} weight="duotone" /> : <WifiSlash size={13} weight="duotone" />}
                      {dev.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-[var(--line)] text-xs text-[var(--text-muted)] font-mono">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        <BatteryCharging size={16} weight="duotone" className="text-[var(--accent)]" /> Battery Level
                      </span>
                      <span className="font-bold text-[var(--ink)]">{dev.batteryLevel}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        <Clock size={14} weight="duotone" className="text-[var(--text-faint)]" /> Last Heartbeat
                      </span>
                      <span>
                        {dev.lastPingAt ? new Date(dev.lastPingAt).toLocaleTimeString() : "Never"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
