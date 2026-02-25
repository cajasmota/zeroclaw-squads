import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

function getAuth(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : "";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; storyId: string }> },
) {
  const { id, storyId } = await params;
  const res = await fetch(`${BACKEND_URL}/projects/${id}/stories/${storyId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: getAuth(req) },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
