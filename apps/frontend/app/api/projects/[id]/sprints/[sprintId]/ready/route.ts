import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

function getAuth(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : "";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sprintId: string }> },
) {
  const { id, sprintId } = await params;
  const res = await fetch(`${BACKEND_URL}/projects/${id}/sprints/${sprintId}/ready`, {
    method: "POST",
    headers: { Authorization: getAuth(req) },
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
