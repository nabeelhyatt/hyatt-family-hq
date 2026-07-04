import { NextResponse } from "next/server";

// Public, unauthenticated (see the matcher exception in src/lib/supabase/middleware.ts).
// This fed the family assistant a snapshot of every kid's reading (current
// book, weekly goal, next check-in quiz) via @/lib/reading/family-status,
// which was removed along with the reading module. Left as an honest empty
// response — not deleted, not 404 — because this URL is public and may be
// polled by external automation (see docs/norbert-*.md); repurpose it for
// calendar/todos data or retire it deliberately rather than let it silently
// error.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ kids: [] });
}
