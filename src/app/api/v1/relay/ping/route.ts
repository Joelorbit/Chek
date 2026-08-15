import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateDeviceToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const deviceToken = req.headers.get("x-device-token");
    if (!deviceToken) {
      return NextResponse.json({ error: "Missing x-device-token header" }, { status: 401 });
    }

    const device = await validateDeviceToken(deviceToken);
    if (!device) {
      return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { batteryLevel } = body;

    const updated = await db.device.update({
      where: { id: device.id },
      data: {
        isOnline: true,
        batteryLevel: typeof batteryLevel === "number" ? batteryLevel : device.batteryLevel,
        lastPingAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      status: "ONLINE",
      deviceId: updated.id,
      batteryLevel: updated.batteryLevel,
      serverTime: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
