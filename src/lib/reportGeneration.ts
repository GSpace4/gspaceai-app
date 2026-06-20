// ============================================================
// GSpaceAi — Report Content Generation
//
// Builds structured report data from audit state.
// Free report: fully deterministic, no Gemini call.
// Paid reports: Gemini generates content, assembled here.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AuditState, UserProfile, SoftwareInventoryItem } from "./types";
import { logError } from "./db";
import { calculateImpact, type ImpactDimension } from "./scoring";
import { calculateConsolidationScore, type ScoreBreakdown } from "./scoring";
import { estimateSavings, type SavingsEstimate } from "./savingsEstimator";

// ============================================================
// Free Report — Platform Consolidation Snapshot
// ============================================================

export type FreeReportData = {
  reportTitle: string;
  reportType: "platform_consolidation_snapshot";
  generatedAt: string;
  user: UserProfile;
  businessSnapshot: {
    businessName: string;
    businessType: string;
    industry: string;
    googleWorkspaceUsage: string;
    toolCount: number;
  };
  softwareInventory: SoftwareInventoryItem[];
  googleWorkspaceSummary: {
    currentUsage: string;
    underutilizationNotes: string[];
  };
  scoreBreakdown: ScoreBreakdown;
  consolidationOpportunities: Array<{
    title: string;
    currentTool: string;
    replacement: string;
    priority: string;
    complexity: string;
    estimatedMonthlySavings: number;
  }>;
  automationOpportunities: Array<{
    title: string;
    description: string;
    toolSuggested: string;
    complexity: string;
  }>;
  savings: SavingsEstimate;
  keyFindings: string[];
  manualTasks: string[];
  primaryImpact: ImpactDimension;
  secondaryImpact: ImpactDimension;
};

export function buildFreeReportData(
  audit: AuditState,
  user: UserProfile
): FreeReportData {
  const scoreBreakdown = calculateConsolidationScore(audit);
  const savings = estimateSavings(audit);
  const { primary: primaryImpact, secondary: secondaryImpact } = calculateImpact(audit, savings);
  const keyFindings = deriveKeyFindings(audit, scoreBreakdown, savings, primaryImpact);

  const consolidationOpportunities = audit.consolidationOpportunities.map((op) => ({
    title: op.title,
    currentTool: op.currentTool,
    replacement: op.googleWorkspaceReplacement,
    priority: op.priority ?? "Medium",
    complexity: op.complexity ?? "Medium",
    estimatedMonthlySavings: op.estimatedMonthlySavings ?? 0,
  }));

  const automationOpportunities = audit.automationOpportunities.map((op) => ({
    title: op.title,
    description: op.description,
    toolSuggested: op.toolSuggested,
    complexity: op.complexity ?? "Medium",
  }));

  const gwUnderutilization = audit.googleWorkspaceOpportunities.slice(0, 5);

  return {
    reportTitle: "Platform Consolidation Snapshot",
    reportType: "platform_consolidation_snapshot",
    generatedAt: new Date().toISOString(),
    user,
    businessSnapshot: {
      businessName: user.businessName || "Your Business",
      businessType: user.businessType || "",
      industry: user.industry || "",
      googleWorkspaceUsage: user.currentGoogleWorkspaceUsage || "Not specified",
      toolCount: audit.softwareInventory.length,
    },
    softwareInventory: audit.softwareInventory,
    googleWorkspaceSummary: {
      currentUsage: user.currentGoogleWorkspaceUsage || "Not specified",
      underutilizationNotes: gwUnderutilization,
    },
    scoreBreakdown,
    consolidationOpportunities,
    automationOpportunities,
    savings,
    keyFindings,
    manualTasks: audit.manualTasks.slice(0, 6),
    primaryImpact,
    secondaryImpact,
  };
}

function deriveKeyFindings(
  audit: AuditState,
  score: ScoreBreakdown,
  savings: SavingsEstimate,
  primaryImpact?: ImpactDimension
): string[] {
  const findings: string[] = [];

  if (primaryImpact) {
    findings.push(
      `The primary opportunity identified for this business is ${primaryImpact.label.toLowerCase()} through Google Workspace consolidation.`
    );
  }

  const replaceCount = audit.softwareInventory.filter(
    (s) => s.recommendedAction === "Replace"
  ).length;
  const consolidateCount = audit.softwareInventory.filter(
    (s) => s.recommendedAction === "Consolidate"
  ).length;
  const keepCount = audit.softwareInventory.filter(
    (s) => s.recommendedAction === "Keep"
  ).length;

  if (replaceCount > 0) {
    findings.push(
      `${replaceCount} tool${replaceCount > 1 ? "s" : ""} identified with strong potential for replacement using Google Workspace — these represent your highest-priority consolidation opportunities.`
    );
  }
  if (consolidateCount > 0) {
    findings.push(
      `${consolidateCount} platform${consolidateCount > 1 ? "s" : ""} can be partially consolidated into Google Workspace, retaining advanced features while reducing overlap.`
    );
  }
  if (savings.estimatedReplaceableMonthlySpend > 0) {
    const qualifier = savings.isEstimated ? "Estimated potential " : "Potential ";
    findings.push(
      `${qualifier}monthly savings of $${savings.estimatedReplaceableMonthlySpend} — approximately $${savings.estimatedAnnualSavings.toLocaleString()} annually — based on the tools and usage described.`
    );
  }
  if (audit.automationOpportunities.length > 0) {
    findings.push(
      `${audit.automationOpportunities.length} automation ${audit.automationOpportunities.length > 1 ? "opportunities" : "opportunity"} identified using Google Apps Script or Gemini that could reduce manual work.`
    );
  }
  if (audit.googleWorkspaceOpportunities.length > 0) {
    findings.push(
      `Google Workspace appears underutilized — ${audit.googleWorkspaceOpportunities.length} expansion ${audit.googleWorkspaceOpportunities.length > 1 ? "opportunities" : "opportunity"} identified that could replace paid tools at no additional cost.`
    );
  }
  if (audit.manualTasks.length > 0 && findings.length < 5) {
    findings.push(
      `${audit.manualTasks.length} manual or repetitive workflow${audit.manualTasks.length > 1 ? "s" : ""} identified that could be streamlined or automated, reducing owner time and dependency.`
    );
  }
  if (keepCount > 0 && findings.length < 5) {
    findings.push(
      `${keepCount} platform${keepCount > 1 ? "s" : ""} recommended to keep — ${keepCount > 1 ? "these tools provide" : "this tool provides"} functionality that justifies the ongoing cost.`
    );
  }

  return findings.slice(0, 5);
}

// ============================================================
// Recommendations Report ($29) — Types
// ============================================================

export type SoftwareStackReviewItem = {
  platform: string;
  recommendation: "Keep" | "Replace" | "Consolidate" | "Automate" | "Enhance" | "Investigate";
  estimatedMonthlyCost: number;
  reason: string;
};

