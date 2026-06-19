// ============================================================
// GSpaceAi — /api/admin/regenerate-report
// Admin-only route to regenerate a paid report from stored
// session audit_data. Requires ADMIN_SECRET header.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSession, saveReport, logError } from "@/src/lib/db";
import { buildRecommendationsReportData, buildImplementationGuideData } from "@/src/lib/reportGeneration";
import { generateRecommendationsReportPDF, generateImplementationGuidePDF } from "@/src/lib/pdfGeneration";
import type { UserProfile } from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

type RequestBody = {
  session_id: string;
  report_type: "recommendations_report" | "implementation_guide_sop";
};

export async function POST(req: NextRequest) {
  // Auth check — must match ADMIN_SECRET env var
  const secret = req.headers.get("x-admin-secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody | undefined;

  try {
    body = (await req.json()) as RequestBody;
    const { session_id, report_type } = body;

    if (!session_id || !report_type) {
      return NextResponse.json({ error: "session_id and report_type are required" }, { status: 400 });
    }

    if (report_type !== "recommendations_report" && report_type !== "implementation_guide_sop") {
      return NextResponse.json({ error: "report_type must be recommendations_report or implementation_guide_sop" }, { status: 400 });
    }

    // Load stored session
    const session = await getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: `Session ${session_id} not found` }, { status: 404 });
    }
    if (!session.audit_data) {
      return NextResponse.json({ error: `Session ${session_id} has no audit_data` }, { status: 422 });
    }

    // Reconstruct UserProfile from session fields
    const user: UserProfile = {
      name:          session.name ?? "Unknown",
      email:         session.email ?? undefined,
      businessName:  session.business_name ?? "Unknown Business",
      businessType:  session.business_type ?? "",
      industry:      session.industry ?? undefined,
    };

    const audit = session.audit_data;

    // Regenerate
    let pdfBuffer: Buffer;
    let reportData: unknown;

    if (report_type === "recommendations_report") {
      reportData  = await buildRecommendationsReportData(audit, user);
      pdfBuffer   = await generateRecommendationsReportPDF(reportData as Parameters<typeof generateRecommendationsReportPDF>[0]);
    } else {
      reportData  = await buildImplementationGuideData(audit, user);
      pdfBuffer   = await generateImplementationGuidePDF(reportData as Parameters<typeof generateImplementationGuidePDF>[0]);
    }

    // Save — overwrites existing PDF in storage
    const pdfUrl = await saveReport(session_id, report_type, pdfBuffer, reportData);

    return NextResponse.json({
      success:    true,
      session_id,
      report_type,
      pdf_url:    pdfUrl,
      regenerated_at: new Date().toISOString(),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack   = err instanceof Error ? err.stack : undefined;
    console.error("[admin/regenerate-report] Error:", message);
    if (stack) console.error(stack);
    logError({
      context:       `admin-regenerate:${body?.report_type ?? "unknown"}`,
      message,
      stack,
      session_id:    body?.session_id,
    }).catch(() => {});
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
