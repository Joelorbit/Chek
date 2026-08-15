import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSecret, validateApiKey } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const user = await validateApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { webhookUrl, regenerateSecret } = body;

    const dataToUpdate: Record<string, string | null> = {};
    if (typeof webhookUrl === "string") {
      dataToUpdate.webhookUrl = webhookUrl.trim() || null;
    }
    if (regenerateSecret) {
      dataToUpdate.webhookSecret = generateSecret();
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: dataToUpdate,
      select: {
        apiKey: true,
        webhookUrl: true,
        webhookSecret: true,
      },
    });

    return NextResponse.json({
      success: true,
      config: updated,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
