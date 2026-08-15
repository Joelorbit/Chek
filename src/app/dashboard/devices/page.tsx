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
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const key = localStorage.getItem("birrrelay_api_key");
    if (key) {
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

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              Pair your Android phone using a 6-digit PIN (inspired by Odit.et simplicity).
            </p>
          </div>

          <button
            onClick={generateCode}
            disabled={generating}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 border border-[var(--accent)]/60 transition-all disabled:opacity-50 shadow-sm"
          >
            <Plus size={16} weight="bold" />
            {generating ? "Generating PIN..." : "Pair New Device"}
          </button>
        </div>

        {/* 6-Digit Pairing Box */}
        {pairingCode && (
          <div className="my-6 p-6 sm:p-8 rounded-eyu bg-[var(--surface)] border-2 border-[var(--accent)] shadow-md">
            <div className="max-w-md mx-auto text-center">
              <div className="w-10 h-10 rounded-eyu bg-[var(--accent-soft)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--ink)] mx-auto mb-3">
                <DeviceMobile size={20} weight="duotone" />
              </div>
              <h3 className="font-heading text-base font-bold text-[var(--ink)] mb-1">Enter 6-Digit PIN on Phone</h3>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Open the BirrRelay Android App on your device and type this pairing PIN:
              </p>

              <div className="inline-flex items-center justify-center gap-2 sm:gap-3 font-mono text-3xl font-extrabold text-[var(--complement)] tracking-widest bg-[var(--surface-pressed)] px-6 py-3.5 rounded-eyu border border-[var(--line)] mb-5">
                {pairingCode.split("").map((digit, i) => (
                  <span key={i} className="w-7 text-center">
                    {digit}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => copyToClipboard(pairingCode)}
                  className="px-3 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--line)] flex items-center gap-1.5 transition-colors font-mono"
                >
                  {copied ? <Check size={14} weight="bold" className="text-[var(--accent)]" /> : <Copy size={14} weight="duotone" />}
                  {copied ? "Copied" : "Copy PIN"}
                </button>
                <button
                  onClick={() => setPairingCode(null)}
                  className="px-3 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--surface-elevated)] hover:bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--ink)] border border-[var(--line)] transition-colors"
                >
                  Dismiss
                </button>
              </div>

              <p className="text-[11px] text-[var(--text-faint)] mt-4 flex items-center justify-center gap-1 font-mono">
                <Clock size={13} weight="duotone" /> PIN expires in 15 minutes
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
