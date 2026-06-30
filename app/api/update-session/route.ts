// ============================================================
// GSpaceAi — /api/update-session
// Lightweight partial session upsert for early-funnel capture.
// Called client-side fire-and-forget at Q1, Q4, and Q5 so
// partial sessions are visible even when users drop off before
// free report generation.
// Only accepts a whitelist of early-funnel fields — payment
// status, audit data, and scores are never written here.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { upsertSession } from "@/src/lib/db";

export const runtime = "nodejs";

type UpdateSessionBody = {
  sessionId: string;
  data: {
    stage?: string;
    name?: string;
    businessName?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdateSessionBody;
    const sessionId = (body.sessionId ?? "").trim();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const { stage, name, businessName } = body.data ?? {};

    await upsertSession(sessionId, { stage, name, businessName });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[update-session] error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
