// ============================================================
// GSpaceAi — /api/generate-report
// Builds report content, generates PDF, returns base64.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildFreeReportData, buildRecommendationsReportData, buildImplementationGuideData } from "@/src/lib/reportGeneration";
import { generateFreeReportPDF, generateRecommendationsReportPDF, generateImplementationGuidePDF } from "@/src/lib/pdfGeneration";
import { calculateConsolidationScore, getScoreLabel } from "@/src/lib/scoring";
import { upsertSession, saveReport, logError } from "@/src/lib/db";
import type {
  AuditState, UserProfile, QuestionnaireAnswer, AuditAnswer,
  SoftwareInventoryItem, ConsolidationOpportunity, AutomationOpportunity,
} from "@/src/lib/types";

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

// ------------------------------------------------------------
// Gemini analysis types — what the analysis step returns
// ------------------------------------------------------------
type AnalysisSoftwareItem = {
  name: string;
  category: string;
  estimatedMonthlyCost: number;
  replacementPotential: "Low" | "Medium" | "High";
  recommendedAction: "Keep" | "Replace" | "Consolidate" | "Automate" | "Enhance" | "Investigate";
};

type IntakeAnalysis = {
  businessType: string;
  businessCategory: string;
  currentGWUsage: string;
  softwareInventory: AnalysisSoftwareItem[];
  consolidationOpportunities: string[];
  automationOpportunities: string[];
  enhancementOpportunities: string[];
  bottlenecks: string[];
  manualTasks: string[];
  primaryFinding: string;
  estimatedMonthlySoftwareSpend: number;
  estimatedReplaceableMonthlySpend: number;
  googleWorkspaceOpportunities: string[];
  scoringInputs: {
    softwareCount: number;
    hasHighReplacementTools: boolean;
    gwUnderutilization: number;
    manualTaskCount: number;
    processFragmentation: number;
  };
};

function extractJSON(raw: string): string {
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) return block[1].trim();
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s !== -1 && e > s) return raw.slice(s, e + 1);
  return raw.trim();
}

async function analyzeIntakeAnswers(answers: QuestionnaireAnswer[]): Promise<IntakeAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });

  const qaText = answers
    .map(a => `Q: ${a.question}\nA: ${a.selectedOptions.join(", ")}`)
    .join("\n\n");

  const prompt = `You are GSpaceAi analyzing a completed intake questionnaire.
Extract structured business data from these answers and return ONLY valid JSON.

Questionnaire answers:
${qaText}

Return this exact JSON structure:
{
  "businessType": "string — the type of business based on Q1 and Q2 answers",
  "businessCategory": "string — specific category",
  "currentGWUsage": "string — inferred from tool stack and context",
  "softwareInventory": [
    {
      "name": "string",
      "category": "string",
      "estimatedMonthlyCost": number,
      "replacementPotential": "Low" | "Medium" | "High",
      "recommendedAction": "Keep" | "Replace" | "Consolidate" | "Automate" | "Enhance" | "Investigate"
    }
  ],
  "consolidationOpportunities": ["string"],
  "automationOpportunities": ["string"],
  "enhancementOpportunities": ["string"],
  "bottlenecks": ["string"],
  "manualTasks": ["string"],
  "primaryFinding": "string — one emotionally resonant finding headline, specific to this business",
  "estimatedMonthlySoftwareSpend": number,
  "estimatedReplaceableMonthlySpend": number,
  "googleWorkspaceOpportunities": ["string"],
  "scoringInputs": {
    "softwareCount": number,
    "hasHighReplacementTools": boolean,
    "gwUnderutilization": number,
    "manualTaskCount": number,
    "processFragmentation": number
  }
}

For tool costs, use conservative market estimates. For estimatedMonthlyCost of unknown tools use 0.
Base replacement potential on how well Google Workspace covers that tool's core function.`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = JSON.parse(extractJSON(raw)) as IntakeAnalysis;
    return parsed;
  } catch (err) {
    console.error("[generate-report] Intake analysis failed:", err);
    return null;
  }
}

// Map the Gemini analysis result onto a properly structured AuditState
function buildAuditStateFromAnalysis(
  base: AuditState,
  analysis: IntakeAnalysis,
): AuditState {
  const softwareInventory: SoftwareInventoryItem[] = (analysis.softwareInventory ?? []).map(item => ({
    name:                   item.name,
    category:               item.category,
    estimatedMonthlyCost:   item.estimatedMonthlyCost ?? 0,
    replacementPotential:   item.replacementPotential ?? "Medium",
    recommendedAction:      item.recommendedAction ?? "Investigate",
  }));

  const consolidationOpportunities: ConsolidationOpportunity[] = (analysis.consolidationOpportunities ?? []).map(title => ({
    title,
    currentTool:                "External tool",
    googleWorkspaceReplacement: "Google Workspace",
    complexity:                 "Medium" as const,
    priority:                   "Medium" as const,
  }));

  const automationOpportunities: AutomationOpportunity[] = (analysis.automationOpportunities ?? []).map(title => ({
    title,
    description:    title,
    toolSuggested:  "Google Apps Script",
    complexity:     "Medium" as const,
  }));

  const enriched: AuditState = {
    ...base,
    softwareInventory,
    consolidationOpportunities,
    automationOpportunities,
    bottlenecks:                   analysis.bottlenecks ?? [],
    manualTasks:                   analysis.manualTasks ?? [],
    googleWorkspaceOpportunities:  analysis.googleWorkspaceOpportunities ?? [],
    estimatedMonthlySoftwareSpend:    analysis.estimatedMonthlySoftwareSpend ?? 0,
    estimatedReplaceableMonthlySpend: analysis.estimatedReplaceableMonthlySpend ?? 0,
    estimatedAnnualSavings:           (analysis.estimatedReplaceableMonthlySpend ?? 0) * 12,
    auditComplete: true,
  };

  // Calculate score from the now-populated state
  const score = calculateConsolidationScore(enriched);
  return {
    ...enriched,
    gspaceConsolidationScore: score.total,
    scoreLabel:               getScoreLabel(score.total),
  };
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
      // Step 1: run Gemini analysis on intake answers to populate structured AuditState fields
      let enriched = buildEnrichedAuditState(auditState, body);
      if (body.freeIntakeAnswers?.length) {
        const analysis = await analyzeIntakeAnswers(body.freeIntakeAnswers);
        if (analysis) {
          enriched = buildAuditStateFromAnalysis(enriched, analysis);
        }
      }

      // Step 2: extract name/businessName from Q4/Q5 if client didn't already send them
      const q4 = body.freeIntakeAnswers?.find(a => a.questionId === "hq4");
      const q5 = body.freeIntakeAnswers?.find(a => a.questionId === "hq5");
      const enrichedUser: UserProfile = {
        ...user,
        name:         q4?.selectedOptions[0] || user.name         || "",
        businessName: q5?.selectedOptions[0] || user.businessName || "",
      };

      // Step 3: generate report content and PDF
      const reportData = buildFreeReportData(enriched, enrichedUser);
      const pdfBuffer = await generateFreeReportPDF(reportData);

      // Persist session + PDF — awaited so writes complete before function exits
      if (sessionId) {
        try {
          await Promise.all([
            upsertSession(sessionId, {
              name:         enrichedUser.name,
              businessName: enrichedUser.businessName,
              businessType: enrichedUser.businessType,
              industry:     enrichedUser.industry,
              stage:                "free_report_ready",
              consolidationScore:   enriched.gspaceConsolidationScore,
              scoreLabel:           enriched.scoreLabel,
              estimatedAnnualSavings: enriched.estimatedAnnualSavings,
              auditData:            enriched,
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
