"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import {
  Bank,
  Plus,
  Trash,
  CheckCircle,
  Copy,
  Check,
  ArrowsClockwise,
  CreditCard,
  QrCode,
  LinkSimple,
} from "@phosphor-icons/react";

interface Channel {
  id: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  isActive: boolean;
}

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("TELEBIRR");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [adding, setAdding] = useState(false);

  // Quick Checkout Link Generator state
  const [checkoutTitle, setCheckoutTitle] = useState("");
  const [checkoutAmount, setCheckoutAmount] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/channels");
      const data = await res.json();
      if (res.ok) {
        setChannels(data.channels || []);
      }
    } catch (err) {
      console.error("Failed to load payment channels:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNumber || !accountName) return;

    setAdding(true);
    try {
      const res = await fetch("/api/v1/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, accountNumber, accountName }),
      });
      if (res.ok) {
        setAccountNumber("");
        setAccountName("");
        fetchChannels();
      }
    } catch (err) {
      console.error("Failed to add channel:", err);
    } finally {
      setAdding(false);
    }
  }

  async function handleCreateCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!checkoutTitle || !checkoutAmount) return;

    setCreatingLink(true);
    try {
      const res = await fetch("/api/v1/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: checkoutTitle,
          amount: parseFloat(checkoutAmount),
        }),
      });
      const data = await res.json();
      if (res.ok && data.checkoutUrl) {
        setGeneratedLink(data.checkoutUrl);
      }
    } catch (err) {
      console.error("Failed to create checkout link:", err);
    } finally {
      setCreatingLink(false);
    }
  }

  function copyLink() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {/* Header */}
        <div className="pb-6 border-b border-[var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)] flex items-center gap-2">
              Payment Gateway Accounts & Links
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Configure personal CBE and Telebirr accounts to accept customer transfers directly with 0% cuts.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="text-xs font-mono text-[var(--complement)] hover:underline flex items-center gap-1"
          >
            ← Back to Stream
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Active Payment Channels List */}
          <div className="space-y-6">
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)]">
              <h2 className="font-heading font-bold text-base text-[var(--ink)] mb-1 flex items-center gap-2">
                <Bank size={18} weight="duotone" className="text-[var(--accent)]" />
                Active Receiving Accounts
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                These accounts are presented to your customers during checkout.
              </p>

              {loading ? (
                <div className="p-6 text-center text-xs font-mono text-[var(--text-muted)]">
                  <ArrowsClockwise size={16} weight="duotone" className="animate-spin mx-auto mb-2" />
                  Loading accounts...
                </div>
              ) : channels.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--line)] rounded-eyu">
                  No payment accounts configured yet. Add your Telebirr or CBE account below.
                </div>
              ) : (
                <div className="space-y-3">
                  {channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="p-4 rounded-eyu bg-[var(--surface-pressed)] border border-[var(--line)] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-eyu bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] flex items-center justify-center text-xs font-mono font-bold">
                          {ch.provider === "TELEBIRR" ? "TB" : ch.provider === "CBE" ? "CBE" : "AW"}
                        </div>
                        <div>
                          <div className="font-mono text-sm font-bold text-[var(--ink)]">{ch.accountNumber}</div>
                          <div className="text-xs text-[var(--text-muted)] font-medium">
                            {ch.accountName} • <span className="font-mono text-[var(--complement)]">{ch.provider}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-eyu bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)]">
                        ACTIVE
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Channel Form */}
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)]">
              <h3 className="font-heading font-bold text-sm text-[var(--ink)] mb-4 flex items-center gap-2">
                <Plus size={16} weight="bold" className="text-[var(--accent)]" />
                Add Bank / Wallet Account
              </h3>
              <form onSubmit={handleAddChannel} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Provider
                  </label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-eyu border border-[var(--line)] bg-[var(--surface-pressed)] text-[var(--ink)] text-xs font-mono focus:outline-none"
                  >
                    <option value="TELEBIRR">Telebirr (09... or 07...)</option>
                    <option value="CBE">Commercial Bank of Ethiopia (1000...)</option>
                    <option value="AWASH">Awash Bank (01304...)</option>
                    <option value="BOA">Bank of Abyssinia</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Account / Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0911223344 or 1000123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-eyu border border-[var(--line)] bg-[var(--surface-pressed)] text-[var(--ink)] text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Abebe Bikila"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 rounded-eyu border border-[var(--line)] bg-[var(--surface-pressed)] text-[var(--ink)] text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adding}
                  className="w-full py-2.5 rounded-eyu font-semibold text-xs bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 transition-all shadow-sm"
                >
                  {adding ? "Adding Account..." : "Save Account"}
                </button>
              </form>
            </div>
          </div>

          {/* Quick Payment Link Generator */}
          <div className="space-y-6">
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)]">
              <h2 className="font-heading font-bold text-base text-[var(--ink)] mb-1 flex items-center gap-2">
                <LinkSimple size={18} weight="duotone" className="text-[var(--complement)]" />
                Generate Hosted Payment Link
              </h2>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Create an instant Odit-style checkout link to send to clients on Telegram, WhatsApp, or websites.
              </p>

              <form onSubmit={handleCreateCheckout} className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Item / Service Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VIP Telegram Bot Subscription"
                    value={checkoutTitle}
                    onChange={(e) => setCheckoutTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-eyu border border-[var(--line)] bg-[var(--surface-pressed)] text-[var(--ink)] text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Amount (ETB)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={checkoutAmount}
                    onChange={(e) => setCheckoutAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-eyu border border-[var(--line)] bg-[var(--surface-pressed)] text-[var(--ink)] text-xs font-mono focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingLink}
                  className="w-full py-2.5 rounded-eyu font-semibold text-xs bg-[var(--complement)] text-white dark:text-[#232323] hover:opacity-90 transition-all shadow-sm font-heading"
                >
                  {creatingLink ? "Generating Link..." : "Create Payment Link →"}
                </button>
              </form>

              {generatedLink && (
                <div className="mt-6 p-4 rounded-eyu bg-[var(--surface-pressed)] border border-[var(--line)]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                    Ready Payment Link:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full px-2.5 py-1.5 rounded-eyu bg-[var(--surface)] text-[var(--ink)] font-mono text-xs border border-[var(--line)]"
                    />
                    <button
                      onClick={copyLink}
                      className="px-3 py-1.5 rounded-eyu bg-[var(--accent)] text-white dark:text-[#d3d5d0] text-xs font-mono flex items-center gap-1 shrink-0"
                    >
                      {copiedLink ? <Check size={14} weight="bold" /> : <Copy size={14} weight="duotone" />}
                      {copiedLink ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="mt-3">
                    <a
                      href={generatedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--complement)] font-mono hover:underline inline-flex items-center gap-1"
                    >
                      Open Checkout Preview ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
