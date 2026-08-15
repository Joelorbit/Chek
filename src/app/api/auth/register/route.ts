import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateApiKey, generateSecret, hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const existing = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashPassword(password),
        name: name?.trim() || null,
        apiKey: generateApiKey(),
        webhookSecret: generateSecret(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        apiKey: true,
        webhookUrl: true,
        webhookSecret: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      user,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
