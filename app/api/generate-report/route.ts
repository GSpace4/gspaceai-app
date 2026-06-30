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
  FreeAnalysisData,
} from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120; // Recommendations report calls Gemini — allow more time

type GenerateReportBody = {
  reportType: "platform_consolidation_snapshot" | "recommendations_report" | "implementation_guide_sop";
  auditState: AuditState;
  user: UserProfile;
  sessionId?: string;
  // v2.0 context fields
  freeIntakeAnswers?: QuestionnaireAnswer[];
  paid29IntakeAnswers?: QuestionnaireAnswer[];
  paid79ChatAnswers?: Array<{ question: string; answer: string }>;
  freeReportContent?: string;
  paid29ReportContent?: string;
  freeAnalysisData?: FreeAnalysisData | null;
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
  googleWorkspaceAlternative?: string;
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
  primaryImpact: string;
  secondaryImpact: string;
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
  "currentGWUsage": "string — estimate as 'Not using', 'Basic', 'Moderate', or 'Advanced' based on which tools they selected and how much of their workflow Google Workspace already covers",
  "softwareInventory": [
    {
      "name": "string",
      "category": "string",
      "estimatedMonthlyCost": number,
      "replacementPotential": "Low" | "Medium" | "High",
      "recommendedAction": "Keep" | "Replace" | "Consolidate" | "Automate" | "Enhance" | "Investigate",
      "googleWorkspaceAlternative": "string — the specific Google Workspace tools that replace or cover this platform (e.g. 'Google Calendar Appointment Schedules', 'Google Drive', 'Google Chat'). Use empty string if no direct replacement exists."
    }
  ],
  "consolidationOpportunities": ["string"],
  "automationOpportunities": ["string"],
  "enhancementOpportunities": ["string"],
  "bottlenecks": ["string"],
  "manualTasks": ["string"],
  "primaryFinding": "string — one emotionally resonant finding headline, specific to this business",
  "primaryImpact": "string — the single most impactful metric for this business, e.g. '9 hrs/mo Recovered' or '$360/yr Savings' or '3 Processes Automated'",
  "secondaryImpact": "string — the secondary metric, e.g. '3 Processes Automated' or 'CRM Visibility Added'",
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
    name:                       item.name,
    category:                   item.category,
    estimatedMonthlyCost:       item.estimatedMonthlyCost ?? 0,
    replacementPotential:       item.replacementPotential ?? "Medium",
    recommendedAction:          item.recommendedAction ?? "Investigate",
    googleWorkspaceAlternative: item.googleWorkspaceAlternative ?? "",
  }));

  // Build consolidation opportunities from the actual inventory rather than the string
  // array so currentTool and googleWorkspaceReplacement contain real names, not placeholders.
  const consolidationOpportunities: ConsolidationOpportunity[] = softwareInventory
    .filter(t => t.recommendedAction === "Replace" || t.recommendedAction === "Consolidate")
    .map(t => ({
      title:                      `${t.name} → ${t.googleWorkspaceAlternative || "Google Workspace"}`,
      currentTool:                t.name,
      googleWorkspaceReplacement: t.googleWorkspaceAlternative || "Google Workspace",
      complexity:                 "Medium" as const,
      priority: (t.replacementPotential === "High" ? "High"
               : t.replacementPotential === "Low"  ? "Low"
               : "Medium") as "High" | "Medium" | "Low",
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
      let capturedAnalysis: IntakeAnalysis | null = null;
      if (body.freeIntakeAnswers?.length) {
        capturedAnalysis = await analyzeIntakeAnswers(body.freeIntakeAnswers);
        if (capturedAnalysis) {
          enriched = buildAuditStateFromAnalysis(enriched, capturedAnalysis);
        }
      }

      // Step 2: derive user profile fields directly from questionnaire answers.
      // Q1/Q2 answer the business type with certainty — don't rely on Gemini to infer it.
      // Q4/Q5 give name and business name. currentGWUsage comes from the analysis result.
      const q1 = body.freeIntakeAnswers?.find(a => a.questionId === "hq1");
      const q2 = body.freeIntakeAnswers?.find(a => a.questionId === "hq2");
      const q4 = body.freeIntakeAnswers?.find(a => a.questionId === "hq4");
      const q5 = body.freeIntakeAnswers?.find(a => a.questionId === "hq5");
      const derivedBusinessType =
        q2?.selectedOptions[0] || q1?.selectedOptions[0] || user.businessType || "";
      const enrichedUser: UserProfile = {
        ...user,
        name:                        q4?.selectedOptions[0] || user.name         || "",
        businessName:                q5?.selectedOptions[0] || user.businessName || "",
        businessType:                derivedBusinessType,
        currentGoogleWorkspaceUsage: capturedAnalysis?.currentGWUsage || user.currentGoogleWorkspaceUsage || "",
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

      // Build FreeAnalysisData to return to client as single source of truth
      const freeAnalysisData: FreeAnalysisData | null = capturedAnalysis ? {
        softwareInventory:               enriched.softwareInventory,
        gspaceConsolidationScore:        enriched.gspaceConsolidationScore,
        scoringInputs:                   capturedAnalysis.scoringInputs,
        estimatedMonthlySoftwareSpend:   enriched.estimatedMonthlySoftwareSpend,
        estimatedReplaceableMonthlySpend: enriched.estimatedReplaceableMonthlySpend,
        estimatedAnnualSavings:          enriched.estimatedAnnualSavings,
        consolidationOpportunities:      capturedAnalysis.consolidationOpportunities ?? [],
        automationOpportunities:         capturedAnalysis.automationOpportunities ?? [],
        enhancementOpportunities:        capturedAnalysis.enhancementOpportunities ?? [],
        bottlenecks:                     capturedAnalysis.bottlenecks ?? [],
        manualTasks:                     capturedAnalysis.manualTasks ?? [],
        primaryFinding:                  capturedAnalysis.primaryFinding ?? "",
        primaryImpact:                   capturedAnalysis.primaryImpact ?? "",
        secondaryImpact:                 capturedAnalysis.secondaryImpact ?? "",
        businessType:                    capturedAnalysis.businessType ?? "",
        currentGWUsage:                  capturedAnalysis.currentGWUsage ?? "",
      } : null;

      return NextResponse.json({
        success: true,
        reportType,
        pdfBase64: pdfBuffer.toString("base64"),
        reportData,
        analysisData: freeAnalysisData,
      });
    }

    // ---- Recommendations Report ($29) ----
    if (reportType === "recommendations_report") {
      const fad = body.freeAnalysisData;

      // Start with the base enrichment (paid29IntakeAnswers in answers[])
      let enriched = buildEnrichedAuditState(auditState, body);

      // If freeAnalysisData is available, use it as the authoritative source
      // for software inventory, score, and spend — so Snapshot and Recommendations
      // Report always show the same tools and the same score.
      if (fad) {
        const consolidationOpps: ConsolidationOpportunity[] = fad.consolidationOpportunities.map(title => ({
          title,
          currentTool: "External tool",
          googleWorkspaceReplacement: "Google Workspace",
          complexity: "Medium" as const,
          priority: "Medium" as const,
        }));
        const automationOpps: AutomationOpportunity[] = fad.automationOpportunities.map(title => ({
          title,
          description: title,
          toolSuggested: "Google Apps Script",
          complexity: "Medium" as const,
        }));
        enriched = {
          ...enriched,
          softwareInventory:                fad.softwareInventory,
          consolidationOpportunities:       consolidationOpps,
          automationOpportunities:          automationOpps,
          bottlenecks:                      fad.bottlenecks,
          manualTasks:                      fad.manualTasks,
          googleWorkspaceOpportunities:     [],
          estimatedMonthlySoftwareSpend:    fad.estimatedMonthlySoftwareSpend,
          estimatedReplaceableMonthlySpend: fad.estimatedReplaceableMonthlySpend,
          estimatedAnnualSavings:           fad.estimatedAnnualSavings,
          gspaceConsolidationScore:         fad.gspaceConsolidationScore,
          scoreLabel:                       getScoreLabel(fad.gspaceConsolidationScore),
        };

        // Prepend a structured context entry so Gemini generates report sections
        // from real tools — not invented ones.
        const toolLines = fad.softwareInventory
          .map(t => `  - ${t.name} (${t.category}) $${t.estimatedMonthlyCost ?? 0}/mo — ${t.recommendedAction}`)
          .join("\n");
        const contextEntry: AuditAnswer = {
          question: "STRUCTURED CONTEXT FROM PLATFORM CONSOLIDATION SNAPSHOT",
          answer: [
            `Software inventory:\n${toolLines}`,
            `GSpace Consolidation Score: ${fad.gspaceConsolidationScore}/100`,
            `Primary finding: ${fad.primaryFinding}`,
            `Consolidation opportunities: ${fad.consolidationOpportunities.join("; ")}`,
            `Automation opportunities: ${fad.automationOpportunities.join("; ")}`,
            `Monthly software spend: $${fad.estimatedMonthlySoftwareSpend}`,
            `Replaceable spend: $${fad.estimatedReplaceableMonthlySpend}`,
            "",
            "Generate the Recommendations Report based on the ACTUAL tools identified above.",
            "Do not invent or hypothesize tools. Only analyze tools from the software inventory.",
            "Every platform in the Software Stack Review table must come from the identified inventory.",
          ].join("\n"),
          timestamp: new Date().toISOString(),
        };
        // Score lock: instruct Gemini to use the exact score, not recalculate
        const scoreLockEntry: AuditAnswer = {
          question: "SCORE LOCK INSTRUCTION",
          answer:   `The GSpace Consolidation Score for this business is exactly ${fad.gspaceConsolidationScore}/100. Use this exact number when referencing the score in the Primary Finding and Executive Summary narrative. Do not calculate or infer a different score. Use ${fad.gspaceConsolidationScore} exactly.`,
          timestamp: new Date().toISOString(),
        };
        enriched = { ...enriched, answers: [contextEntry, scoreLockEntry, ...enriched.answers] };
      }

      console.log(`[generate-report] rec-report score lock — freeAnalysisData.gspaceConsolidationScore: ${fad?.gspaceConsolidationScore ?? "N/A"}, enriched.gspaceConsolidationScore: ${enriched.gspaceConsolidationScore}`);
      const rawReportData = await buildRecommendationsReportData(enriched, user);

      // Fix 3: override Executive Snapshot metrics with freeAnalysisData values
      // so the score and tool count in the Recommendations Report exactly match the Snapshot.
      const reportData = fad ? {
        ...rawReportData,
        softwareInventory:            fad.softwareInventory,
        estimatedMonthlySoftwareSpend: fad.estimatedMonthlySoftwareSpend,
        estimatedAnnualSavings:        fad.estimatedAnnualSavings,
        savings: {
          ...(rawReportData as Record<string, unknown>).savings as object,
          estimatedAnnualSavings:           fad.estimatedAnnualSavings,
          estimatedMonthlySoftwareSpend:    fad.estimatedMonthlySoftwareSpend,
          estimatedReplaceableMonthlySpend: fad.estimatedReplaceableMonthlySpend,
        },
        scoreBreakdown: {
          ...(rawReportData as Record<string, unknown>).scoreBreakdown as object,
          total: fad.gspaceConsolidationScore,
        },
      } : rawReportData;

      const pdfBuffer = await generateRecommendationsReportPDF(
        reportData as Parameters<typeof generateRecommendationsReportPDF>[0]
      );

      if (sessionId) {
        try {
          await Promise.all([
            upsertSession(sessionId, {
              stage: "recommendations_report_ready",
              consolidationScore: fad?.gspaceConsolidationScore ?? auditState.gspaceConsolidationScore,
              scoreLabel: fad ? getScoreLabel(fad.gspaceConsolidationScore) : auditState.scoreLabel,
              estimatedAnnualSavings: fad?.estimatedAnnualSavings ?? auditState.estimatedAnnualSavings,
              auditData: enriched,
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
