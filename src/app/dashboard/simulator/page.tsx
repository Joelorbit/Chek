"use client";

import { useEffect, useState } from "react";
import { Navbar } from "@/components/navbar";
import {
  TerminalWindow,
  Lightning,
  CheckCircle,
  PaperPlaneTilt,
  Copy,
  Check,
  DeviceMobile,
  WifiHigh,
  BatteryCharging,
  ArrowsClockwise,
} from "@phosphor-icons/react";

export default function SimulatorPage() {
  const [activeTab, setActiveTab] = useState<"server" | "mobile">("mobile");
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState("TELEBIRR");
  const [amount, setAmount] = useState("350.00");
  const [payerName, setPayerName] = useState("ABEBE BIKILA");
  const [payerPhone, setPayerPhone] = useState("0911223344");
  const [referenceId, setReferenceId] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Virtual Phone Simulator State
  const [phoneServerUrl, setPhoneServerUrl] = useState("http://localhost:3000");
  const [phonePairingCode, setPhonePairingCode] = useState("");
  const [phonePaired, setPhonePaired] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState("Ready to pair");
  const [phoneLog, setPhoneLog] = useState<string[]>([]);
  const [phoneThemeDark, setPhoneThemeDark] = useState(true);

  useEffect(() => {
    const key = localStorage.getItem("birrrelay_api_key");
    if (key) setApiKey(key);
  }, []);

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;

    setSimulating(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          provider,
          amount: parseFloat(amount),
          payerName,
          payerPhone,
          referenceId: referenceId.trim() || undefined,
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setSimulating(false);
    }
  }

  // Virtual Mobile App: Pair Device with 6-Digit PIN
  async function handleVirtualPhonePair() {
    if (!phonePairingCode || phonePairingCode.length !== 6) {
      alert("Please enter a valid 6-digit PIN from the Devices page");
      return;
    }

    setPhoneStatus("⏳ Verifying PIN with server...");
    try {
      const res = await fetch("/api/v1/device/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairingCode: phonePairingCode,
          deviceName: "Virtual Android Companion",
          batteryLevel: 88,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPhonePaired(true);
        setPhoneStatus("● Connected & Relaying Payments");
        setPhoneLog((prev) => [
          `[${new Date().toLocaleTimeString()}] Device paired successfully! (Token: ${data.deviceToken.slice(0, 10)}...)`,
          `[${new Date().toLocaleTimeString()}] Background NotificationListenerService started.`,
          ...prev,
        ]);
      } else {
        setPhoneStatus("✕ Pairing failed: Invalid or expired PIN");
      }
    } catch (e) {
      setPhoneStatus("✕ Connection error to server URL");
    }
  }

  // Virtual Mobile App: Simulate incoming SMS/Notification on Phone
  async function handleVirtualPhoneIncomingSms(type: "cbe" | "telebirr") {
    if (!phonePaired) {
      alert("Please pair the phone with a 6-digit PIN first!");
      return;
    }

    const testMsg =
      type === "cbe"
        ? `Dear customer, your account 1000123456789 has been credited with ETB 1,500.00 by BIRUK TADESSE. Ref: FT${Math.floor(100000000000 + Math.random() * 900000000000)}. Current balance is ETB 45,210.00.`
        : `You have received ETB 500.00 from ABEBE BIKILA (0911223344) with transaction number CKL${Math.floor(1000000 + Math.random() * 9000000)} on ${new Date().toISOString().slice(0, 10)}. Your current balance is ETB 12,450.00.`;

    setPhoneLog((prev) => [
      `[${new Date().toLocaleTimeString()}] 📩 Intercepted ${type.toUpperCase()} Notification!`,
      `[${new Date().toLocaleTimeString()}] 🔍 Parsed locally with BankParser.kt (Zero OTP leakage)`,
      `[${new Date().toLocaleTimeString()}] 🚀 Relayed event to ${phoneServerUrl}/api/v1/relay/event`,
      ...prev,
    ]);

    // Send to relay
    if (apiKey) {
      await fetch("/api/v1/relay/event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ rawMessage: testMsg }),
      });
    }
  }

  function copyJson() {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--line)]">
          <div>
            <h1 className="text-2xl font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
              Payment & Android App Testing Suite
              <TerminalWindow size={22} weight="duotone" className="text-[var(--complement)]" />
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Test the Android companion app UI and the payment ingestion engine end-to-end.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 bg-[var(--surface)] p-1 rounded-eyu border border-[var(--line)]">
            <button
              onClick={() => setActiveTab("mobile")}
              className={`px-3 py-1 rounded-eyu text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "mobile"
                  ? "bg-[var(--accent)] text-white dark:text-[#d3d5d0]"
                  : "text-[var(--text-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <DeviceMobile size={15} weight="duotone" />
              Android App Tester
            </button>
            <button
              onClick={() => setActiveTab("server")}
              className={`px-3 py-1 rounded-eyu text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === "server"
                  ? "bg-[var(--accent)] text-white dark:text-[#d3d5d0]"
                  : "text-[var(--text-muted)] hover:text-[var(--ink)]"
              }`}
            >
              <Lightning size={15} weight="duotone" />
              Server Sandbox
            </button>
          </div>
        </div>

        {/* TAB 1: Mobile Phone Interactive Tester */}
        {activeTab === "mobile" && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Phone Screen Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div
                className={`w-full max-w-[340px] rounded-[36px] border-4 border-[#3c3c3c] shadow-2xl p-4 transition-colors ${
                  phoneThemeDark ? "bg-[#232323] text-[#d3d5d0]" : "bg-[#f5f6f4] text-[#232323]"
                }`}
              >
                {/* Phone Speaker & Camera Notch */}
                <div className="w-24 h-4 bg-[#1a1a1a] rounded-full mx-auto mb-4 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#3c3c3c]" />
                </div>

                {/* Status bar */}
                <div className="flex items-center justify-between text-[10px] font-mono mb-4 px-2 text-[#848580]">
                  <span>19:42</span>
                  <div className="flex items-center gap-1.5">
                    <WifiHigh size={12} weight="bold" />
                    <span>88%</span>
                    <BatteryCharging size={13} weight="bold" />
                  </div>
                </div>

                {/* Android App Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#5a6237]/30 border border-[#5a6237] flex items-center justify-center text-xs">
                      ⚡
                    </div>
                    <span className="font-heading font-bold text-sm tracking-tight">BirrRelay</span>
                  </div>

                  <button
                    onClick={() => setPhoneThemeDark(!phoneThemeDark)}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#5a6237]/40 font-mono bg-[#5a6237]/10"
                  >
                    {phoneThemeDark ? "☀️ Light" : "🌙 Dark"}
                  </button>
                </div>

                {/* App Main Card */}
                <div
                  className={`p-4 rounded-xl border mb-3 ${
                    phoneThemeDark
                      ? "bg-[#2a2a2a] border-[rgba(211,213,208,0.14)]"
                      : "bg-[#ffffff] border-[rgba(35,35,35,0.12)] shadow-sm"
                  }`}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider font-mono text-[#b48148] mb-1">
                    DEVICE PAIRING
                  </div>
                  <div className="text-[11px] text-[#848580] mb-3">Connect to your BirrRelay Console</div>

                  <label className="block text-[10px] text-[#848580] mb-1 font-mono">Server URL</label>
                  <input
                    type="text"
                    value={phoneServerUrl}
                    onChange={(e) => setPhoneServerUrl(e.target.value)}
                    className={`w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border mb-3 focus:outline-none ${
                      phoneThemeDark ? "bg-[#1a1a1a] border-[#3c3c3c] text-white" : "bg-[#edebe7] border-[#d3d5d0] text-black"
                    }`}
                  />

                  <label className="block text-[10px] text-[#848580] mb-1 font-mono">6-Digit Pairing PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={phonePairingCode}
                    onChange={(e) => setPhonePairingCode(e.target.value)}
                    className={`w-full text-center text-lg font-bold font-mono tracking-widest px-2 py-1.5 rounded-lg border mb-3 focus:outline-none text-[#b48148] ${
                      phoneThemeDark ? "bg-[#1a1a1a] border-[#3c3c3c]" : "bg-[#edebe7] border-[#d3d5d0]"
                    }`}
                  />

                  <button
                    onClick={handleVirtualPhonePair}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-[#5a6237] text-white hover:bg-[#6c7642] transition-colors"
                  >
                    {phonePaired ? "Re-Pair Device" : "Pair & Activate Relay"}
                  </button>
                </div>

                {/* App Status Card */}
                <div
                  className={`p-3 rounded-xl border text-[11px] ${
                    phoneThemeDark
                      ? "bg-[#2a2a2a] border-[rgba(211,213,208,0.14)]"
                      : "bg-[#ffffff] border-[rgba(35,35,35,0.12)] shadow-sm"
                  }`}
                >
                  <div className="text-[9px] font-bold uppercase font-mono text-[#b48148] mb-1">RELAY STATUS</div>
                  <div
                    className={`font-semibold text-xs mb-1 ${
                      phonePaired ? "text-[#5a6237]" : "text-[#848580]"
                    }`}
                  >
                    {phoneStatus}
                  </div>
                  <p className="text-[9px] text-[#848580] leading-tight">
                    🔒 On-device privacy active. OTPs & personal SMS are filtered locally.
                  </p>
                </div>

                {/* Bottom Home Indicator */}
                <div className="w-28 h-1 bg-[#4a4a4a] rounded-full mx-auto mt-4" />
              </div>
            </div>

            {/* Simulation Controls & Live Relay Console */}
            <div className="lg:col-span-7 space-y-6">
              {/* Actions Box */}
              <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] shadow-sm">
                <h2 className="font-heading text-sm font-bold text-[var(--ink)] mb-2 flex items-center gap-2">
                  <Lightning size={16} weight="duotone" className="text-[var(--accent)]" /> Send Test Notification to Phone
                </h2>
                <p className="text-xs text-[var(--text-muted)] mb-4">
                  Simulate an incoming bank SMS received on this Android phone to test on-device parsing and instant webhook relay.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleVirtualPhoneIncomingSms("cbe")}
                    className="px-4 py-2 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 transition-all flex items-center gap-1.5"
                  >
                    <span>🏦</span> Simulate CBE SMS (1,500 ETB)
                  </button>
                  <button
                    onClick={() => handleVirtualPhoneIncomingSms("telebirr")}
                    className="px-4 py-2 rounded-eyu text-xs font-semibold bg-[var(--complement)] text-white hover:opacity-90 transition-all flex items-center gap-1.5"
                  >
                    <span>📱</span> Simulate Telebirr (500 ETB)
                  </button>
                </div>
              </div>

              {/* Live Relay Activity Stream */}
              <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading text-xs font-bold text-[var(--ink)] uppercase font-mono tracking-wider">
                    Android Companion Live Stream
                  </h3>
                  <button
                    onClick={() => setPhoneLog([])}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--ink)] font-mono"
                  >
                    Clear Logs
                  </button>
                </div>

                <div className="h-60 overflow-y-auto bg-[var(--surface-pressed)] p-3 rounded-eyu border border-[var(--line)] font-mono text-xs text-[var(--complement)] space-y-1.5">
                  {phoneLog.length === 0 ? (
                    <div className="text-[var(--text-faint)] text-center pt-20">
                      Pair the phone or trigger a test notification above to see live relay execution...
                    </div>
                  ) : (
                    phoneLog.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Physical APK Installation Guide */}
              <div className="p-5 rounded-eyu bg-[var(--surface-elevated)] border border-[var(--line-strong)] text-xs">
                <h4 className="font-heading font-bold text-[var(--ink)] mb-1 flex items-center gap-1.5">
                  <DeviceMobile size={15} weight="duotone" className="text-[var(--accent)]" /> How to install on your real Android phone:
                </h4>
                <p className="text-[var(--text-muted)] text-[11px] mb-2">
                  The native Kotlin companion app code is ready in <code className="font-mono text-[var(--complement)]">android-client/</code>.
                </p>
                <ol className="list-decimal list-inside space-y-1 text-[var(--text-muted)] text-[11px]">
                  <li>Open <strong>Android Studio</strong> ➔ Open folder <code>/android-client</code>.</li>
                  <li>Click <strong>Build ➔ Build APK(s)</strong> (Size: ~1.5 MB with R8 shrinking).</li>
                  <li>Transfer the APK to your Android device, open it, and enter your 6-digit PIN.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Server Payment Sandbox */}
        {activeTab === "server" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Simulation Form */}
            <div className="p-6 sm:p-7 rounded-eyu bg-[var(--surface)] border border-[var(--line)] shadow-sm">
              <h2 className="font-heading text-sm font-bold text-[var(--ink)] mb-4 flex items-center gap-2">
                <Lightning size={16} weight="duotone" className="text-[var(--accent)]" /> Configure Simulated Alert
              </h2>

              <form onSubmit={handleSimulate} className="space-y-4 text-xs">
                {/* Provider selection */}
                <div>
                  <label className="block font-mono font-semibold uppercase text-[var(--text-muted)] mb-2 text-[11px]">
                    Payment Provider
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: "TELEBIRR", label: "Telebirr" },
                      { id: "CBE", label: "CBE Mobile" },
                      { id: "CBE_BIRR", label: "CBE Birr" },
                      { id: "AWASH", label: "Awash Bank" },
                      { id: "BOA", label: "Abyssinia" },
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setProvider(p.id)}
                        className={`py-2 px-3 rounded-eyu font-semibold border transition-all text-xs ${
                          provider === p.id
                            ? "bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-strong)] dark:text-[var(--ink)]"
                            : "bg-[var(--surface-pressed)] border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--ink)]"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-mono font-semibold uppercase text-[var(--text-muted)] mb-1.5 text-[11px]">
                    Amount (ETB)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      className="w-full bg-[var(--surface-pressed)] border border-[var(--line)] rounded-eyu px-3.5 py-2 text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <span className="absolute right-3.5 top-2 text-[11px] font-mono font-bold text-[var(--complement)]">
                      ETB
                    </span>
                  </div>
                </div>

                {/* Payer Name */}
                <div>
                  <label className="block font-mono font-semibold uppercase text-[var(--text-muted)] mb-1.5 text-[11px]">
                    Payer Full Name
                  </label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    required
                    className="w-full bg-[var(--surface-pressed)] border border-[var(--line)] rounded-eyu px-3.5 py-2 text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                {/* Payer Phone / Account */}
                <div>
                  <label className="block font-mono font-semibold uppercase text-[var(--text-muted)] mb-1.5 text-[11px]">
                    Payer Phone or Account (Optional)
                  </label>
                  <input
                    type="text"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="0911223344"
                    className="w-full bg-[var(--surface-pressed)] border border-[var(--line)] rounded-eyu px-3.5 py-2 text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                {/* Reference ID */}
                <div>
                  <label className="block font-mono font-semibold uppercase text-[var(--text-muted)] mb-1.5 text-[11px]">
                    Reference ID (Optional auto-generate)
                  </label>
                  <input
                    type="text"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="Auto-generated e.g. CKL938201 or FT249201"
                    className="w-full bg-[var(--surface-pressed)] border border-[var(--line)] rounded-eyu px-3.5 py-2 text-[var(--ink)] font-mono focus:outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={simulating}
                  className="w-full mt-6 py-2.5 rounded-eyu font-bold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 border border-[var(--accent)]/60 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 text-xs"
                >
                  <PaperPlaneTilt size={16} weight="duotone" />
                  {simulating ? "Simulating Payment..." : "Trigger Simulated Payment"}
                </button>
              </form>
            </div>

            {/* Result / Terminal Panel */}
            <div className="flex flex-col">
              <div className="p-6 sm:p-7 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex-1 flex flex-col shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-sm font-bold text-[var(--ink)] flex items-center gap-2">
                    <TerminalWindow size={16} weight="duotone" className="text-[var(--complement)]" /> Webhook Dispatch Output
                  </h2>
                  {result && (
                    <button
                      onClick={copyJson}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--ink)] flex items-center gap-1 bg-[var(--surface-elevated)] border border-[var(--line)] px-2.5 py-1 rounded-eyu font-mono"
                    >
                      {copied ? <Check size={13} weight="bold" className="text-[var(--accent)]" /> : <Copy size={13} weight="duotone" />}
                      {copied ? "Copied" : "Copy Payload"}
                    </button>
                  )}
                </div>

                {result ? (
                  <div className="flex-1 flex flex-col">
                    {/* Status Banner */}
                    <div
                      className={`p-3 rounded-eyu text-xs font-semibold flex items-center gap-2 mb-4 ${
                        result.success
                          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/40"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      <CheckCircle size={16} weight="duotone" className="shrink-0 text-[var(--accent)]" />
                      <span>
                        Payment verified successfully!{" "}
                        {result.webhookDispatched
                          ? "Webhook dispatched to your endpoint."
                          : "No webhook URL configured yet (Saved in database)."}
                      </span>
                    </div>

                    <div className="flex-1 font-mono text-xs text-[var(--complement)] bg-[var(--surface-pressed)] p-4 rounded-eyu border border-[var(--line)] overflow-x-auto">
                      <pre>{JSON.stringify(result, null, 2)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[var(--line)] rounded-eyu">
                    <TerminalWindow size={28} weight="duotone" className="text-[var(--text-faint)] mb-2" />
                    <p className="font-heading text-sm font-semibold text-[var(--ink)] mb-1">Simulator Ready</p>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs">
                      Trigger a payment on the left to see the instant transaction payload and HMAC signature output.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