export type PlatformReplacementItem = {
  tool: string;
  currentState: string;
  problem: string;
  businessImpact?: string;
  recommendation: "Keep" | "Replace" | "Consolidate" | "Automate" | "Enhance" | "Investigate";
  googleWorkspaceAlternative: string;
  expectedOutcome: string;
  estimatedMonthlySavings: number;
  complexity: "Low" | "Medium" | "High";
  priority: "High" | "Medium" | "Low";
  // Legacy field — kept for backward compat with any stored reports
  reason?: string;
};

export type GWConsolidationOpportunity = {
  opportunity: string;
  why: string;
  whatChanges: string;
  whyWorkspaceIsAGoodFit?: string;
  expectedBenefit: string;
};

export type RecommendationsGeminiOpportunity = {
  useCase: string;
  currentProcess: string;
  geminiEnhancement: string;
  expectedBenefit: string;
};

export type WorkflowBottleneck = {
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
};

export type ManualWorkReduction = {
  opportunity: string;
  currentProcess: string;
  googleTool: string;
  estimatedTimeSaved: string;
};

export type SavingsTableItem = {
  opportunity: string;
  monthlySavings: number;
  annualSavings: number;
};

export type PriorityMatrixItem = {
  priority: "High" | "Medium" | "Low";
  opportunity: string;
  impact: "High" | "Medium" | "Low";
  difficulty: "Low" | "Medium" | "High";
};

export type PrimaryFinding = {
  headline: string;
  detail: string;
  priority: "High" | "Medium" | "Low";
};

export type TimeRecoveryItem = {
  task: string;
  currentTimeSpent: string;
  recoveredTime: string;
  method: string;
};

export type EnhancementOpportunity = {
  title: string;
  tool: string;
  currentUsage: string;
  enhancement: string;
  expectedBenefit: string;
};

export type RecommendedSystem = {
  name: string;
  purpose: string;
  googleComponents: string[];
  complexity: string;
  expectedImpact: string;
};

export type OpportunityItem = {
  title: string;
  description: string;
  impact: string;
  timeToImplement: string;
};

export type RecommendationsReportData = {
  reportTitle: string;
  reportType: "recommendations_report";
  generatedAt: string;
  user: UserProfile;
  businessSnapshot: FreeReportData["businessSnapshot"];
  softwareInventory: SoftwareInventoryItem[];
  scoreBreakdown: ScoreBreakdown;
  savings: SavingsEstimate;
  keyFindings: string[];
  // Gemini-generated content
  executiveSummary: string;
  softwareStackReview: SoftwareStackReviewItem[];
  platformReplacementAnalysis: PlatformReplacementItem[];
  googleWorkspaceConsolidationOpportunities: GWConsolidationOpportunity[];
  workflowBottlenecks: WorkflowBottleneck[];
  manualWorkReductions: ManualWorkReduction[];
  recommendedSystems: RecommendedSystem[];
  quickWins: OpportunityItem[];
  mediumComplexityProjects: OpportunityItem[];
  advancedOpportunities: OpportunityItem[];
  savingsTable: SavingsTableItem[];
  priorityMatrix: PriorityMatrixItem[];
  primaryFinding: PrimaryFinding;
  timeRecovery: TimeRecoveryItem[];
  enhancementOpportunities: EnhancementOpportunity[];
  geminiOpportunities: RecommendationsGeminiOpportunity[];
  roadmap30Day: string[];
  roadmap60Day: string[];
  roadmap90Day: string[];
};

// ============================================================
// Helpers
// ============================================================

