import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-device-token",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCode = (body.code || body.pairingCode || body.pin)?.toString().trim();
    const rawApiKey = (body.apiKey || body.key || req.headers.get("x-api-key"))?.toString().trim();
    const deviceName = body.deviceName || "Android Phone";
    const batteryLevel = typeof body.batteryLevel === "number" ? body.batteryLevel : 100;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key, x-device-token",
    };

    // OPTION A: Direct Pairing via API Key (br_live_...)
    if (rawApiKey && rawApiKey.startsWith("br_live_")) {
      const user = await validateApiKey(rawApiKey);
      if (!user) {
        return NextResponse.json(
          { error: "Invalid API Key. Please copy your key from the Chek dashboard." },
          { status: 401, headers: corsHeaders }
        );
      }

      // Find or create device for this user
      let device = await db.device.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      if (!device) {
        device = await db.device.create({
          data: {
            userId: user.id,
            deviceName,
            batteryLevel,
            isOnline: true,
            lastPingAt: new Date(),
          },
        });
      } else {
        device = await db.device.update({
          where: { id: device.id },
          data: {
            deviceName,
            batteryLevel,
            isOnline: true,
            lastPingAt: new Date(),
          },
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: "Device paired successfully via API Key!",
          deviceToken: device.deviceToken,
          deviceId: device.id,
          user: { id: user.id, email: user.email, name: user.name },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // OPTION B: Pairing via 6-Digit PIN
    const cleanCode = rawCode?.replace(/\D/g, "");
    if (!cleanCode || cleanCode.length !== 6) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit PIN or your API Key (br_live_...)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Search for device with matching pairing code (active within last 60 minutes)
    const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
    const device = await db.device.findFirst({
      where: {
        pairingCode: cleanCode,
        createdAt: { gte: sixtyMinutesAgo },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        {
          error: `PIN "${cleanCode}" not found or expired. Click "Pair New Device" on your computer dashboard to generate a fresh PIN, or paste your API Key directly.`,
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Mark device as paired and online
    const updated = await db.device.update({
      where: { id: device.id },
      data: {
        deviceName: deviceName || device.deviceName,
        pairingCode: null,
        codeExpiresAt: null,
        isOnline: true,
        lastPingAt: new Date(),
        batteryLevel,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Device paired successfully with Chek!",
        deviceToken: updated.deviceToken,
        deviceId: updated.id,
        user: device.user,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Internal server error during pairing" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
