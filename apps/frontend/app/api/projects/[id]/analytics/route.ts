import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

function getAuth(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : "";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") ?? "burn-rate";
  const query = new URLSearchParams(searchParams);
  query.delete("metric");
  const qs = query.toString();

  const res = await fetch(
    `${BACKEND_URL}/projects/${id}/analytics/${metric}${qs ? `?${qs}` : ""}`,
    { headers: { Authorization: getAuth(req) } },
  );
  return NextResponse.json(await res.json(), { status: res.status });
}
