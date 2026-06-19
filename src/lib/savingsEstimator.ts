// ============================================================
// GSpaceAi — Savings Estimator
//
// Estimates potential savings from audit data.
// All outputs are clearly labeled as estimates, never guarantees.
// ============================================================

import type { AuditState, SoftwareInventoryItem } from "./types";

// Conservative default cost estimates per category
// Used only when the user does not know the actual cost
const DEFAULT_CATEGORY_COSTS: Record<string, number> = {
  "Scheduling":           12,
  "Project Management":   15,
  "CRM":                  25,
  "Forms":                10,
  "Communication":        8,
  "Email Marketing":      20,
  "Document Management":  10,
  "Automation":           30,
  "Analytics":            15,
  "HR/Operations":        20,
  "Other":                15,
};

export type SavingsEstimate = {
  estimatedMonthlySoftwareSpend: number;
  estimatedReplaceableMonthlySpend: number;
  estimatedAnnualSavings: number;
  potentialReplacementCount: number;
  potentialConsolidationCount: number;
  potentialAutomationCount: number;
  isEstimated: boolean;
};

function getCostForItem(item: SoftwareInventoryItem): number {
  if (item.estimatedMonthlyCost && item.estimatedMonthlyCost > 0) {
    return item.estimatedMonthlyCost;
  }
  return DEFAULT_CATEGORY_COSTS[item.category] ?? DEFAULT_CATEGORY_COSTS["Other"];
}

export function estimateSavings(audit: AuditState): SavingsEstimate {
  const inventory = audit.softwareInventory;

  const totalMonthlySpend = inventory.reduce((sum, item) => {
    return sum + getCostForItem(item);
  }, 0);

  const replaceableItems = inventory.filter(
    (item) => item.recommendedAction === "Replace"
  );
  const consolidatableItems = inventory.filter(
    (item) => item.recommendedAction === "Consolidate"
  );

  // Replaceable = 100% of cost potentially recoverable
  const replaceableMonthlySpend = replaceableItems.reduce(
    (sum, item) => sum + getCostForItem(item),
    0
  );

  // Consolidatable = 50% of cost potentially recoverable (partial replacement)
  const consolidatableMonthlySpend =
    consolidatableItems.reduce((sum, item) => sum + getCostForItem(item), 0) * 0.5;

  const estimatedReplaceableMonthlySpend = Math.round(
    replaceableMonthlySpend + consolidatableMonthlySpend
  );

  const estimatedAnnualSavings = estimatedReplaceableMonthlySpend * 12;

  // Check if any costs were estimated (user didn't provide exact figures)
  const hasEstimatedCosts = inventory.some(
    (item) => !item.estimatedMonthlyCost || item.estimatedMonthlyCost === 0
  );

  return {
    estimatedMonthlySoftwareSpend: Math.round(totalMonthlySpend),
    estimatedReplaceableMonthlySpend,
    estimatedAnnualSavings,
    potentialReplacementCount: replaceableItems.length,
    potentialConsolidationCount: consolidatableItems.length,
    potentialAutomationCount: audit.automationOpportunities.length,
    isEstimated: hasEstimatedCosts,
  };
}

export function formatSavingsLabel(amount: number, isEstimated: boolean): string {
  const prefix = isEstimated ? "Estimated " : "";
  return `${prefix}$${amount.toLocaleString()}/mo`;
}

export function formatAnnualLabel(amount: number, isEstimated: boolean): string {
  const prefix = isEstimated ? "Estimated potential " : "Potential ";
  return `${prefix}$${amount.toLocaleString()}/year`;
}
