"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DeviceMobile,
  TerminalWindow,
  WebhooksLogo,
  BookBookmark,
  SquaresFour,
} from "@phosphor-icons/react";
import { ThemeToggle } from "./theme-provider";
import { BrandLogo } from "./brand-logo";

export function Navbar() {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard");

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--bg)]/95 border-b border-[var(--line)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandLogo className="w-7 h-7 group-hover:scale-105 transition-transform" />
          <div className="flex items-center gap-1.5">
            <span className="font-heading font-extrabold text-xl tracking-tight text-[var(--ink)]">
              Chek
            </span>
            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded-eyu bg-[var(--accent-soft)] text-[var(--accent-strong)] dark:text-[var(--ink)] border border-[var(--line)]">
              v1.0
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {isDashboard ? (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--line-strong)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                <SquaresFour size={16} weight="duotone" className="text-[var(--accent)]" />
                Live Feed
              </Link>
              <Link
                href="/dashboard/devices"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-medium transition-colors ${
                  pathname === "/dashboard/devices"
                    ? "bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--line-strong)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                <DeviceMobile size={16} weight="duotone" className="text-[var(--accent)]" />
                Devices
              </Link>
              <Link
                href="/dashboard/simulator"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-medium transition-colors ${
                  pathname === "/dashboard/simulator"
                    ? "bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--line-strong)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                <TerminalWindow size={16} weight="duotone" className="text-[var(--complement)]" />
                Simulator
              </Link>
              <Link
                href="/dashboard/webhooks"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-medium transition-colors ${
                  pathname === "/dashboard/webhooks"
                    ? "bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--line-strong)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                <WebhooksLogo size={16} weight="duotone" className="text-[var(--accent)]" />
                Webhooks
              </Link>
              <Link
                href="/dashboard/docs"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-eyu text-xs font-medium transition-colors ${
                  pathname === "/dashboard/docs"
                    ? "bg-[var(--surface-elevated)] text-[var(--ink)] border border-[var(--line-strong)] font-semibold"
                    : "text-[var(--text-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                <BookBookmark size={16} weight="duotone" className="text-[var(--complement)]" />
                Docs & SDKs
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/#features"
                className="px-3 py-1.5 rounded-eyu text-xs font-medium text-[var(--text-muted)] hover:text-[var(--ink)] transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#how-it-works"
                className="px-3 py-1.5 rounded-eyu text-xs font-medium text-[var(--text-muted)] hover:text-[var(--ink)] transition-colors"
              >
                How It Works
              </Link>
              <Link
                href="/dashboard/docs"
                className="px-3 py-1.5 rounded-eyu text-xs font-medium text-[var(--text-muted)] hover:text-[var(--ink)] transition-colors"
              >
                SDKs & APIs
              </Link>
            </>
          )}
        </nav>

        {/* Right CTA + Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-eyu text-xs font-semibold bg-[var(--accent)] text-white dark:text-[#d3d5d0] hover:opacity-90 border border-[var(--accent)]/60 transition-all shadow-sm"
          >
            <SquaresFour size={16} weight="duotone" />
            Console
          </Link>
        </div>
      </div>
    </header>
  );
}
