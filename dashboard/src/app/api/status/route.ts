import { NextResponse } from "next/server";
import { fetchFromApi } from "@/lib/api-server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const [status, sql] = await Promise.all([
      fetchFromApi("/api/status").catch(() => null),
      Promise.resolve(getDb()),
    ]);

    // Get total requests and unique users from DB
    const [countRow] = await sql`SELECT COUNT(*) as total FROM usage_logs`;
    const [usersRow] =
      await sql`SELECT COUNT(DISTINCT user_id) as total FROM usage_logs WHERE user_id != 'anonymous'`;

    return NextResponse.json({
      ...status,
      usage: {
        ...(status?.usage || {}),
        total_requests: Number(countRow?.total || 0),
        unique_members: Number(usersRow?.total || 0),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
