// ============================================================
// GSpaceAi — GSpace Consolidation Score™
//
// Calculates a 0–100 score from audit state data.
// Score is explainable and based on structured audit data only.
// ============================================================

import type { AuditState, ConsolidationScoreLabel } from "./types";
import { SCORE_RANGES } from "./constants";

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
