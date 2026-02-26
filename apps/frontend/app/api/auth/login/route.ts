import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const body = await req.json();

  let data: { accessToken?: string; user?: unknown };
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: "Invalid credentials" }));
      return NextResponse.json({ message: err.message ?? "Invalid credentials" }, { status: res.status });
    }

    data = await res.json();
  } catch {
    return NextResponse.json({ message: "Backend unreachable" }, { status: 503 });
  }

  const response = NextResponse.json({ user: data.user });
  response.cookies.set("accessToken", data.accessToken ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
