import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

function getAuth(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  const { id, agentId } = await params;
  const res = await fetch(`${BACKEND_URL}/projects/${id}/agents/${agentId}`, {
    headers: { Authorization: getAuth(req) },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; agentId: string }> },
) {
  const { id, agentId } = await params;
  const body = await req.json();
  const res = await fetch(`${BACKEND_URL}/projects/${id}/agents/${agentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: getAuth(req) },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
