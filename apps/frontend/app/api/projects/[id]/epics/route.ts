import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

function getAuth(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : "";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${BACKEND_URL}/projects/${id}/epics`, {
    headers: { Authorization: getAuth(req) },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/projects/${id}/epics`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: getAuth(req) },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
