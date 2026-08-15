"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import {
  Lightning,
  DeviceMobile,
  CheckCircle,
  TrendUp,
  Pulse,
  TerminalWindow,
  ArrowsClockwise,
  Clock,
  ShieldCheck,
  Bank,
  PhoneCall,
} from "@phosphor-icons/react";

interface Transaction {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  payerName: string;
  payerPhone?: string | null;
  referenceId: string;
  balanceAfter?: number | null;
  status: string;
  createdAt: string;
}

interface Device {
  id: string;
  deviceName: string;
  batteryLevel: number;
  isOnline: boolean;
  lastPingAt: string | null;
}

export default function DashboardPage() {
  const [apiKey, setApiKey] = useState<string>("");
  const [stats, setStats] = useState({
    totalAmount: 0,
    transactionCount: 0,
    deviceCount: 0,
    onlineDeviceCount: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function init() {
      let storedKey = localStorage.getItem("birrrelay_api_key");

      if (!storedKey) {
        try {
          const email = `dev_${Math.floor(1000 + Math.random() * 9000)}@local.dev`;
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password: "defaultPassword123",
              name: "Solo Developer",
            }),
          });
          const data = await res.json();
          if (data.user?.apiKey) {
            const key = data.user.apiKey as string;
            storedKey = key;
            localStorage.setItem("birrrelay_api_key", key);
          }
        } catch (e) {
          console.error("Auto registration failed:", e);
        }
      }

      if (storedKey) {
        setApiKey(storedKey);
        fetchDashboardData(storedKey);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    const interval = setInterval(() => {
      fetchDashboardData(apiKey, false);
    }, 4000);
    return () => clearInterval(interval);
  }, [apiKey]);

  async function fetchDashboardData(key: string, showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "x-api-key": key },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setTransactions(data.transactions || []);
        setDevices(data.devices || []);
        setUserEmail(data.user?.email || "");
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--line)]">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
              Payment Stream & Console
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Active account: <span className="text-[var(--complement)] font-mono font-medium">{userEmail || "Local Dev"}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/simulator"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-elevated)] border border-[var(--line)] transition-all"
            >
              <TerminalWindow size={16} weight="duotone" className="text-[var(--complement)]" />
              Test Simulator
            </Link>
            <Link
              href="/dashboard/devices"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] border border-[var(--accent)]/60 hover:opacity-90 transition-all shadow-sm"
            >
              <DeviceMobile size={16} weight="duotone" />
              Pair Phone
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Total Volume */}
          <div className="p-5 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Total Verified Volume</span>
              <TrendUp size={18} weight="duotone" className="text-[var(--accent)]" />
            </div>
            <div className="font-heading text-2xl font-extrabold text-[var(--ink)]">
              {stats.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
              <span className="text-xs font-mono font-normal text-[var(--complement)]">ETB</span>
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mt-2 font-mono">0% gateway transaction fees</div>
          </div>

          {/* Transactions Count */}
          <div className="p-5 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Transactions Processed</span>
              <Pulse size={18} weight="duotone" className="text-[var(--complement)]" />
            </div>
            <div className="font-heading text-2xl font-extrabold text-[var(--ink)]">{stats.transactionCount}</div>
            <div className="text-[11px] text-[var(--text-faint)] mt-2 font-mono">Idempotent & duplicate protected</div>
          </div>

          {/* Device Health */}
          <div className="p-5 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Connected Devices</span>
              <DeviceMobile size={18} weight="duotone" className="text-[var(--accent)]" />
            </div>
            <div className="font-heading text-2xl font-extrabold text-[var(--ink)] flex items-center gap-2">
              {stats.onlineDeviceCount} / {stats.deviceCount}
              {stats.onlineDeviceCount > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-eyu bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/40 font-medium">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-eyu bg-[var(--surface-elevated)] text-[var(--text-muted)] font-medium">
                  Ready to pair
                </span>
              )}
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mt-2 font-mono">5-minute battery heartbeat</div>
          </div>

          {/* API Key Box */}
          <div className="p-5 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Your API Key</span>
              <ShieldCheck size={18} weight="duotone" className="text-[var(--complement)]" />
            </div>
            <div className="font-mono text-xs text-[var(--ink)] truncate bg-[var(--surface-pressed)] px-2.5 py-1.5 rounded-eyu border border-[var(--line)]">
              {apiKey || "Loading..."}
            </div>
            <div className="text-[11px] text-[var(--text-faint)] mt-2 flex items-center justify-between font-mono">
              <span>Use in REST headers</span>
              <Link href="/dashboard/docs" className="text-[var(--complement)] hover:underline">
                Docs →
              </Link>
            </div>
          </div>
        </div>

        {/* Live Transaction Feed */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--ink)] tracking-tight">Live Payment Stream</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-eyu bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/40 font-medium">
                Auto-syncing
              </span>
            </div>
            <button
              onClick={() => fetchDashboardData(apiKey)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--ink)] flex items-center gap-1.5 transition-colors font-mono"
            >
              <ArrowsClockwise size={14} weight="duotone" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-12 rounded-eyu bg-[var(--surface)] border border-[var(--line)] text-center text-[var(--text-muted)] font-mono text-xs">
              <ArrowsClockwise size={20} weight="duotone" className="animate-spin mx-auto text-[var(--complement)] mb-2" />
              Loading real-time payments...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 rounded-eyu bg-[var(--surface)] border border-dashed border-[var(--line)] text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-eyu bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--ink)] mb-3 border border-[var(--line)]">
                <Lightning size={20} weight="duotone" className="text-[var(--complement)]" />
              </div>
              <h3 className="font-heading text-sm font-bold text-[var(--ink)] mb-1">No Payments Received Yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mb-5">
                Pair your Android phone or use the built-in Simulator to trigger a test CBE or Telebirr payment.
              </p>
              <Link
                href="/dashboard/simulator"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 transition-all"
              >
                <TerminalWindow size={16} weight="duotone" />
                Simulate First Payment
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-eyu bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--line-strong)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-eyu flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        tx.provider === "TELEBIRR"
                          ? "bg-[var(--complement-soft)] text-[var(--complement)] border border-[var(--complement)]/30"
                          : tx.provider === "CBE"
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/30"
                          : "bg-[var(--terracotta-soft)] text-[var(--terracotta)] border border-[var(--terracotta)]/30"
                      }`}
                    >
                      {tx.provider === "TELEBIRR" ? "TB" : tx.provider === "CBE" ? "CBE" : "AW"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-[var(--ink)] text-sm">{tx.payerName}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-eyu bg-[var(--surface-pressed)] text-[var(--ink)] font-mono border border-[var(--line)]">
                          {tx.referenceId}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex flex-wrap items-center gap-3 font-mono">
                        <span className="flex items-center gap-1">
                          <Bank size={13} weight="duotone" className="text-[var(--text-faint)]" />
                          {tx.provider}
                        </span>
                        {tx.payerPhone && (
                          <span className="flex items-center gap-1">
                            <PhoneCall size={13} weight="duotone" className="text-[var(--text-faint)]" />
                            {tx.payerPhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[var(--text-faint)]">
                          <Clock size={13} weight="duotone" />
                          {new Date(tx.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[var(--line)]">
                    <div className="text-base font-extrabold text-[var(--ink)] font-mono">
                      +{tx.amount.toFixed(2)} <span className="text-xs font-normal text-[var(--complement)]">ETB</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-[var(--accent-strong)] dark:text-[var(--ink)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-eyu border border-[var(--accent)]/30 mt-0.5">
                      {tx.status}
                    </span>
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
