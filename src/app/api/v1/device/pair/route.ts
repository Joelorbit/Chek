import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = (body.code || body.pairingCode)?.toString().trim();
    const deviceName = body.deviceName;

    if (!code) {
      return NextResponse.json({ error: "Missing 6-digit pairing code" }, { status: 400 });
    }

    const device = await db.device.findFirst({
      where: {
        pairingCode: code,
        codeExpiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Invalid or expired pairing code. Please generate a new code from the dashboard." },
        { status: 404 }
      );
    }

    // Pair successfully & clear pairing code
    const updated = await db.device.update({
      where: { id: device.id },
      data: {
        deviceName: deviceName || device.deviceName,
        pairingCode: null,
        codeExpiresAt: null,
        isOnline: true,
        lastPingAt: new Date(),
        batteryLevel: body.batteryLevel ?? device.batteryLevel,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Device paired successfully with BirrRelay",
      deviceToken: updated.deviceToken,
      deviceId: updated.id,
      user: device.user,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
