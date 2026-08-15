"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import {
  CheckCircle,
  Copy,
  Check,
  ShieldCheck,
  ArrowsClockwise,
  Bank,
  PhoneCall,
  Lightning,
  WarningCircle,
} from "@phosphor-icons/react";

interface Channel {
  id: string;
  provider: string;
  accountNumber: string;
  accountName: string;
}

interface SessionData {
  id: string;
  title: string;
  amount: number;
  currency: string;
  status: string;
  customerName?: string | null;
  customerPhone?: string | null;
  referenceId?: string | null;
  createdAt: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const id = params?.id as string;

  const [session, setSession] = useState<SessionData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [merchantName, setMerchantName] = useState("Merchant");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [refInput, setRefInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadCheckout();
  }, [id]);

  async function loadCheckout() {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/checkout/${id}`);
      const data = await res.json();
      if (res.ok && data.session) {
        setSession(data.session);
        setChannels(data.merchant.channels || []);
        setMerchantName(data.merchant.name || "Merchant");
        if (data.merchant.channels?.length > 0) {
          setSelectedChannel(data.merchant.channels[0]);
        }
        if (data.session.status === "PAID") {
          setPaidSuccess(true);
        }
      } else {
        setErrorMsg(data.error || "Checkout session not found");
      }
    } catch (err) {
      setErrorMsg("Failed to load payment session.");
    } finally {
      setLoading(false);
    }
  }

  function copyAccount(acc: string) {
    navigator.clipboard.writeText(acc);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!refInput.trim()) {
      setErrorMsg("Please enter your transaction reference number (e.g. FT... or CKL...)");
      return;
    }

    setVerifying(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/checkout/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutId: id,
          referenceId: refInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "PAID") {
        setPaidSuccess(true);
        setSession((prev) => (prev ? { ...prev, status: "PAID", referenceId: refInput.trim() } : null));
      } else {
        setErrorMsg(data.error || "Transaction reference not found yet. Please make sure the transfer is complete and try again in a few seconds.");
      }
    } catch (err) {
      setErrorMsg("Network verification error. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F6F4] dark:bg-[#232323] text-[#232323] dark:text-[#D3D5D0] flex items-center justify-center p-4">
        <div className="text-center font-mono text-xs flex flex-col items-center gap-3">
          <ArrowsClockwise size={24} weight="duotone" className="animate-spin text-[#B48148]" />
          <span>Securing Payment Gateway...</span>
        </div>
      </div>
    );
  }

  if (errorMsg && !session) {
    return (
      <div className="min-h-screen bg-[#F5F6F4] dark:bg-[#232323] text-[#232323] dark:text-[#D3D5D0] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-white dark:bg-[#2A2A2A] border border-[#E0E0E0] dark:border-[#383838] rounded-xl text-center shadow-lg">
          <WarningCircle size={36} weight="duotone" className="text-[#9E4235] mx-auto mb-3" />
          <h2 className="font-heading font-bold text-base mb-1">Invalid Checkout Session</h2>
          <p className="text-xs text-[#666666] dark:text-[#848580] mb-4">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F6F4] dark:bg-[#232323] text-[#232323] dark:text-[#D3D5D0] flex flex-col items-center justify-center p-4 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-[#2A2A2A] border border-[#E0E0E0] dark:border-[#383838] rounded-2xl shadow-xl overflow-hidden">
        {/* Header Branding */}
        <div className="p-6 border-b border-[#EAEAEA] dark:border-[#383838] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="w-7 h-7" />
            <div>
              <div className="font-heading font-bold text-sm leading-tight text-[#232323] dark:text-[#D3D5D0]">
                {merchantName}
              </div>
              <div className="text-[10px] font-mono text-[#848580] flex items-center gap-1 mt-0.5">
                <ShieldCheck size={12} weight="duotone" className="text-[#5A6237]" />
                Chek Verified Gateway
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[#848580]">Amount Due</div>
            <div className="font-heading font-extrabold text-xl text-[#232323] dark:text-[#D3D5D0]">
              {session?.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
              <span className="text-xs font-mono font-normal text-[#B48148]">ETB</span>
            </div>
          </div>
        </div>

        {/* Invoice Item Description */}
        <div className="px-6 py-3.5 bg-[#FAFAFA] dark:bg-[#2F2F2F] border-b border-[#EAEAEA] dark:border-[#383838] flex items-center justify-between text-xs">
          <span className="text-[#666666] dark:text-[#848580]">Item / Service:</span>
          <span className="font-semibold text-[#232323] dark:text-[#D3D5D0] truncate max-w-[200px]">
            {session?.title}
          </span>
        </div>

        {paidSuccess ? (
          /* Payment Completed Receipt State */
          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#5A6237]/15 text-[#5A6237] flex items-center justify-center mb-4">
              <CheckCircle size={40} weight="fill" />
            </div>
            <h2 className="font-heading font-bold text-lg text-[#232323] dark:text-[#D3D5D0] mb-1">
              Payment Verified!
            </h2>
            <p className="text-xs text-[#666666] dark:text-[#848580] mb-6 max-w-xs">
              Your transaction has been confirmed on the Ethiopian banking network.
            </p>

            <div className="w-full p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#323232] border border-[#EAEAEA] dark:border-[#404040] text-left space-y-2 font-mono text-xs mb-6">
              <div className="flex justify-between">
                <span className="text-[#848580]">Amount:</span>
                <span className="font-bold text-[#232323] dark:text-[#D3D5D0]">{session?.amount.toFixed(2)} ETB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#848580]">Reference ID:</span>
                <span className="font-bold text-[#B48148]">{session?.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#848580]">Status:</span>
                <span className="font-bold text-[#5A6237]">COMPLETED</span>
              </div>
            </div>

            <div className="text-[11px] text-[#848580] font-mono">
              You can now close this window or return to your application.
            </div>
          </div>
        ) : (
          /* Payment Instruction & Ref Input Form */
          <div className="p-6 space-y-5">
            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#848580] block mb-2 font-semibold">
                1. Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {channels.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannel(ch)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedChannel?.id === ch.id
                        ? "border-[#5A6237] bg-[#5A6237]/10 text-[#232323] dark:text-[#D3D5D0] shadow-sm"
                        : "border-[#E0E0E0] dark:border-[#383838] bg-transparent hover:bg-[#FAFAFA] dark:hover:bg-[#323232] text-[#666666] dark:text-[#848580]"
                    }`}
                  >
                    <div className="text-xs font-bold">{ch.provider}</div>
                    <div className="text-[10px] font-mono text-[#848580] truncate mt-0.5">{ch.accountName}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Merchant Account Details */}
            {selectedChannel && (
              <div className="p-4 rounded-xl bg-[#FAFAFA] dark:bg-[#323232] border border-[#EAEAEA] dark:border-[#404040]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#848580] mb-1">
                  2. Transfer {session?.amount} ETB to:
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-base font-extrabold text-[#232323] dark:text-[#D3D5D0]">
                      {selectedChannel.accountNumber}
                    </div>
                    <div className="text-xs text-[#666666] dark:text-[#848580]">
                      Account Name: <span className="font-semibold text-[#232323] dark:text-[#D3D5D0]">{selectedChannel.accountName}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyAccount(selectedChannel.accountNumber)}
                    className="p-2 rounded-lg bg-white dark:bg-[#2A2A2A] border border-[#E0E0E0] dark:border-[#484848] text-xs font-mono flex items-center gap-1 text-[#232323] dark:text-[#D3D5D0] hover:opacity-80 transition-all"
                  >
                    {copiedAcc ? <Check size={14} weight="bold" className="text-[#5A6237]" /> : <Copy size={14} weight="duotone" />}
                    <span>{copiedAcc ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Reference ID Form */}
            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#848580] block mb-1 font-semibold">
                  3. Enter Transaction Reference / SMS Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. FT242289912039 or CKL9283741"
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E0E0E0] dark:border-[#383838] bg-[#FAFAFA] dark:bg-[#1E1E1E] text-[#232323] dark:text-[#D3D5D0] font-mono text-sm placeholder:text-[#848580] focus:outline-none focus:border-[#5A6237]"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-[#9E4235]/10 border border-[#9E4235]/30 text-[#9E4235] text-xs leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 rounded-xl font-heading font-bold text-sm bg-[#5A6237] text-white dark:text-[#D3D5D0] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {verifying ? (
                  <>
                    <ArrowsClockwise size={16} weight="duotone" className="animate-spin" />
                    Verifying on Network...
                  </>
                ) : (
                  <>
                    <Lightning size={16} weight="duotone" />
                    Verify Payment
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#FAFAFA] dark:bg-[#202020] border-t border-[#EAEAEA] dark:border-[#383838] text-center text-[10px] font-mono text-[#848580] flex items-center justify-center gap-2">
          <span>Protected by Chek Zero-Fee Gateway Engine</span>
        </div>
      </div>
    </div>
  );
}
