import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBankMessage } from "@/lib/parsers";
import { dispatchWebhook } from "@/lib/webhook-dispatcher";
import { validateApiKey, validateDeviceToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const deviceToken = req.headers.get("x-device-token");

    let userId: string | null = null;

    if (deviceToken) {
      const device = await validateDeviceToken(deviceToken);
      if (device) {
        userId = device.userId;
        // Update device activity
        await db.device.update({
          where: { id: device.id },
          data: { isOnline: true, lastPingAt: new Date() },
        });
      }
    } else if (apiKey) {
      const user = await validateApiKey(apiKey);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Missing or invalid x-api-key or x-device-token header." },
        { status: 401 }
      );
    }

    const body = await req.json();
    let { provider, amount, payerName, payerPhone, referenceId, balanceAfter, rawMessage } = body;

    // If raw message is provided without parsed fields, parse it on the server
    if (rawMessage && (!amount || !referenceId)) {
      const parsed = parseBankMessage(rawMessage);
      if (!parsed) {
        return NextResponse.json(
          { error: "Could not parse valid payment details from the provided message." },
          { status: 400 }
        );
      }
      provider = parsed.provider;
      amount = parsed.amount;
      payerName = parsed.payerName;
      payerPhone = parsed.payerPhoneOrAcc;
      referenceId = parsed.referenceId;
      balanceAfter = parsed.balanceAfter;
    }

    if (!amount || !referenceId || !provider) {
      return NextResponse.json(
        { error: "Missing required fields: amount, referenceId, and provider are required." },
        { status: 400 }
      );
    }

    // Check if transaction already exists (Idempotency & Replay Protection)
    const existing = await db.transaction.findUnique({
      where: { referenceId },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: true,
          status: "DUPLICATE",
          message: "Transaction already processed",
          transaction: existing,
        },
        { status: 200 }
      );
    }

    // Create transaction in database
    const transaction = await db.transaction.create({
      data: {
        userId,
        provider,
        amount: parseFloat(amount),
        currency: "ETB",
        payerName: payerName || "Unknown Payer",
        payerPhone: payerPhone || null,
        referenceId,
        balanceAfter: balanceAfter ? parseFloat(balanceAfter) : null,
        rawMessage: rawMessage || `Payment of ETB ${amount} via ${provider}`,
        status: "VERIFIED",
      },
    });

    // Fetch user webhook config
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    // Dispatch webhook to developer backend if configured
    let webhookResult = null;
    if (user?.webhookUrl) {
      webhookResult = await dispatchWebhook({
        userId,
        transactionId: transaction.id,
        endpoint: user.webhookUrl,
        secret: user.webhookSecret,
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
          created_at: transaction.createdAt.toISOString(),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        status: "VERIFIED",
        transaction,
        webhookDispatched: !!user?.webhookUrl,
        webhookSuccess: webhookResult?.success ?? false,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Relay event error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
