import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateApiKey } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const user = await validateApiKey(apiKey);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const devices = await db.device.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const recentTransactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const recentLogs = await db.webhookLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const totalVolume = await db.transaction.aggregate({
      where: { userId: user.id },
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
