import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBankMessage } from "@/lib/parsers";
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
      }
    } else if (apiKey) {
      const user = await validateApiKey(apiKey);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      const primaryUser = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
      if (primaryUser) {
        userId = primaryUser.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please pair device first." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { messages } = body; // Array of { rawMessage, sender, date } or { provider, amount, referenceId, ... }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    let insertedCount = 0;
    let duplicateCount = 0;

    for (const item of messages) {
      let provider = item.provider;
      let amount = item.amount;
      let payerName = item.payerName;
      let payerPhone = item.payerPhone || item.payerPhoneOrAcc;
      let referenceId = item.referenceId;
      let balanceAfter = item.balanceAfter;
      let rawMessage = item.rawMessage;

      if (!referenceId && rawMessage) {
        const parsed = parseBankMessage(rawMessage);
        if (parsed) {
          provider = parsed.provider;
          amount = parsed.amount;
          payerName = parsed.payerName;
          payerPhone = parsed.payerPhoneOrAcc;
          referenceId = parsed.referenceId;
          balanceAfter = parsed.balanceAfter;
        }
      }

      if (!referenceId || !amount || !provider) {
        continue;
      }

      // Check if reference already exists
      const existing = await db.transaction.findUnique({
        where: { referenceId },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }

      await db.transaction.create({
        data: {
          userId,
          provider,
          amount: parseFloat(amount),
          currency: "ETB",
          payerName: payerName || "Bank Customer",
          payerPhone: payerPhone || null,
          referenceId,
          balanceAfter: balanceAfter ? parseFloat(balanceAfter) : null,
          rawMessage: rawMessage || `Synced payment of ETB ${amount} via ${provider}`,
          status: "VERIFIED",
        },
      });

      insertedCount++;
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      duplicateCount,
      totalProcessed: messages.length,
      message: `Successfully synced ${insertedCount} historical payments (${duplicateCount} already existed).`,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Relay batch sync error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
