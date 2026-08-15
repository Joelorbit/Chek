import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key") || req.nextUrl.searchParams.get("api_key");
    const user = await validateApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Valid x-api-key required." }, { status: 401 });
    }

    const ref = req.nextUrl.searchParams.get("ref") || req.nextUrl.searchParams.get("reference_id");
    if (!ref) {
      return NextResponse.json({ error: "Missing required query param 'ref' or 'reference_id'" }, { status: 400 });
    }

    const transaction = await db.transaction.findFirst({
      where: {
        userId: user.id,
        referenceId: {
          equals: ref.trim(),
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          verified: false,
          status: "NOT_FOUND",
          message: "No transaction found matching this reference ID.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verified: true,
      status: transaction.status,
      transaction: {
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
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const user = await validateApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Valid x-api-key required." }, { status: 401 });
    }

    const body = await req.json();
    const ref = body.ref || body.reference_id;
    const amount = body.amount ? parseFloat(body.amount) : undefined;

    if (!ref) {
      return NextResponse.json({ error: "Missing required field 'reference_id'" }, { status: 400 });
    }

    const transaction = await db.transaction.findFirst({
      where: {
        userId: user.id,
        referenceId: {
          equals: ref.trim(),
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          verified: false,
          status: "NOT_FOUND",
          message: "No transaction found matching this reference ID.",
        },
        { status: 404 }
      );
    }

    // Optional amount verification
    const amountMatches = amount === undefined || Math.abs(transaction.amount - amount) < 0.01;

    return NextResponse.json({
      verified: amountMatches,
      status: amountMatches ? transaction.status : "AMOUNT_MISMATCH",
      amount_matches: amountMatches,
      transaction: {
        id: transaction.id,
        provider: transaction.provider,
        amount: transaction.amount,
        currency: transaction.currency,
        payer_name: transaction.payerName,
        payer_phone: transaction.payerPhone,
        reference_id: transaction.referenceId,
        created_at: transaction.createdAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