function extractJSONFromText(raw: string): string {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

// ============================================================
// Recommendations Report — Gemini content generation
// ============================================================

async function generateRecommendationsContent(
  audit: AuditState,
  user: UserProfile,
  score: ScoreBreakdown,
  savings: SavingsEstimate
): Promise<Partial<RecommendationsReportData>> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey || apiKey === "PASTE_GEMINI_API_KEY_HERE") {
    return buildRecommendationsFallback(audit, user, score, savings);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });

  const auditSummary = {
    businessName: user.businessName,
    businessType: user.businessType,
    softwareInventory: audit.softwareInventory,
    consolidationOpportunities: audit.consolidationOpportunities,
    automationOpportunities: audit.automationOpportunities,
    manualTasks: audit.manualTasks,
    bottlenecks: audit.bottlenecks,
    googleWorkspaceOpportunities: audit.googleWorkspaceOpportunities,
    consolidationScore: score.total,
    scoreLabel: score.label,
    estimatedAnnualSavings: savings.estimatedAnnualSavings,
  };

  const prompt = `You are a senior Google Workspace consolidation consultant for GSpace Solutions, generating a paid Recommendations Report for a small business owner.

This report must feel like it was produced by a $5,000 business consultant. Every section must be specific, practical, and custom-built for this exact business. Never provide generic advice. Never repeat information across sections. Always explain the WHY behind every recommendation.

Persona: Senior Google Workspace systems consultant. Practical. Direct. Confident. Non-hype. Small-business friendly. Not a generic chatbot.

Writing Standards:
- Business outcome before tool name. Never say "Build a Google Form" — say "Stop manually chasing missing customer information" then explain the Form.
- Never say "Create an Apps Script automation" — say "Eliminate [specific task] and recover [time]" then explain the automation.
- Never say "Use Gemini to improve productivity" — say "Reduce time spent on [specific workflow]" then explain Gemini handles it.
- Every recommendation must answer: What is happening today? Why is it a problem? How does it affect the business? What changes afterward?

Business: ${user.businessName} (${user.businessType})
GSpace Consolidation Score: ${score.total}/100 — ${score.label}
Audit Data: ${JSON.stringify(auditSummary, null, 2)}

Generate ONLY a valid JSON object (no markdown, no extra text, no code blocks) with these exact keys:

{
  "executiveSummary": "2-3 sentences. Reference the specific business name, their GSpace Consolidation Score (${score.total}/100 — ${score.label}), and the top 1-2 consolidation or savings opportunities. Professional consultant tone. No generic filler.",

  "softwareStackReview": [
    {
      "platform": "exact tool name from the audit",
      "recommendation": "Keep|Replace|Consolidate|Automate|Enhance|Investigate",
      "estimatedMonthlyCost": 0,
      "reason": "1 sentence — why this specific recommendation for this specific business"
    }
  ],

  "platformReplacementAnalysis": [
    {
      "tool": "exact tool name",
      "currentState": "how this business currently uses it (1 sentence, specific to their use case)",
      "problem": "specific problem or inefficiency this tool creates — overlap, cost, manual work (1 sentence)",
      "businessImpact": "why this problem matters — time lost, money wasted, or operational risk created for this business (1 sentence)",
      "recommendation": "Replace|Consolidate|Automate|Enhance|Investigate",
      "googleWorkspaceAlternative": "specific GW tools that replace or enhance this — be exact (e.g. Google Calendar appointment schedules + Apps Script confirmations)",
      "expectedOutcome": "what changes after replacement and what the business gains (1 sentence)",
      "estimatedMonthlySavings": 0,
      "complexity": "Low|Medium|High",
      "priority": "High|Medium|Low"
    }
  ],

  "googleWorkspaceConsolidationOpportunities": [
    {
      "opportunity": "short descriptive title",
      "why": "why this opportunity exists for this specific business (1 sentence)",
      "whatChanges": "exactly what gets replaced or moved into Google Workspace (1 sentence)",
      "whyWorkspaceIsAGoodFit": "why Google Workspace is the right fit here — reference their existing GW usage or the specific capability that makes it viable (1 sentence)",
      "expectedBenefit": "specific, measurable benefit — time saved, cost eliminated, process improved (1 sentence)"
    }
  ],

  "workflowBottlenecks": [
    {
      "title": "short bottleneck title",
      "description": "what the bottleneck is and how it affects this business (1-2 sentences, reference their actual workflows)",
      "impact": "High|Medium|Low"
    }
  ],

  "manualWorkReductions": [
    {
      "opportunity": "short title",
      "currentProcess": "what they do manually today (1 sentence, specific to their audit data)",
      "googleTool": "Apps Script|Google Forms|Google Sheets|Gmail|Google Calendar|Looker Studio",
      "estimatedTimeSaved": "e.g. 3-5 hours/week"
    }
  ],

  "recommendedSystems": [
    {
      "name": "system name (e.g. Lead Tracker, Client CRM, Job Scheduling System, Follow-Up System)",
      "purpose": "what problem it solves for this specific business (1 sentence)",
      "googleComponents": ["Google Sheets", "Apps Script"],
      "complexity": "Low|Medium|High",
      "expectedImpact": "specific outcome for this business (1 sentence)"
    }
  ],

  "quickWins": [
    {
      "title": "short title",
      "description": "what to do and why — specific to this business (1-2 sentences)",
      "impact": "expected outcome",
      "timeToImplement": "e.g. 1-2 hours"
    }
  ],

  "mediumComplexityProjects": [
    {
      "title": "short title",
      "description": "what to build or change and why — specific to this business (1-2 sentences)",
      "impact": "expected outcome",
      "timeToImplement": "e.g. 1-2 days"
    }
  ],

  "advancedOpportunities": [
    {
      "title": "short title",
      "description": "longer-term improvement for this business (1-2 sentences)",
      "impact": "expected outcome",
      "timeToImplement": "e.g. 2-4 weeks"
    }
  ],

  "savingsTable": [
    {
      "opportunity": "tool or workflow being replaced or consolidated",
      "monthlySavings": 0,
      "annualSavings": 0
    }
  ],

  "priorityMatrix": [
    {
      "priority": "High|Medium|Low",
      "opportunity": "short action or system name",
      "impact": "High|Medium|Low",
      "difficulty": "Low|Medium|High"
    }
  ],

  "primaryFinding": {
    "headline": "10 words or fewer — the single most important insight for this business",
    "detail": "2-3 sentences on why this matters specifically for this business and what it unlocks",
    "priority": "High|Medium|Low"
  },

  "timeRecovery": [
    {
      "task": "specific manual task from the audit",
      "currentTimeSpent": "e.g. 5-7 hours/week",
      "recoveredTime": "e.g. 4-6 hours/week",
      "method": "specific Google tool or automation that recovers this time (e.g. Apps Script form automation, Gmail filters + labels)"
    }
  ],

  "enhancementOpportunities": [
    {
      "title": "short title",
      "tool": "specific existing tool they already use (GW or paid)",
      "currentUsage": "how this business uses it today — not replacing, just underusing (1 sentence)",
      "enhancement": "specific feature, setting, or workflow addition that immediately improves it (1 sentence)",
      "expectedBenefit": "what gets better for this business (1 sentence)"
    }
  ],

  "geminiOpportunities": [
    {
      "useCase": "specific Gemini use case tied to an actual workflow from this audit (e.g. Draft quote follow-up emails from estimate notes, Summarize weekly job logs for owner review)",
      "currentProcess": "what the owner or team does manually today for this task (1 sentence, specific to their audit data)",
      "geminiEnhancement": "how Gemini addresses this workflow — name the Workspace app context (Gmail, Google Docs, Google Chat, Google Sheets) (1 sentence)",
      "expectedBenefit": "time recovered or administrative burden reduced — quantify where possible (1 sentence)"
    }
  ],

  "roadmap30Day": ["specific action for this business", "specific action 2", "specific action 3"],
  "roadmap60Day": ["specific action 1", "specific action 2"],
  "roadmap90Day": ["specific action 1", "specific action 2"]
}

Rules:
- softwareStackReview: every tool from the audit must appear — no omissions
- platformReplacementAnalysis: only tools with Replace/Consolidate/Automate/Enhance/Investigate — exclude Keep tools; omit if no such tools
- googleWorkspaceConsolidationOpportunities: 2-4 items, each must reference a specific tool from the audit
- workflowBottlenecks: 2-4 items based on actual manual tasks and bottlenecks from the audit data
- manualWorkReductions: 2-4 items targeting the specific manual tasks identified in the audit
- recommendedSystems: 2-4 lightweight GW systems tailored to this business (Lead Tracker, CRM, Job Tracker, etc.)
- quickWins: 3-5 items completable within 30 days
- mediumComplexityProjects: 3-4 items
- advancedOpportunities: 2-3 items
- savingsTable: every tool being replaced or consolidated with realistic savings estimates (not inflated)
- priorityMatrix: 5-8 items covering the top opportunities
- roadmaps: all actions must be specific to this business — no generic advice
- primaryFinding: the single highest-value insight for this specific business — what would a consultant lead with in the first 30 seconds
- timeRecovery: 3-5 items drawn from the actual manual tasks in the audit — currentTimeSpent and recoveredTime must be realistic estimates
- enhancementOpportunities: 2-4 tools they are already using that could immediately do more — focus on underutilized features, not replacements
- geminiOpportunities: minimum 3 items — each must reference an actual workflow from the audit, name the specific Gemini capability (draft, summarize, classify, analyze, prioritize), and name the Workspace app where it happens; never generic "use AI to improve productivity" language
- Never use "use AI to" language — name the tool specifically (Apps Script, Gemini, Google Forms)
- Never repeat the same information across different sections
- Savings estimates must be realistic and labeled as estimates — never guaranteed
- Return ONLY the JSON object`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const jsonStr = extractJSONFromText(raw);
    return JSON.parse(jsonStr) as Partial<RecommendationsReportData>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack : undefined;
    console.error("[reportGeneration] Recommendations Gemini call failed:", err);
    logError({
      context:       "generate-recommendations-content",
      message,
      stack,
      email:         user.email,
      business_name: user.businessName,
    }).catch(() => {});
    return buildRecommendationsFallback(audit, user, score, savings);
  }
}

