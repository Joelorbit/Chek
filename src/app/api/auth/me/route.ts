import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    let user = await validateApiKey(apiKey);

    // If no key or key mismatch, load the primary developer account
    if (!user) {
      user = await db.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
    }

    if (!user) {
      // Auto-create initial developer account if DB is completely fresh
      user = await db.user.create({
        data: {
          email: "dev@chek.et",
          password: "defaultPassword123",
          name: "Developer",
        },
      });
    }

    const devices = await db.device.findMany({
      orderBy: { lastPingAt: "desc" },
    });

    const recentTransactions = await db.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const recentLogs = await db.webhookLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const totalVolume = await db.transaction.aggregate({
      _sum: { amount: true },
      _count: true,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        apiKey: user.apiKey,
        webhookUrl: user.webhookUrl,
        webhookSecret: user.webhookSecret,
      },
      stats: {
        totalAmount: totalVolume._sum.amount || 0,
        transactionCount: totalVolume._count || 0,
        deviceCount: devices.length,
        onlineDeviceCount: devices.filter((d) => d.isOnline).length,
      },
      devices,
      transactions: recentTransactions,
      webhookLogs: recentLogs,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
