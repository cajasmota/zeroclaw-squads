import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
const BASE = `${BACKEND_URL}/settings/models`;

function getAuth(req: NextRequest) {
  const token = req.cookies.get("accessToken")?.value;
  return token ? `Bearer ${token}` : "";
}

// GET /api/models?action=status|providers
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "status";
  const path = action === "providers" ? `${BASE}/providers` : `${BASE}/ollama/status`;
  const res = await fetch(path, { headers: { Authorization: getAuth(req) } });
  return NextResponse.json(await res.json(), { status: res.status });
}

// POST /api/models → { action: "pull"|"load"|"unload", model?: string }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, model, ...rest } = body;

  let path: string;
  if (action === "pull") {
    path = `${BASE}/ollama/pull`;
  } else if (action === "load") {
    path = `${BASE}/ollama/${encodeURIComponent(model)}/load`;
  } else if (action === "unload") {
    path = `${BASE}/ollama/${encodeURIComponent(model)}/unload`;
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: getAuth(req) },
    body: JSON.stringify(action === "pull" ? { model } : rest),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

// DELETE /api/models?model=xxx
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const model = searchParams.get("model");
  if (!model) return NextResponse.json({ error: "model required" }, { status: 400 });
  const res = await fetch(`${BASE}/ollama/${encodeURIComponent(model)}`, {
    method: "DELETE",
    headers: { Authorization: getAuth(req) },
  });
  if (res.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(await res.json(), { status: res.status });
}

// PATCH /api/models → { provider: "openai", enabled: true }
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { provider, ...rest } = body;
  if (!provider) return NextResponse.json({ error: "provider required" }, { status: 400 });
  const res = await fetch(`${BASE}/providers/${encodeURIComponent(provider)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: getAuth(req) },
    body: JSON.stringify(rest),
  });
  return NextResponse.json(await res.json(), { status: res.status });
}
