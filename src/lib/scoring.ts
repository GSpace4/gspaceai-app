// ============================================================
// GSpaceAi — GSpace Consolidation Score™
//
// Calculates a 0–100 score from audit state data.
// Score is explainable and based on structured audit data only.
// ============================================================

import type { AuditState, ConsolidationScoreLabel } from "./types";
import type { SavingsEstimate } from "./savingsEstimator";
import { SCORE_RANGES } from "./constants";

// ============================================================
// Impact Dimensions
// ============================================================

export type ImpactDimension = {
  label: string;
  color: "green" | "blue" | "yellow";
};

function deriveVisibilityLabel(audit: AuditState): string {
  const enhanceItems = audit.softwareInventory.filter(i => i.recommendedAction === "Enhance");
  if (enhanceItems.length > 0) {
    const first = enhanceItems[0];
    const usedFor = (first.usedFor ?? "").toLowerCase();
    if (usedFor.includes("track") || usedFor.includes("renewal")) return "Tracking Visibility Added";
    if (usedFor.includes("crm") || usedFor.includes("lead"))       return "Lead Visibility Added";
    if (usedFor.includes("schedul"))                                return "Scheduling Visibility Added";
    if (usedFor.includes("report"))                                 return "Reporting Visibility Added";
    if (first.category)                                             return `${first.category} Visibility Added`;
    return `${enhanceItems.length} Tool${enhanceItems.length > 1 ? "s" : ""} Enhanced`;
  }
  if (audit.googleWorkspaceOpportunities.length > 0) {
    return `${audit.googleWorkspaceOpportunities.length} GW Improvements`;
  }
  return "Workflow Visibility Improved";
}

export function calculateImpact(
  audit: AuditState,
  savings: SavingsEstimate
): { primary: ImpactDimension; secondary: ImpactDimension } {
  const timeHours =
    audit.automationOpportunities.length * 2 + audit.manualTasks.length;

  const consolidationCount = audit.softwareInventory.filter(
    i => i.recommendedAction === "Replace" || i.recommendedAction === "Consolidate"
  ).length;

  const enhanceCount = audit.softwareInventory.filter(
    i => i.recommendedAction === "Enhance"
  ).length;

  const candidates: Array<{ score: number; dim: ImpactDimension }> = [];

  if (savings.estimatedAnnualSavings > 0) {
    candidates.push({
      score: savings.estimatedAnnualSavings,
      dim: { label: `$${savings.estimatedAnnualSavings.toLocaleString()}/yr Saved`, color: "green" },
    });
  }

  if (timeHours > 0) {
    candidates.push({
      score: timeHours * 150,
      dim: { label: `${timeHours} hrs/mo Recovered`, color: "blue" },
    });
  }

  if (audit.automationOpportunities.length >= 2) {
    candidates.push({
      score: audit.automationOpportunities.length * 250,
      dim: { label: `${audit.automationOpportunities.length} Processes Automated`, color: "yellow" },
    });
  }

  if (consolidationCount > 0) {
    candidates.push({
      score: consolidationCount * 300,
      dim: { label: `${consolidationCount} Tool${consolidationCount > 1 ? "s" : ""} Consolidated`, color: "green" },
    });
  }

  if (enhanceCount > 0 || audit.googleWorkspaceOpportunities.length > 0) {
    const visScore = enhanceCount * 400 + audit.googleWorkspaceOpportunities.length * 100;
    candidates.push({
      score: visScore,
      dim: { label: deriveVisibilityLabel(audit), color: "blue" },
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const fallback: ImpactDimension = { label: "Google Workspace Optimized", color: "blue" };
  const primary   = candidates[0]?.dim ?? fallback;
  const secondary = candidates[1]?.dim ?? candidates[0]?.dim ?? fallback;

  return { primary, secondary };
}

export type ScoreBreakdown = {
  softwareCountPoints: number;     // up to 20
  spendPoints: number;             // up to 20
  replacementPotentialPoints: number; // up to 25
  gwUnderutilizationPoints: number;   // up to 15
  manualWorkPoints: number;           // up to 10
  fragmentationPoints: number;        // up to 10
  total: number;                      // 0–100
  label: ConsolidationScoreLabel;
};

export function calculateConsolidationScore(audit: AuditState): ScoreBreakdown {
  // --- 1. Software count (up to 20 pts) ---
  const toolCount = audit.softwareInventory.length;
  const softwareCountPoints = Math.min(toolCount * 3, 20);

  // --- 2. Estimated monthly spend (up to 20 pts) ---
  const spend = audit.estimatedMonthlySoftwareSpend;
  let spendPoints = 0;
  if (spend >= 500)      spendPoints = 20;
  else if (spend >= 300) spendPoints = 15;
  else if (spend >= 150) spendPoints = 10;
  else if (spend >= 50)  spendPoints = 5;

  // --- 3. Replacement potential (up to 25 pts) ---
  const highReplacement = audit.softwareInventory.filter(
    (s) => s.replacementPotential === "High" && s.recommendedAction !== "Keep"
  ).length;
  const mediumReplacement = audit.softwareInventory.filter(
    (s) => s.replacementPotential === "Medium"
  ).length;
  const replacementPotentialPoints = Math.min(highReplacement * 7 + mediumReplacement * 3, 25);

  // --- 4. Google Workspace underutilization (up to 15 pts) ---
  const gwOpportunities = audit.googleWorkspaceOpportunities.length;
  const gwUnderutilizationPoints = Math.min(gwOpportunities * 4, 15);

  // --- 5. Manual work (up to 10 pts) ---
  const manualTaskCount = audit.manualTasks.length;
  const bottleneckCount = audit.bottlenecks.length;
  const manualWorkPoints = Math.min((manualTaskCount + bottleneckCount) * 2, 10);

  // --- 6. Process fragmentation / reporting gaps (up to 10 pts) ---
  const consolidationOpps = audit.consolidationOpportunities.length;
  const automationOpps = audit.automationOpportunities.length;
  const fragmentationPoints = Math.min((consolidationOpps + automationOpps) * 2, 10);

  // --- Total ---
  const raw =
    softwareCountPoints +
    spendPoints +
    replacementPotentialPoints +
    gwUnderutilizationPoints +
    manualWorkPoints +
    fragmentationPoints;

  const total = Math.min(Math.max(Math.round(raw), 0), 100);
  const label = getScoreLabel(total);

  return {
    softwareCountPoints,
    spendPoints,
    replacementPotentialPoints,
    gwUnderutilizationPoints,
    manualWorkPoints,
    fragmentationPoints,
    total,
    label,
  };
}

export function getScoreLabel(score: number): ConsolidationScoreLabel {
  const range = SCORE_RANGES.find((r) => score >= r.min && score <= r.max);
  return range?.label ?? "Minimal Opportunity";
}
