// ============================================================
// GSpaceAi — localStorage Persistence
//
// Saves and loads AppState from localStorage.
// PDF blob/base64 data is excluded (too large for localStorage).
// ============================================================

import type { AppState, DeliverablesState } from "./types";
import { STORAGE_KEY } from "./constants";
import { getInitialState } from "@/context/AppStateContext";

// Strip report content (large) before saving — keep status flags only.
//
// What IS persisted:
//   - stage, sessionId, user profile, payments
//   - audit: all fields including v2.0 questionnaire data:
//       freeQuestions, paid29Questions       — needed to resume mid-questionnaire
//       freeIntakeAnswers, paid29IntakeAnswers, paid79ChatAnswers — all answers
//       freeReportSummary                   — needed for $29 intake context
//       currentQuestionIndex                — resume at exact question after refresh
//   - messages (capped at 50)
//
// What is NOT persisted:
//   - deliverable content/PDFs — re-generated on demand (too large for localStorage)
//
function sanitizeForStorage(state: AppState): AppState {
  const deliverables: DeliverablesState = {
    platform_consolidation_snapshot: {
      status: state.deliverables.platform_consolidation_snapshot.status,
      // content intentionally omitted — re-generate on demand
    },
    recommendations_report: {
      status: state.deliverables.recommendations_report.status,
    },
    implementation_guide_sop: {
      status: state.deliverables.implementation_guide_sop.status,
    },
  };

  return {
    ...state,
    deliverables,
    // Keep last 50 messages to prevent unbounded growth
    messages: state.messages.slice(-50),
    // audit spread via ...state already includes all v2.0 questionnaire fields
  };
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = sanitizeForStorage(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn("GSpaceAi: Failed to save session to localStorage", err);
  }
}

export function loadState(): AppState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    // Merge with initial state to fill any missing fields from future schema changes
    return deepMerge(getInitialState(), parsed);
  } catch (err) {
    console.warn("GSpaceAi: Failed to load session from localStorage", err);
    return null;
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Simple deep merge — initial state fields win for missing keys
function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key in override) {
    const overrideVal = override[key];
    const baseVal = base[key];
    if (
      overrideVal !== undefined &&
      typeof overrideVal === "object" &&
      overrideVal !== null &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal as object, overrideVal as object) as T[typeof key];
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[typeof key];
    }
  }
  return result;
}
