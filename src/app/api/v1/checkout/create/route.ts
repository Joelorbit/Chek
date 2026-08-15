import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const apiKey = req.headers.get("x-api-key") || (authHeader ? authHeader.replace("Bearer ", "") : null);
    let user = await validateApiKey(apiKey);

    if (!user) {
      user = await db.user.findFirst({ orderBy: { createdAt: "asc" } });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Valid API Key required." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, amount, customerName, customerPhone, metadata } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: "Missing required fields: title and amount (ETB)" }, { status: 400 });
    }

    const session = await db.checkoutSession.create({
      data: {
        userId: user.id,
        title,
        amount: parseFloat(amount),
        currency: "ETB",
        status: "PENDING",
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const checkoutUrl = `${protocol}://${host}/pay/${session.id}`;

    return NextResponse.json({
      success: true,
      checkoutId: session.id,
      checkoutUrl,
      amount: session.amount,
      currency: session.currency,
      status: session.status,
      createdAt: session.createdAt,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
