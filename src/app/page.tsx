"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { BrandLogo } from "@/components/brand-logo";
import {
  Lightning,
  DeviceMobile,
  TerminalWindow,
  ArrowRight,
  CheckCircle,
} from "@phosphor-icons/react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] transition-colors duration-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex-1 flex flex-col items-center text-center">
        {/* Subtle ambient accent glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[var(--accent-soft)] rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Hero Brand Receipt Emblem */}
        <div className="mb-6">
          <BrandLogo className="w-16 h-16 mx-auto animate-pulse drop-shadow-md" />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-eyu bg-[var(--surface)] border border-[var(--line)] text-xs font-medium text-[var(--ink)] mb-8 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--complement)] animate-pulse" />
          <span>Made for Ethiopian Developers & Telegram Bot Creators</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[var(--ink)] max-w-4xl leading-[1.15]">
          Automate CBE & Telebirr Payments{" "}
          <span className="text-[var(--complement)]">
            Without Business Licenses or Gateway Fees.
          </span>
        </h1>

        {/* Description */}
        <p className="mt-6 text-base sm:text-lg text-[var(--text-muted)] max-w-2xl font-normal leading-relaxed">
          Chek securely bridges incoming bank SMS and notifications from your personal Android device directly into your webapps, SaaS, and Telegram bots in real-time.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 border border-[var(--accent)]/60 transition-all shadow-sm active:scale-98"
          >
            <Lightning size={16} weight="duotone" className="text-[var(--complement)]" />
            Open Developer Console
            <ArrowRight size={14} weight="bold" />
          </Link>
          <Link
            href="/dashboard/simulator"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-eyu text-xs font-semibold bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-elevated)] border border-[var(--line)] transition-all"
          >
            <TerminalWindow size={16} weight="duotone" className="text-[var(--complement)]" />
            Test Live Simulator
          </Link>
        </div>

        {/* Live Supported Institutions Bar */}
        <div className="mt-16 w-full max-w-4xl pt-10 border-t border-[var(--line)]">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-faint)] mb-6 font-mono">
            Supported Ethiopian Payment Channels
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { name: "Telebirr", code: "P2P & Merchant", color: "text-[var(--complement)]" },
              { name: "CBE Mobile", code: "13-digit accounts", color: "text-[var(--ink)]" },
              { name: "CBE Birr", code: "Mobile Wallet", color: "text-[var(--ink)]" },
              { name: "Awash Bank", code: "14-digit accounts", color: "text-[var(--complement)]" },
              { name: "Abyssinia (BOA)", code: "Bank of Abyssinia", color: "text-[var(--terracotta)]" },
            ].map((bank) => (
              <div
                key={bank.name}
                className="p-3 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col items-center justify-center text-center hover:border-[var(--line-strong)] transition-colors"
              >
                <span className="font-heading font-bold text-sm text-[var(--ink)]">{bank.name}</span>
                <span className={`text-[11px] font-mono font-medium mt-0.5 ${bank.color}`}>{bank.code}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Grid Section */}
      <section id="features" className="py-20 bg-[var(--surface-inset)] border-y border-[var(--line)] px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-extrabold text-[var(--ink)] tracking-tight">
              Why Solo Devs Choose Chek
            </h2>
            <p className="mt-3 text-[var(--text-muted)] text-xs">
              The honest comparison between manual screenshot checks, official gateways, and Chek.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Option 1: Manual */}
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">Manual Verification</span>
                <span className="text-[10px] px-2 py-0.5 rounded-eyu bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono">Slow & Unscalable</span>
              </div>
              <ul className="space-y-3 text-xs text-[var(--text-muted)] mb-6 flex-1 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span> Customers wait hours while you sleep.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span> Scammed by photoshopped receipts.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-bold">✕</span> Manual Telegram DM support overhead.
                </li>
              </ul>
            </div>

            {/* Option 2: Chek (Recommended) */}
            <div className="p-6 rounded-eyu bg-[var(--surface)] border-2 border-[var(--accent)] flex flex-col relative shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-eyu bg-[var(--accent)] text-white dark:text-[#d3d5d0] text-[10px] font-bold uppercase tracking-wider font-mono">
                Most Popular
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[var(--complement)] uppercase tracking-wider font-mono">Chek</span>
                <span className="text-[10px] px-2 py-0.5 rounded-eyu bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--accent)]/40 font-mono font-semibold">100% Automated</span>
              </div>
              <ul className="space-y-3 text-xs text-[var(--ink)] mb-6 flex-1 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} weight="duotone" className="text-[var(--accent)] shrink-0 mt-0.5" />
                  <span><strong>Zero Fees</strong>: 0% cut taken on transactions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} weight="duotone" className="text-[var(--accent)] shrink-0 mt-0.5" />
                  <span><strong>No Trade License</strong>: Works with personal accounts.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} weight="duotone" className="text-[var(--accent)] shrink-0 mt-0.5" />
                  <span><strong>Instant Fulfillment</strong>: Webhooks fire in under 2 seconds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} weight="duotone" className="text-[var(--accent)] shrink-0 mt-0.5" />
                  <span><strong>Privacy Guard</strong>: Personal texts never touch the server.</span>
                </li>
              </ul>
              <Link
                href="/dashboard"
                className="w-full text-center py-2 rounded-eyu font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 transition-all text-xs"
              >
                Start in 3 Minutes
              </Link>
            </div>

            {/* Option 3: Official Gateway */}
            <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider font-mono">Commercial Gateways</span>
                <span className="text-[10px] px-2 py-0.5 rounded-eyu bg-[var(--complement-soft)] text-[var(--complement)] border border-[var(--complement)]/30 font-mono font-medium">Enterprise Only</span>
              </div>
              <ul className="space-y-3 text-xs text-[var(--text-muted)] mb-6 flex-1 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--complement)] font-bold">!</span> Requires registered company & TIN.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--complement)] font-bold">!</span> 2.5% to 3.5% transaction cut.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--complement)] font-bold">!</span> Payout settlement holding periods.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Step Walkthrough */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-[var(--ink)] tracking-tight">How It Works in 3 Steps</h2>
          <p className="mt-3 text-[var(--text-muted)] text-xs">Effortless pairing inspired by Odit.et and Verify.et.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] relative">
            <div className="w-8 h-8 rounded-eyu bg-[var(--accent-soft)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--ink)] font-bold mb-4 font-mono text-xs">
              1
            </div>
            <h3 className="font-heading text-sm font-bold text-[var(--ink)] mb-2">Install Companion App</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Install the lightweight Chek app on your phone. It runs a local notification listener with zero personal data leakage.
            </p>
          </div>

          <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] relative">
            <div className="w-8 h-8 rounded-eyu bg-[var(--accent-soft)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--ink)] font-bold mb-4 font-mono text-xs">
              2
            </div>
            <h3 className="font-heading text-sm font-bold text-[var(--ink)] mb-2">Pair with 6-Digit PIN</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Click &quot;Pair Device&quot; in the console, enter the 6-digit code in your app, and your phone immediately establishes a secure heartbeat.
            </p>
          </div>

          <div className="p-6 rounded-eyu bg-[var(--surface)] border border-[var(--line)] relative">
            <div className="w-8 h-8 rounded-eyu bg-[var(--accent-soft)] border border-[var(--accent)]/40 flex items-center justify-center text-[var(--ink)] font-bold mb-4 font-mono text-xs">
              3
            </div>
            <h3 className="font-heading text-sm font-bold text-[var(--ink)] mb-2">Receive Instant Webhooks</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Whenever a customer pays your CBE or Telebirr account, your server receives an HMAC-signed webhook and activates their order automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--line)] py-8 px-4 text-center text-xs text-[var(--text-faint)] font-mono">
        <p>© 2026 Chek. Built for Ethiopian developers. EyuTheme Design System.</p>
      </footer>
    </div>
  );
}
