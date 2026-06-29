// ============================================================
// GSpaceAi — Workflow State Machine
//
// Defines valid workflow stages and all allowed transitions.
// Guards prevent invalid stage jumps and enforce the rule:
// "Never advance to next offer before current deliverable is displayed."
// ============================================================

import type { WorkflowStage, AppState } from "./types";

// ------------------------------------------------------------
// Valid transitions map
// Each stage maps to the only stages it is allowed to move to.
// ------------------------------------------------------------

export const VALID_TRANSITIONS: Record<WorkflowStage, WorkflowStage[]> = {
  // --- Existing intake stages (preserved) ---
  intro:                               ["collect_name"],
  collect_name:                        ["collect_business_basics"],
  collect_business_basics:             ["audit_in_progress", "audit_wrap_up", "free_report_generating", "free_questionnaire_loading"],
  audit_in_progress:                   ["audit_wrap_up", "free_report_generating"],
  audit_wrap_up:                       ["free_report_generating"],
  // --- Free tier questionnaire ---
  free_questionnaire_loading:          ["free_questionnaire_active"],
  free_questionnaire_active:           ["free_questionnaire_complete"],
  free_questionnaire_complete:         ["free_report_generating"],
  free_report_generating:              ["free_report_ready"],
  free_report_ready:                   ["recommendations_payment_pending", "recommendations_verified"],
  // --- $29 tier ---
  recommendations_payment_pending:     ["recommendations_email_requested", "recommendations_verified"],
  recommendations_email_requested:     ["recommendations_verifying", "recommendations_payment_pending"],
  recommendations_verifying:           ["recommendations_verified", "recommendations_payment_pending"],
  recommendations_verified:            ["paid_29_questionnaire_loading", "recommendations_report_generating"],
  paid_29_questionnaire_loading:       ["paid_29_questionnaire_active"],
  paid_29_questionnaire_active:        ["paid_29_questionnaire_complete"],
  paid_29_questionnaire_complete:      ["recommendations_report_generating"],
  recommendations_report_generating:   ["recommendations_report_ready"],
  recommendations_report_ready:        ["implementation_payment_pending"],
  // --- $79 tier ---
  implementation_payment_pending:      ["implementation_email_requested", "implementation_verified"],
  implementation_email_requested:      ["implementation_verifying", "implementation_payment_pending"],
  implementation_verifying:            ["implementation_verified", "implementation_payment_pending"],
  implementation_verified:             ["paid_79_chat_active", "implementation_report_generating"],
  paid_79_chat_active:                 ["paid_79_chat_complete"],
  paid_79_chat_complete:               ["implementation_report_generating"],
  implementation_report_generating:    ["implementation_report_ready"],
  implementation_report_ready:         ["done_with_you_payment_pending"],
  // --- $159 tier ---
  done_with_you_payment_pending:       ["done_with_you_email_requested", "done_with_you_verified"],
  done_with_you_email_requested:       ["done_with_you_verifying", "done_with_you_payment_pending"],
  done_with_you_verifying:             ["done_with_you_verified", "done_with_you_payment_pending"],
  done_with_you_verified:              ["complete"],
  complete:                            [],
};

// ------------------------------------------------------------
// Transition guard
// Returns true if the transition is allowed given current state.
// Enforces the critical deliverable-before-next-offer rule.
// ------------------------------------------------------------

export function canTransition(
  from: WorkflowStage,
  to: WorkflowStage,
  state: AppState
): boolean {
  // Must be a declared valid transition
  if (!VALID_TRANSITIONS[from]?.includes(to)) return false;

  // Critical guard: cannot show $29 offer until free report is displayed
  if (to === "recommendations_payment_pending") {
    if (state.deliverables.platform_consolidation_snapshot.status !== "displayed") {
      return false;
    }
  }

  // Critical guard: cannot show $79 offer until $29 report is displayed
  if (to === "implementation_payment_pending") {
    if (state.deliverables.recommendations_report.status !== "displayed") {
      return false;
    }
  }

  // Critical guard: cannot show $159 offer until $79 report is displayed
  if (to === "done_with_you_payment_pending") {
    if (state.deliverables.implementation_guide_sop.status !== "displayed") {
      return false;
    }
  }

  return true;
}

// ------------------------------------------------------------
// Stage grouping helpers — used by ProgressIndicator
// ------------------------------------------------------------

export function getProgressStep(stage: WorkflowStage): number {
  if (["intro", "collect_name", "collect_business_basics", "audit_in_progress", "audit_wrap_up",
       "free_questionnaire_loading", "free_questionnaire_active", "free_questionnaire_complete"].includes(stage)) return 1;
  if (["free_report_generating", "free_report_ready"].includes(stage)) return 2;
  if (stage.startsWith("recommendations_") || stage.startsWith("paid_29_")) return 3;
  if (stage.startsWith("implementation_") || stage.startsWith("paid_79_")) return 4;
  if (stage.startsWith("done_with_you_") || stage === "complete") return 5;
  return 1;
}

export const PROGRESS_STEPS = [
  { step: 1, label: "Assessment" },
  { step: 2, label: "Free Report" },
  { step: 3, label: "Recommendations" },
  { step: 4, label: "Implementation" },
  { step: 5, label: "Done-With-You" },
];

// ------------------------------------------------------------
// Stage helpers — used by components to know what to render
// ------------------------------------------------------------

export function isAuditStage(stage: WorkflowStage): boolean {
  return [
    "intro", "collect_name", "collect_business_basics",
    "audit_in_progress", "audit_wrap_up",
    "free_questionnaire_loading", "free_questionnaire_active", "free_questionnaire_complete",
    "paid_79_chat_active", "paid_79_chat_complete",
  ].includes(stage);
}

export function isPaymentPendingStage(stage: WorkflowStage): boolean {
  return stage.endsWith("_payment_pending");
}

export function isVerifyingStage(stage: WorkflowStage): boolean {
  return stage.endsWith("_verifying") || stage.endsWith("_email_requested");
}

export function isReportGeneratingStage(stage: WorkflowStage): boolean {
  return stage.endsWith("_generating");
}

export function isReportReadyStage(stage: WorkflowStage): boolean {
  return stage.endsWith("_report_ready") || stage === "free_report_ready";
}
