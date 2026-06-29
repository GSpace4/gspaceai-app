// ============================================================
// GSpaceAi — /api/generate-report
// Builds report content, generates PDF, returns base64.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { buildFreeReportData, buildRecommendationsReportData, buildImplementationGuideData } from "@/src/lib/reportGeneration";
import { generateFreeReportPDF, generateRecommendationsReportPDF, generateImplementationGuidePDF } from "@/src/lib/pdfGeneration";
import { upsertSession, saveReport, logError } from "@/src/lib/db";
import type { AuditState, UserProfile, QuestionnaireAnswer, AuditAnswer } from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // Recommendations report calls Gemini — allow more time

type GenerateReportBody = {
  reportType: "platform_consolidation_snapshot" | "recommendations_report" | "implementation_guide_sop";
  auditState: AuditState;
  user: UserProfile;
  sessionId?: string;
  // v2.0 context fields — appended to auditState.answers before Gemini sees them
  freeIntakeAnswers?: QuestionnaireAnswer[];
  paid29IntakeAnswers?: QuestionnaireAnswer[];
  paid79ChatAnswers?: Array<{ question: string; answer: string }>;
  freeReportContent?: string;
  paid29ReportContent?: string;
};

// ------------------------------------------------------------
// Enrich auditState.answers with all prior context so the
// existing report generation functions pass it to Gemini.
// reportGeneration.ts is not modified — context flows through
// the answers array that its prompts already incorporate.
// ------------------------------------------------------------
function buildEnrichedAuditState(
  base: AuditState,
  body: GenerateReportBody
): AuditState {
  const ts = new Date().toISOString();
  const extra: AuditAnswer[] = [];

  if (body.freeIntakeAnswers?.length) {
    for (const qa of body.freeIntakeAnswers) {
      extra.push({
        question:  `[Free Intake] ${qa.question}`,
        answer:    qa.selectedOptions.join(", "),
        timestamp: ts,
      });
    }
  }

  if (body.freeReportContent?.trim()) {
    extra.push({
      question:  "Free Audit Report Summary",
      answer:    body.freeReportContent.trim(),
      timestamp: ts,
    });
  }

  if (body.paid29IntakeAnswers?.length) {
    for (const qa of body.paid29IntakeAnswers) {
      extra.push({
        question:  `[Recommendations Intake] ${qa.question}`,
        answer:    qa.selectedOptions.join(", "),
        timestamp: ts,
      });
    }
  }

  if (body.paid29ReportContent?.trim()) {
    extra.push({
      question:  "Recommendations Report Summary",
      answer:    body.paid29ReportContent.trim(),
      timestamp: ts,
    });
  }

  if (body.paid79ChatAnswers?.length) {
    for (const ca of body.paid79ChatAnswers) {
      extra.push({
        question:  `[Implementation Chat] ${ca.question}`,
        answer:    ca.answer,
        timestamp: ts,
      });
    }
  }

  if (extra.length === 0) return base;
  return { ...base, answers: [...base.answers, ...extra] };
}

export async function POST(req: NextRequest) {
  let body: GenerateReportBody | undefined;
  try {
    body = (await req.json()) as GenerateReportBody;
    const { reportType, auditState, user, sessionId } = body;

    if (!reportType || !auditState || !user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ---- Platform Consolidation Snapshot (free) ----
    if (reportType === "platform_consolidation_snapshot") {
      const enriched   = buildEnrichedAuditState(auditState, body);
      const reportData = buildFreeReportData(enriched, user);
      const pdfBuffer = await generateFreeReportPDF(reportData);

      // Persist session + PDF — awaited so writes complete before function exits
      if (sessionId) {
        try {
          await Promise.all([
            upsertSession(sessionId, {
              name: user.name,
              businessName: user.businessName,
              businessType: user.businessType,
              industry: user.industry,
              stage: "free_report_ready",
              consolidationScore: auditState.gspaceConsolidationScore,
              scoreLabel: auditState.scoreLabel,
              estimatedAnnualSavings: auditState.estimatedAnnualSavings,
              auditData: auditState,
            }),
            saveReport(sessionId, reportType, pdfBuffer, reportData),
          ]);
        } catch (err) {
          console.warn("[generate-report] Supabase save error:", err);
        }
      }

      return NextResponse.json({
        success: true,
        reportType,
        pdfBase64: pdfBuffer.toString("base64"),
        reportData,
      });
    }

    // ---- Recommendations Report ($29) ----
    if (reportType === "recommendations_report") {
      const enriched   = buildEnrichedAuditState(auditState, body);
      const reportData = await buildRecommendationsReportData(enriched, user);
      const pdfBuffer = await generateRecommendationsReportPDF(reportData);

      if (sessionId) {
        try {
          await Promise.all([
            upsertSession(sessionId, {
              stage: "recommendations_report_ready",
              consolidationScore: auditState.gspaceConsolidationScore,
              scoreLabel: auditState.scoreLabel,
              estimatedAnnualSavings: auditState.estimatedAnnualSavings,
              auditData: auditState,
            }),
            saveReport(sessionId, reportType, pdfBuffer, reportData),
          ]);
        } catch (err) {
          console.warn("[generate-report] Supabase save error:", err);
        }
      }

      return NextResponse.json({
        success: true,
        reportType,
        pdfBase64: pdfBuffer.toString("base64"),
        reportData,
      });
    }

    // ---- Implementation Guide + SOP Book ($79) ----
    if (reportType === "implementation_guide_sop") {
      const enriched   = buildEnrichedAuditState(auditState, body);
      const reportData = await buildImplementationGuideData(enriched, user);
      const pdfBuffer = await generateImplementationGuidePDF(reportData);

      if (sessionId) {
        try {
          await Promise.all([
            upsertSession(sessionId, {
              stage: "implementation_report_ready",
              auditData: auditState,
            }),
            saveReport(sessionId, reportType, pdfBuffer, reportData),
          ]);
        } catch (err) {
          console.warn("[generate-report] Supabase save error:", err);
        }
      }

      return NextResponse.json({
        success: true,
        reportType,
        pdfBase64: pdfBuffer.toString("base64"),
        reportData,
      });
    }

    return NextResponse.json(
      { success: false, error: "Unknown report type." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack   = err instanceof Error ? err.stack : undefined;
    console.error("[/api/generate-report] Error:", message);
    if (stack) console.error(stack);
    logError({
      context:       `generate-report:${body?.reportType ?? "unknown"}`,
      message,
      stack,
      session_id:    body?.sessionId,
      email:         body?.user?.email,
      business_name: body?.user?.businessName,
    }).catch(() => {});
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
