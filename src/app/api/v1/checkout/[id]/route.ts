import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await db.checkoutSession.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            channels: {
              where: { isActive: true },
              select: {
                id: true,
                provider: true,
                accountNumber: true,
                accountName: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Checkout session not found or expired" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        title: session.title,
        amount: session.amount,
        currency: session.currency,
        status: session.status,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        referenceId: session.referenceId,
        createdAt: session.createdAt,
      },
      merchant: {
        name: session.user.name || "Merchant",
        channels: session.user.channels,
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