function buildRecommendationsFallback(
  audit: AuditState,
  user: UserProfile,
  score: ScoreBreakdown,
  savings: SavingsEstimate
): Partial<RecommendationsReportData> {
  const replaceItems = audit.softwareInventory.filter(i => i.recommendedAction === "Replace" || i.recommendedAction === "Consolidate");

  return {
    executiveSummary: `${user.businessName} has a GSpace Consolidation Score of ${score.total}/100 (${score.label}). Based on the audit, there are meaningful opportunities to consolidate software and reduce recurring costs using Google Workspace.`,

    softwareStackReview: audit.softwareInventory.map(item => ({
      platform: item.name,
      recommendation: (item.recommendedAction ?? "Investigate") as SoftwareStackReviewItem["recommendation"],
      estimatedMonthlyCost: item.estimatedMonthlyCost ?? 0,
      reason: item.notes ?? "Evaluate based on usage depth and overlap with Google Workspace.",
    })),

    platformReplacementAnalysis: replaceItems.map(item => ({
      tool: item.name,
      currentState: item.usedFor ?? "In active use",
      problem: `Potential overlap with Google Workspace functionality that may be available at no additional cost.`,
      businessImpact: `Paying for a capability that Google Workspace already covers adds unnecessary monthly overhead and fragments the team's workflow.`,
      recommendation: (item.recommendedAction ?? "Investigate") as PlatformReplacementItem["recommendation"],
      googleWorkspaceAlternative: item.googleWorkspaceAlternative ?? "",
      expectedOutcome: `Consolidating into Google Workspace could eliminate the $${item.estimatedMonthlyCost ?? 0}/mo subscription.`,
      estimatedMonthlySavings: item.estimatedMonthlyCost ?? 0,
      complexity: (item.replacementPotential === "High" ? "Low" : item.replacementPotential === "Low" ? "High" : "Medium") as "Low" | "Medium" | "High",
      priority: (item.importance === "Low" ? "High" : item.importance === "Critical" ? "Low" : "Medium") as "High" | "Medium" | "Low",
    })),

    googleWorkspaceConsolidationOpportunities: audit.consolidationOpportunities.slice(0, 4).map(op => ({
      opportunity: op.title,
      why: `${op.currentTool} functionality overlaps with what Google Workspace can provide.`,
      whatChanges: `Replace ${op.currentTool} with ${op.googleWorkspaceReplacement}.`,
      whyWorkspaceIsAGoodFit: `Google Workspace already handles this workflow natively — no new tool required, just activating what is already in the plan.`,
      expectedBenefit: `Estimated savings of $${op.estimatedMonthlySavings ?? 0}/mo while reducing platform sprawl.`,
    })),

    workflowBottlenecks: audit.bottlenecks.slice(0, 4).map(b => ({
      title: b.length > 60 ? b.slice(0, 57) + "..." : b,
      description: b,
      impact: "Medium" as const,
    })),

    manualWorkReductions: audit.manualTasks.slice(0, 4).map(task => ({
      opportunity: task.length > 50 ? task.slice(0, 47) + "..." : task,
      currentProcess: task,
      googleTool: "Apps Script",
      estimatedTimeSaved: "2-4 hours/week",
    })),

    recommendedSystems: [],

    quickWins: audit.consolidationOpportunities.filter(o => o.complexity === "Low").slice(0, 4).map(o => ({
      title: o.title,
      description: `Replace ${o.currentTool} with ${o.googleWorkspaceReplacement} to eliminate the subscription.`,
      impact: `Potential savings of $${o.estimatedMonthlySavings ?? 0}/mo`,
      timeToImplement: "1-4 hours",
    })),

    mediumComplexityProjects: audit.consolidationOpportunities.filter(o => o.complexity === "Medium").slice(0, 4).map(o => ({
      title: o.title,
      description: `Consolidate ${o.currentTool} into ${o.googleWorkspaceReplacement}.`,
      impact: `Potential savings of $${o.estimatedMonthlySavings ?? 0}/mo`,
      timeToImplement: "1-2 days",
    })),

    advancedOpportunities: audit.consolidationOpportunities.filter(o => o.complexity === "High").slice(0, 3).map(o => ({
      title: o.title,
      description: `Long-term consolidation of ${o.currentTool} into ${o.googleWorkspaceReplacement}.`,
      impact: `Potential savings of $${o.estimatedMonthlySavings ?? 0}/mo`,
      timeToImplement: "2-4 weeks",
    })),

    savingsTable: replaceItems.filter(i => (i.estimatedMonthlyCost ?? 0) > 0).map(item => ({
      opportunity: item.name,
      monthlySavings: item.estimatedMonthlyCost ?? 0,
      annualSavings: (item.estimatedMonthlyCost ?? 0) * 12,
    })),

    priorityMatrix: audit.consolidationOpportunities.slice(0, 6).map(op => ({
      priority: (op.priority ?? "Medium") as PriorityMatrixItem["priority"],
      opportunity: op.title,
      impact: "High" as const,
      difficulty: (op.complexity ?? "Medium") as PriorityMatrixItem["difficulty"],
    })),

    primaryFinding: {
      headline: `${user.businessName} is paying for overlap that Google Workspace already covers`,
      detail: `With a GSpace Consolidation Score of ${score.total}/100, there are clear opportunities to eliminate redundant paid tools. The fastest wins are in the lowest-complexity replacements that can be completed within the first 30 days.`,
      priority: score.total >= 70 ? "High" : score.total >= 40 ? "Medium" : "Low",
    } as PrimaryFinding,

    timeRecovery: audit.manualTasks.slice(0, 4).map(task => ({
      task: task.length > 60 ? task.slice(0, 57) + "..." : task,
      currentTimeSpent: "3-5 hours/week",
      recoveredTime: "2-4 hours/week",
      method: "Apps Script automation",
    })),

    enhancementOpportunities: audit.googleWorkspaceOpportunities.slice(0, 3).map(opp => ({
      title: opp.length > 50 ? opp.slice(0, 47) + "..." : opp,
      tool: "Google Workspace",
      currentUsage: "Currently using a subset of available features.",
      enhancement: opp,
      expectedBenefit: "Reduces reliance on paid third-party tools at no additional cost.",
    })),

    geminiOpportunities: [
      {
        useCase: "Draft client follow-up messages from meeting or job notes",
        currentProcess: "Owner writes follow-up emails manually after each customer interaction.",
        geminiEnhancement: "Gemini in Gmail drafts follow-up messages based on notes stored in Google Docs or Gmail threads.",
        expectedBenefit: "Reduces estimated follow-up writing time by 1-2 hours per week.",
      },
      {
        useCase: "Summarize weekly operations into an owner briefing",
        currentProcess: "Owner manually reviews activity across tools to understand what happened each week.",
        geminiEnhancement: "Gemini in Google Docs summarizes job notes, activity logs, or sheet data into a weekly owner briefing.",
        expectedBenefit: "Reduces weekly review time and gives the owner a consistent view of operations without manual compilation.",
      },
      {
        useCase: "Generate customer-facing status updates from job details",
        currentProcess: "Team members write status updates or completion notices from scratch for each job or project.",
        geminiEnhancement: "Gemini in Gmail or Google Docs generates professional customer communications from job completion notes.",
        expectedBenefit: "Saves team writing time and improves consistency of customer-facing communication.",
      },
    ],

    roadmap30Day: ["Audit current Google Workspace plan and confirm all tools are provisioned", "Cancel or downgrade the lowest-value, easiest-to-replace tools"],
    roadmap60Day: ["Build replacement systems in Google Workspace for medium-complexity tools"],
    roadmap90Day: ["Review and optimize new systems", "Evaluate remaining advanced consolidation opportunities"],
  };
}

