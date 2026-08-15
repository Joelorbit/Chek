import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";
import { dispatchWebhook } from "@/lib/webhook-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const user = await validateApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Valid x-api-key required." }, { status: 401 });
    }

    const body = await req.json();
    const provider = body.provider || "TELEBIRR";
    const amount = parseFloat(body.amount) || 150.0;
    const payerName = body.payerName || "SIMULATED TEST USER";
    const payerPhone = body.payerPhone || "0911002233";
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const referenceId = body.referenceId || (provider === "CBE" ? `FT${randomSuffix}` : `CKL${randomSuffix}`);

    const rawMessage =
      provider === "CBE"
        ? `Dear Customer, your account 1000****9999 has been credited with ETB ${amount.toFixed(2)} by ${payerName}. Ref: ${referenceId}. Current balance is ETB 10,000.00.`
        : `You have received ETB ${amount.toFixed(2)} from ${payerName} (${payerPhone}) with transaction number ${referenceId} on ${new Date().toISOString().slice(0, 10)}. Your current balance is ETB 5,000.00.`;

    const transaction = await db.transaction.create({
      data: {
        userId: user.id,
        provider,
        amount,
        currency: "ETB",
        payerName,
        payerPhone,
        referenceId,
        balanceAfter: 5000,
        rawMessage,
        status: "VERIFIED",
      },
    });

    let webhookResult = null;
    if (user.webhookUrl) {
      webhookResult = await dispatchWebhook({
        userId: user.id,
        transactionId: transaction.id,
        endpoint: user.webhookUrl,
        secret: user.webhookSecret || "whsec_default",
        event: "payment.received",
        data: {
          id: transaction.id,
          provider: transaction.provider,
          amount: transaction.amount,
          currency: transaction.currency,
          payer_name: transaction.payerName,
          payer_phone: transaction.payerPhone,
          reference_id: transaction.referenceId,
          balance_after: transaction.balanceAfter,
          is_simulated: true,
          created_at: transaction.createdAt.toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      transaction,
      webhookDispatched: !!user.webhookUrl,
      webhookResult,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
