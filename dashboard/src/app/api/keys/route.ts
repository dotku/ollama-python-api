import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const userId = session.user.sub;

  const rows =
    await sql`SELECT id, LEFT(key, 7) || '...' as key_preview, name, created_at, revoked FROM api_keys WHERE user_id = ${userId} ORDER BY created_at DESC`;

  return NextResponse.json({
    keys: rows.map((r) => ({
      id: r.id,
      key_preview: r.key_preview,
      name: r.name,
      created_at: r.created_at,
      revoked: r.revoked,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  const userId = session.user.sub;
  const userEmail = session.user.email || "";

  // Generate API key
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const key = `oa-${Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  const sql = getDb();
  await sql`INSERT INTO api_keys (key, user_id, user_email, name) VALUES (${key}, ${userId}, ${userEmail}, ${name || "Default"})`;

  return NextResponse.json({ key, name: name || "Default" });
}

export async function DELETE(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await request.json();
  const userId = session.user.sub;
  const sql = getDb();

  const result =
    await sql`UPDATE api_keys SET revoked = TRUE WHERE id = ${keyId} AND user_id = ${userId} AND revoked = FALSE`;

  if (result.length === 0) {
    // Check via count
    const [check] =
      await sql`SELECT COUNT(*) as c FROM api_keys WHERE id = ${keyId} AND user_id = ${userId} AND revoked = TRUE`;
    if (!check || check.c === 0) {
      return NextResponse.json(
        { error: "Key not found or already revoked" },
        { status: 404 }
      );
    }
  }

  return NextResponse.json({ status: "revoked" });
}
