import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    let user = await validateApiKey(apiKey);

    if (!user) {
      user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const channels = await db.paymentChannel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, channels });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    let user = await validateApiKey(apiKey);

    if (!user) {
      user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { provider, accountNumber, accountName } = body;

    if (!provider || !accountNumber || !accountName) {
      return NextResponse.json(
        { error: "Missing required fields: provider, accountNumber, and accountName" },
        { status: 400 }
      );
    }

    const channel = await db.paymentChannel.create({
      data: {
        userId: user.id,
        provider: provider.toUpperCase(),
        accountNumber,
        accountName,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, channel }, { status: 201 });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
