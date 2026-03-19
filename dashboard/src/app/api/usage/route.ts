import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get("limit") || "50");
  const userId = searchParams.get("user_id");

  const sql = getDb();

  let rows;
  if (userId) {
    rows =
      await sql`SELECT created_at, user_id, endpoint, model, duration_ms, client_ip FROM usage_logs WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT ${limit}`;
  } else {
    rows =
      await sql`SELECT created_at, user_id, endpoint, model, duration_ms, client_ip FROM usage_logs ORDER BY created_at DESC LIMIT ${limit}`;
  }

  return NextResponse.json({
    log: rows.map((row) => ({
      time: row.created_at,
      user: row.user_id,
      endpoint: row.endpoint,
      model: row.model,
      duration_ms: row.duration_ms,
      client_ip: row.client_ip,
    })),
  });
}