// ============================================================
// Recommendations Report — Builder
// ============================================================

export async function buildRecommendationsReportData(
  audit: AuditState,
  user: UserProfile
): Promise<RecommendationsReportData> {
  const scoreBreakdown = calculateConsolidationScore(audit);
  const savings = estimateSavings(audit);
  const keyFindings = deriveKeyFindings(audit, scoreBreakdown, savings);

  const ai = await generateRecommendationsContent(audit, user, scoreBreakdown, savings);

  return {
    reportTitle: "Recommendations Report",
    reportType: "recommendations_report",
    generatedAt: new Date().toISOString(),
    user,
    businessSnapshot: {
      businessName: user.businessName || "Your Business",
      businessType: user.businessType || "",
      industry: user.industry || "",
      googleWorkspaceUsage: user.currentGoogleWorkspaceUsage || "Not specified",
      toolCount: audit.softwareInventory.length,
    },
    softwareInventory: audit.softwareInventory,
    scoreBreakdown,
    savings,
    keyFindings,
    executiveSummary: ai.executiveSummary ?? "",
    softwareStackReview: ai.softwareStackReview ?? [],
    platformReplacementAnalysis: ai.platformReplacementAnalysis ?? [],
    googleWorkspaceConsolidationOpportunities: ai.googleWorkspaceConsolidationOpportunities ?? [],
    workflowBottlenecks: ai.workflowBottlenecks ?? [],
    manualWorkReductions: ai.manualWorkReductions ?? [],
    recommendedSystems: ai.recommendedSystems ?? [],
    quickWins: ai.quickWins ?? [],
    mediumComplexityProjects: ai.mediumComplexityProjects ?? [],
    advancedOpportunities: ai.advancedOpportunities ?? [],
    savingsTable: ai.savingsTable ?? [],
    priorityMatrix: ai.priorityMatrix ?? [],
    primaryFinding: ai.primaryFinding ?? { headline: "", detail: "", priority: "Medium" },
    timeRecovery: ai.timeRecovery ?? [],
    enhancementOpportunities: ai.enhancementOpportunities ?? [],
    geminiOpportunities: ai.geminiOpportunities ?? [],
    roadmap30Day: ai.roadmap30Day ?? [],
    roadmap60Day: ai.roadmap60Day ?? [],
    roadmap90Day: ai.roadmap90Day ?? [],
  };
}

// ============================================================
// Implementation Guide + SOP Book ($79) — Types
// ============================================================

export type FutureStateArchitecture = {
  currentState: string;
  futureState: string;
};

export type SystemBuildGuide = {
  systemName: string;
  currentState?: string;
  problemSolved?: string;
  purpose: string;
  toolsNeeded: string[];
  setupSteps: string[];
  expectedOutcome: string;
  ownerBenefit?: string;
  teamBenefit?: string;
};

export type AppsScriptOpportunity = {
  automation: string;
  trigger: string;
  outcome: string;
};

export type GeminiOpportunity = {
  useCase: string;
  benefit: string;
};

export type MaintenanceSOPs = {
  monthly: string[];
  quarterly: string[];
  annual: string[];
};

// Kept for backward compat
export type ImplementationPhase = {
  phase: string;
  title: string;
  description: string;
  googleWorkspaceSetup: string;
  toolsAffected: string[];
  timeEstimate: string;
  difficulty: "Easy" | "Medium" | "Advanced";
};

export type AutomationBlueprint = {
  title: string;
  problem: string;
  solution: string;
  googleTool: string;
  estimatedTimeSaved: string;
  complexity: "Low" | "Medium" | "High";
};

export type SOPDocument = {
  title: string;
  purpose: string;
  steps: string[];
};

export type ImplementationGuideData = {
  reportTitle: string;
  reportType: "implementation_guide_sop";
  generatedAt: string;
  user: UserProfile;
  businessSnapshot: FreeReportData["businessSnapshot"];
  softwareInventory: SoftwareInventoryItem[];
  scoreBreakdown: ScoreBreakdown;
  savings: SavingsEstimate;
  // Gemini-generated content
  executiveSummary: string;
  futureStateArchitecture: FutureStateArchitecture;
  implementationSequence: string[];
  systemBuildGuides: SystemBuildGuide[];
  appsScriptOpportunities: AppsScriptOpportunity[];
  geminiOpportunities: GeminiOpportunity[];
  ownerSOPs: SOPDocument[];
  employeeSOPs: SOPDocument[];
  maintenanceSOPs: MaintenanceSOPs;
  testingChecklist: string[];
  launchChecklist: string[];
  primaryFinding: PrimaryFinding;
  timeRecovery: TimeRecoveryItem[];
  enhancementOpportunities: EnhancementOpportunity[];
  googleWorkspaceApps: string[];
  estimatedCompletionWeeks: number;
  // Legacy fields — kept so any stored reports render without error
  implementationPhases: ImplementationPhase[];
  automationBlueprints: AutomationBlueprint[];
  sopDocuments: SOPDocument[];
  buildSequence: string[];
};

// ============================================================
// Implementation Guide — Gemini content generation
// ============================================================

