import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhook-dispatcher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { checkoutId, referenceId } = body;

    if (!checkoutId || !referenceId) {
      return NextResponse.json(
        { error: "Missing required fields: checkoutId and referenceId" },
        { status: 400 }
      );
    }

    const session = await db.checkoutSession.findUnique({
      where: { id: checkoutId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Invalid checkout session" }, { status: 404 });
    }

    if (session.status === "PAID") {
      return NextResponse.json({
        success: true,
        status: "PAID",
        message: "Payment already verified!",
        session,
      });
    }

    // Match transaction by reference ID
    const cleanRef = referenceId.trim().toUpperCase();
    const transaction = await db.transaction.findFirst({
      where: {
        userId: session.userId,
        referenceId: { contains: cleanRef },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          status: "NOT_FOUND",
          error: "Reference ID not detected yet. If you just sent the payment, please wait 3-5 seconds and try again.",
        },
        { status: 404 }
      );
    }

    // Mark session as PAID
    const updatedSession = await db.checkoutSession.update({
      where: { id: session.id },
      data: {
        status: "PAID",
        referenceId: transaction.referenceId,
      },
    });

    // Link transaction to checkoutId
    await db.transaction.update({
      where: { id: transaction.id },
      data: { checkoutId: session.id },
    });

    // Fire webhook to developer backend
    if (session.user?.webhookUrl) {
      await dispatchWebhook({
        userId: session.userId,
        transactionId: transaction.id,
        endpoint: session.user.webhookUrl,
        secret: session.user.webhookSecret || "whsec_default",
        event: "checkout.completed",
        data: {
          checkout_id: session.id,
          title: session.title,
          amount: session.amount,
          currency: session.currency,
          payer_name: transaction.payerName,
          payer_phone: transaction.payerPhone,
          reference_id: transaction.referenceId,
          provider: transaction.provider,
          status: "PAID",
          created_at: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: "PAID",
      message: "Payment successfully verified and fulfilled!",
      transaction,
      session: updatedSession,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
