import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generatePairingCode, validateApiKey } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const user = await validateApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Valid x-api-key required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const deviceName = body.deviceName || "My Android Phone";

    const pairingCode = generatePairingCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    const device = await db.device.create({
      data: {
        userId: user.id,
        deviceName,
        pairingCode,
        codeExpiresAt: expiresAt,
        isOnline: false,
      },
    });

    return NextResponse.json({
      success: true,
      deviceId: device.id,
      pairingCode,
      expiresAt: expiresAt.toISOString(),
      instructions: "Open BirrRelay on your Android device and enter this 6-digit PIN to pair.",
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