async function generateImplementationGuideContent(
  audit: AuditState,
  user: UserProfile,
  score: ScoreBreakdown,
  savings: SavingsEstimate
): Promise<Partial<ImplementationGuideData>> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey || apiKey === "PASTE_GEMINI_API_KEY_HERE") {
    return buildImplementationGuideFallback(audit, user, score, savings);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });

  const auditSummary = {
    businessName: user.businessName,
    businessType: user.businessType,
    softwareInventory: audit.softwareInventory,
    consolidationOpportunities: audit.consolidationOpportunities,
    automationOpportunities: audit.automationOpportunities,
    manualTasks: audit.manualTasks,
    bottlenecks: audit.bottlenecks,
    googleWorkspaceOpportunities: audit.googleWorkspaceOpportunities,
    consolidationScore: score.total,
    scoreLabel: score.label,
    estimatedAnnualSavings: savings.estimatedAnnualSavings,
  };

  const prompt = `You are a senior Google Workspace implementation consultant for GSpace Solutions, creating a paid Implementation Guide + SOP Book for a small business owner.

This guide must feel like it was produced by a $5,000 business consultant. It must be practical and implementation-oriented — the owner should be able to follow it without technical expertise. Every section must be specific to this exact business. No generic advice.

Persona: Senior Google Workspace systems consultant. Practical. Direct. Confident. Small-business friendly. You specialize in: Google Sheets, Google Forms, Google Docs, Google Drive, Gmail, Google Calendar, Google Sites, Apps Script, Gemini, Looker Studio, lightweight CRM systems, workflow automation.

Writing Standards:
- Business outcome before tool name. Never say "Build a Google Form" — say "Stop losing job requests to untracked inboxes" then explain the Form.
- Never say "Create an Apps Script automation" — say "Eliminate [specific task] and recover [time]" then explain the automation.
- Never say "Use Gemini to improve productivity" — say "Reduce time spent on [specific workflow]" then explain Gemini handles it.
- Every system and SOP step must answer: What is happening today? Why is it a problem? What does this step accomplish for the business?

Business: ${user.businessName} (${user.businessType})
GSpace Consolidation Score: ${score.total}/100 — ${score.label}
Audit Data: ${JSON.stringify(auditSummary, null, 2)}

Generate ONLY a valid JSON object (no markdown, no extra text, no code blocks) with these exact keys:

{
  "executiveSummary": "2-3 sentences describing the implementation plan for this specific business. Reference their actual tools and the specific systems being built. Professional consultant tone.",

  "futureStateArchitecture": {
    "currentState": "1-2 sentences describing how the business operates today — name their actual paid tools, the manual tasks, and the fragmentation. Be specific.",
    "futureState": "1-2 sentences describing the Google Workspace setup after implementation. Name the specific systems being built for this business."
  },

  "implementationSequence": [
    "Step 1: specific action for this business",
    "Step 2: specific action",
    "Step 3: specific action",
    "Step 4: specific action",
    "Step 5: specific action",
    "Step 6: specific action",
    "Step 7: specific action",
    "Step 8: specific action"
  ],

  "systemBuildGuides": [
    {
      "systemName": "e.g. Lead Tracker, Client CRM, Job Scheduling System, Follow-Up System, Invoice Tracker",
      "currentState": "what the business does today without this system — the manual process or tool gap this replaces (1 sentence)",
      "problemSolved": "the specific operational problem this system eliminates for this business (1 sentence)",
      "purpose": "what specific problem this solves for this business (1 sentence)",
      "toolsNeeded": ["Google Sheets", "Google Forms", "Apps Script"],
      "setupSteps": [
        "Step 1: specific setup action for this system",
        "Step 2: ...",
        "Step 3: ...",
        "Step 4: ...",
        "Step 5: ..."
      ],
      "expectedOutcome": "what the business gains from this system (1 sentence)",
      "ownerBenefit": "what changes for the owner specifically — time saved, visibility gained, or manual dependency eliminated (1 sentence)",
      "teamBenefit": "what changes for the team or employees — clarity, consistency, or reduced friction (1 sentence; use 'N/A — solo operator' if no team members)"
    }
  ],

  "appsScriptOpportunities": [
    {
      "automation": "short name of the automation (e.g. Lead Notification Bot, Appointment Confirmation Email)",
      "trigger": "what triggers it (e.g. Google Form submission, Daily time-based trigger, Email received with label)",
      "outcome": "what it does automatically — be specific to this business (1 sentence)"
    }
  ],

  "geminiOpportunities": [
    {
      "useCase": "specific Gemini use case for this business type (e.g. Draft follow-up emails from client notes, Summarize weekly job log)",
      "benefit": "what time or effort it saves for this business (1 sentence)"
    }
  ],

  "ownerSOPs": [
    {
      "title": "SOP title (e.g. New Lead Intake SOP, Quote Request SOP, Weekly Review SOP)",
      "purpose": "what owner workflow this standardizes (1 sentence)",
      "steps": [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ...",
        "Step 4: ...",
        "Step 5: ..."
      ]
    }
  ],

  "employeeSOPs": [
    {
      "title": "SOP title (e.g. Job Completion Checklist SOP, Customer Communication SOP)",
      "purpose": "what employee workflow this standardizes (1 sentence)",
      "steps": [
        "Step 1: ...",
        "Step 2: ...",
        "Step 3: ...",
        "Step 4: ...",
        "Step 5: ..."
      ]
    }
  ],

  "maintenanceSOPs": {
    "monthly": [
      "specific monthly maintenance task for this business",
      "specific monthly maintenance task 2",
      "specific monthly maintenance task 3"
    ],
    "quarterly": [
      "specific quarterly maintenance task for this business",
      "specific quarterly maintenance task 2",
      "specific quarterly maintenance task 3"
    ],
    "annual": [
      "specific annual maintenance task for this business",
      "specific annual maintenance task 2"
    ]
  },

  "testingChecklist": [
    "specific test item referencing a system built for this business",
    "specific test item 2 referencing an automation for this business",
    "specific test item 3",
    "specific test item 4",
    "specific test item 5"
  ],

  "launchChecklist": [
    "specific launch item referencing an actual tool being cancelled",
    "specific launch item referencing a SOP being activated",
    "specific launch item 3",
    "specific launch item 4",
    "specific launch item 5"
  ],

  "primaryFinding": {
    "headline": "10 words or fewer — the single most important implementation insight for this business",
    "detail": "2-3 sentences on the specific blocker or opportunity this implementation plan addresses for this business",
    "priority": "High|Medium|Low"
  },

  "timeRecovery": [
    {
      "task": "specific manual task from the audit that this implementation eliminates",
      "currentTimeSpent": "e.g. 5-7 hours/week",
      "recoveredTime": "e.g. 4-6 hours/week",
      "method": "specific system or automation being built (e.g. Apps Script Lead Notification Bot, Google Forms intake form)"
    }
  ],

  "enhancementOpportunities": [
    {
      "title": "short title",
      "tool": "specific existing tool they already use",
      "currentUsage": "how they use it today — they are keeping it, just not using it fully (1 sentence)",
      "enhancement": "specific feature or setup change that immediately improves their workflow (1 sentence)",
      "expectedBenefit": "concrete improvement for this business (1 sentence)"
    }
  ],

  "googleWorkspaceApps": ["Google Sheets", "Google Calendar", "Apps Script"],

  "estimatedCompletionWeeks": 6
}

Rules:
- implementationSequence: 8-12 steps, logical order, quick wins first, complex last — all specific to this business
- systemBuildGuides: 2-4 systems tailored to this business's actual needs from the audit (e.g. if they track jobs, build a Job Tracker; if they have leads, build a Lead Tracker); each must include currentState (the manual gap being replaced), problemSolved, ownerBenefit, and teamBenefit
- appsScriptOpportunities: 3-5 automations based on the actual manual tasks and bottlenecks from the audit — be specific, not generic
- geminiOpportunities: 2-4 use cases specific to this business type — name the actual workflow (e.g. "Draft quote follow-up emails from client inquiry notes")
- ownerSOPs: 2-3 SOPs for owner/admin workflows, 5-7 steps each — specific to their actual processes
- employeeSOPs: 1-3 SOPs for team workflows (omit or leave empty array if they appear to be a solo operator), 5-7 steps each
- maintenanceSOPs: realistic tasks for this specific business — not generic IT maintenance
- testingChecklist: 5-8 items referencing the specific systems being built
- launchChecklist: 5-8 items including specific tool names to cancel and systems to activate
- googleWorkspaceApps: only list the specific GW tools being used in this implementation
- estimatedCompletionWeeks: realistic 4-12 weeks based on complexity
- primaryFinding: the single most important thing this implementation plan unlocks for this business — what would a consultant say first
- timeRecovery: 3-5 items tied to actual manual tasks in the audit — show the before/after time cost with the specific system being built as the method
- enhancementOpportunities: 2-4 tools they are already keeping that could immediately do more — not replacements, just underutilized features
- maintenanceSOPs, testingChecklist, launchChecklist: all items must be specific to this business's tools and systems — no generic IT statements
- Never say "use AI to" — say "use Gemini to" specifically
- Never provide generic advice — every item must reference this business's actual tools or workflows
- Return ONLY the JSON object`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const jsonStr = extractJSONFromText(raw);
    return JSON.parse(jsonStr) as Partial<ImplementationGuideData>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack   = err instanceof Error ? err.stack : undefined;
    console.error("[reportGeneration] Implementation Guide Gemini call failed:", err);
    logError({
      context:       "generate-implementation-guide-content",
      message,
      stack,
      email:         user.email,
      business_name: user.businessName,
    }).catch(() => {});
    return buildImplementationGuideFallback(audit, user, score, savings);
  }
}

