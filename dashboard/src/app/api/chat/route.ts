import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.OLLAMA_API_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") || "";
  const model = searchParams.get("model") || "smollm:latest";

  const res = await fetch(`${API_URL}/chat?q=${encodeURIComponent(q)}&model=${encodeURIComponent(model)}`);

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status });
  }

  return NextResponse.json(await res.json());
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(err, { status: res.status });
  }

  return NextResponse.json(await res.json());
}
