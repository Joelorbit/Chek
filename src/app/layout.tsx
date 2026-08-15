import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chek — Ethiopian Payment Verification & Webhook Relay",
  description:
    "Automate CBE, Telebirr, and Ethiopian bank payments to your webapps and Telegram bots with zero transaction fees and zero trade license required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[var(--bg)] text-[var(--ink)] font-sans antialiased selection:bg-[#5a6237]/30 selection:text-[#d3d5d0]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