function buildImplementationGuideFallback(
  audit: AuditState,
  user: UserProfile,
  score: ScoreBreakdown,
  savings: SavingsEstimate
): Partial<ImplementationGuideData> {
  const easyOps  = audit.consolidationOpportunities.filter(o => o.complexity === "Low");
  const medOps   = audit.consolidationOpportunities.filter(o => o.complexity === "Medium");
  const hardOps  = audit.consolidationOpportunities.filter(o => o.complexity === "High");
  const toolNames = audit.softwareInventory.map(t => t.name).join(", ");

  // Build legacy implementationPhases for fallback rendering
  const phases: ImplementationPhase[] = [];
  if (easyOps.length > 0) {
    phases.push({
      phase: "Phase 1", title: "Quick Consolidation Wins",
      description: `Address the lowest-complexity consolidation opportunities first: ${easyOps.map(o => o.currentTool).join(", ")}.`,
      googleWorkspaceSetup: easyOps.map(o => o.googleWorkspaceReplacement).filter(Boolean).join(", "),
      toolsAffected: easyOps.map(o => o.currentTool),
      timeEstimate: "1–2 days", difficulty: "Easy",
    });
  }
  if (medOps.length > 0) {
    phases.push({
      phase: `Phase ${phases.length + 1}`, title: "Medium Complexity Consolidations",
      description: `Migrate medium-effort tools: ${medOps.map(o => o.currentTool).join(", ")}.`,
      googleWorkspaceSetup: medOps.map(o => o.googleWorkspaceReplacement).filter(Boolean).join(", "),
      toolsAffected: medOps.map(o => o.currentTool),
      timeEstimate: "1–2 weeks", difficulty: "Medium",
    });
  }
  if (hardOps.length > 0) {
    phases.push({
      phase: `Phase ${phases.length + 1}`, title: "Advanced Integrations",
      description: `Tackle the most complex consolidations: ${hardOps.map(o => o.currentTool).join(", ")}.`,
      googleWorkspaceSetup: hardOps.map(o => o.googleWorkspaceReplacement).filter(Boolean).join(", "),
      toolsAffected: hardOps.map(o => o.currentTool),
      timeEstimate: "2–4 weeks", difficulty: "Advanced",
    });
  }

  const automationBlueprints: AutomationBlueprint[] = audit.automationOpportunities.slice(0, 4).map(op => ({
    title: op.title, problem: op.description,
    solution: `Use ${op.toolSuggested} to automate this workflow and reduce manual work.`,
    googleTool: op.toolSuggested, estimatedTimeSaved: "2–5 hours/week",
    complexity: op.complexity ?? "Medium",
  }));

  const sopDocuments: SOPDocument[] = [
    {
      title: "New Software Onboarding SOP",
      purpose: "Standardize how new tools are evaluated before being added to the stack.",
      steps: [
        "Step 1: Document the business need and the problem being solved.",
        "Step 2: Check whether an existing Google Workspace tool can address the need.",
        "Step 3: If a new tool is required, evaluate cost, integration, and overlap.",
        "Step 4: Run a 30-day trial before committing to a paid subscription.",
        "Step 5: Document the tool in the software inventory in Google Sheets.",
      ],
    },
    {
      title: "Monthly Software Review SOP",
      purpose: "Review all active subscriptions monthly to eliminate unused or redundant tools.",
      steps: [
        "Step 1: Pull the software inventory from Google Sheets.",
        "Step 2: Check usage for each tool over the past 30 days.",
        "Step 3: Flag any tools not used in the past 30 days for cancellation review.",
        "Step 4: Identify any tools with overlapping functionality.",
        "Step 5: Cancel or downgrade subscriptions that don't pass the review.",
        "Step 6: Update the inventory with changes and note the review date.",
      ],
    },
  ];

  return {
    executiveSummary: `${user.businessName} is ready to execute a structured consolidation plan (GSpace Score: ${score.total}/100). This guide provides a phased implementation approach to reduce software spend by an estimated $${savings.estimatedAnnualSavings.toLocaleString()}/year.`,

    futureStateArchitecture: {
      currentState: `${user.businessName} currently uses ${toolNames || "multiple paid tools"} with manual processes and fragmented workflows.`,
      futureState: `After implementation, ${user.businessName} will run key operations through Google Workspace, eliminating subscription overlap and standardizing workflows with Apps Script automations.`,
    },

    implementationSequence: [
      "Step 1: Document all current software subscriptions and monthly costs.",
      "Step 2: Confirm Google Workspace plan tier and enable needed tools.",
      "Step 3: Build replacement systems in Google Sheets and Google Forms.",
      "Step 4: Migrate data from tools being replaced.",
      "Step 5: Run parallel systems for 2 weeks before cancelling replaced tools.",
      "Step 6: Build Apps Script automation workflows.",
      "Step 7: Create SOPs and train team on new workflows.",
      "Step 8: Cancel replaced subscriptions after confirming migration is stable.",
      "Step 9: Schedule monthly review to monitor adoption and savings.",
    ],

    systemBuildGuides: [
      {
        systemName: "Software Inventory Tracker",
        currentState: "Subscriptions are tracked informally — in email receipts, spreadsheets, or from memory — with no single source of truth.",
        problemSolved: "No visibility into total software spend means cancelled tools go unnoticed and duplicate subscriptions persist.",
        purpose: "Track all active subscriptions, costs, and usage in one place.",
        toolsNeeded: ["Google Sheets"],
        setupSteps: [
          "Step 1: Create a new Google Sheet named 'Software Inventory'.",
          "Step 2: Add columns: Tool Name, Category, Monthly Cost, Used For, Recommendation, Date Reviewed.",
          "Step 3: Enter all current tools from the audit.",
          "Step 4: Add a summary row showing total monthly and annual spend.",
          "Step 5: Share with any team members who manage subscriptions.",
        ],
        expectedOutcome: "Full visibility into software spend with a single source of truth.",
        ownerBenefit: "Owner sees total monthly spend and flags redundant tools without hunting through email receipts.",
        teamBenefit: "Team knows which tools are approved and which are being retired — no confusion about what to use.",
      },
    ],

    appsScriptOpportunities: audit.automationOpportunities.slice(0, 4).map(op => ({
      automation: op.title,
      trigger: "Manual trigger or form submission",
      outcome: op.description,
    })),

    geminiOpportunities: [
      { useCase: "Draft follow-up emails from client notes in Google Docs", benefit: "Saves 1-2 hours/week on customer communication drafting." },
      { useCase: "Summarize weekly operational notes into action items", benefit: "Reduces time spent on weekly review preparation." },
    ],

    ownerSOPs: sopDocuments,
    employeeSOPs: [],

    maintenanceSOPs: {
      monthly: [
        "Review active software subscriptions and cancel any replaced tools.",
        "Check Apps Script automation logs for errors.",
        "Review new entries in tracking sheets for accuracy.",
      ],
      quarterly: [
        "Audit Google Workspace storage and sharing permissions.",
        "Review consolidation score and identify new opportunities.",
      ],
      annual: [
        "Review Google Workspace plan tier and user licenses.",
        "Full software stack review against current business needs.",
      ],
    },

    testingChecklist: [
      "Confirm all Google Forms submit correctly to connected Sheets.",
      "Test any Apps Script automations with sample data.",
      "Verify email notifications send to the correct recipients.",
      "Confirm data migrated from replaced tools is accessible in Google Drive.",
      "Test access permissions for any shared Sheets or Docs.",
    ],

    launchChecklist: [
      "Cancel subscriptions for all confirmed replaced tools.",
      "Notify team of new SOPs and where to find them.",
      "Confirm Google Workspace tools are bookmarked or pinned for team access.",
      "Run first monthly software review using the new inventory tracker.",
      "Document any issues discovered in the first 30 days.",
    ],

    primaryFinding: {
      headline: `${user.businessName} has manual workflows ready to automate`,
      detail: `The audit identified ${audit.manualTasks.length} manual task${audit.manualTasks.length !== 1 ? "s" : ""} that can be automated using Google Apps Script and native Google Workspace tools. Eliminating these reduces owner time and removes single points of failure from day-to-day operations.`,
      priority: audit.manualTasks.length >= 3 ? "High" : "Medium",
    } as PrimaryFinding,

    timeRecovery: audit.manualTasks.slice(0, 4).map(task => ({
      task: task.length > 60 ? task.slice(0, 57) + "..." : task,
      currentTimeSpent: "3-5 hours/week",
      recoveredTime: "2-4 hours/week",
      method: "Apps Script automation or Google Forms workflow",
    })),

    enhancementOpportunities: audit.googleWorkspaceOpportunities.slice(0, 3).map(opp => ({
      title: opp.length > 50 ? opp.slice(0, 47) + "..." : opp,
      tool: "Google Workspace",
      currentUsage: "Currently using a subset of available features.",
      enhancement: opp,
      expectedBenefit: "Replaces a paid tool or manual step at no additional cost.",
    })),

    googleWorkspaceApps: ["Google Sheets", "Google Calendar", "Google Forms", "Gmail", "Google Drive", "Apps Script"],
    estimatedCompletionWeeks: Math.min(Math.max(phases.length * 2, 4), 12),

    // Legacy fields
    implementationPhases: phases,
    automationBlueprints,
    sopDocuments,
    buildSequence: [
      "Step 1: Document all current software subscriptions and monthly costs.",
      "Step 2: Set up Google Workspace admin and review current plan tier.",
      "Step 3: Enable and configure the Google Workspace tools identified in Phase 1.",
      "Step 4: Migrate data from tools being replaced.",
      "Step 5: Run parallel systems for 2 weeks before cancelling replaced tools.",
      "Step 6: Build automation workflows using Apps Script.",
      "Step 7: Create and train team on new SOPs.",
      "Step 8: Cancel replaced subscriptions after successful migration.",
      "Step 9: Schedule a monthly review to monitor adoption and savings.",
    ],
  };
}

