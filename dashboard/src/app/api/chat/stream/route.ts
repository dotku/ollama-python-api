import { NextRequest } from "next/server";

const API_URL = process.env.OLLAMA_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payload = JSON.stringify(body);

  // Try streaming endpoint first
  try {
    const streamRes = await fetch(`${API_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });

    if (streamRes.ok) {
      return new Response(streamRes.body, {
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  } catch {
    // stream endpoint unavailable, fall through
  }

  // Fallback to /chat (non-streaming)
  const chatRes = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });

  if (!chatRes.ok) {
    const err = await chatRes.text();
    return new Response(err, { status: chatRes.status });
  }

  const data = await chatRes.json();
  const responseText = data.response?.response || data.response || "";
  const ndjson = JSON.stringify({ model: body.model, response: responseText, done: true }) + "\n";

  return new Response(ndjson, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