// ============================================================
// Implementation Guide — Builder
// ============================================================

export async function buildImplementationGuideData(
  audit: AuditState,
  user: UserProfile
): Promise<ImplementationGuideData> {
  const scoreBreakdown = calculateConsolidationScore(audit);
  const savings = estimateSavings(audit);

  const ai = await generateImplementationGuideContent(audit, user, scoreBreakdown, savings);

  return {
    reportTitle: "Implementation Guide + SOP Book",
    reportType: "implementation_guide_sop",
    generatedAt: new Date().toISOString(),
    user,
    businessSnapshot: {
      businessName: user.businessName || "Your Business",
      businessType: user.businessType || "",
      industry: user.industry || "",
      googleWorkspaceUsage: user.currentGoogleWorkspaceUsage || "Not specified",
      toolCount: audit.softwareInventory.length,
    },
    softwareInventory: audit.softwareInventory,
    scoreBreakdown,
    savings,
    executiveSummary: ai.executiveSummary ?? "",
    futureStateArchitecture: ai.futureStateArchitecture ?? { currentState: "", futureState: "" },
    implementationSequence: ai.implementationSequence ?? [],
    systemBuildGuides: ai.systemBuildGuides ?? [],
    appsScriptOpportunities: ai.appsScriptOpportunities ?? [],
    geminiOpportunities: ai.geminiOpportunities ?? [],
    ownerSOPs: ai.ownerSOPs ?? [],
    employeeSOPs: ai.employeeSOPs ?? [],
    maintenanceSOPs: ai.maintenanceSOPs ?? { monthly: [], quarterly: [], annual: [] },
    testingChecklist: ai.testingChecklist ?? [],
    launchChecklist: ai.launchChecklist ?? [],
    primaryFinding: ai.primaryFinding ?? { headline: "", detail: "", priority: "Medium" },
    timeRecovery: ai.timeRecovery ?? [],
    enhancementOpportunities: ai.enhancementOpportunities ?? [],
    googleWorkspaceApps: ai.googleWorkspaceApps ?? [],
    estimatedCompletionWeeks: ai.estimatedCompletionWeeks ?? 8,
    // Legacy fields — populated from fallback or carried through if Gemini returns them
    implementationPhases: ai.implementationPhases ?? [],
    automationBlueprints: ai.automationBlueprints ?? [],
    sopDocuments: ai.sopDocuments ?? [],
    buildSequence: ai.buildSequence ?? [],
  };
}
