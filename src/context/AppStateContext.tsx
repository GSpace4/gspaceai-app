"use client";

// ============================================================
// GSpaceAi — Application State Context
//
// React Context + useReducer implementing the workflow state
// machine. All state transitions go through this reducer.
// Payment status is NEVER set from Gemini responses — only
// from the /api/verify-payment route response.
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  AppState,
  WorkflowStage,
  UserProfile,
  AuditState,
  ChatMessage,
  PaymentsState,
  PaymentRecord,
  DeliverablesState,
  FreeDeliverableStatus,
  PaidDeliverableStatus,
  ReportContent,
  GeminiExtractedData,
  ConsolidationScoreLabel,
  GeneratedQuestion,
  QuestionnaireAnswer,
} from "@/lib/types";
import { canTransition } from "@/lib/workflowState";
import { saveState, loadState } from "@/lib/persistence";

// ------------------------------------------------------------
// Initial State
// ------------------------------------------------------------

function makePaymentRecord(): PaymentRecord {
  return { status: "pending", email: "", verifiedAt: "" };
}

export function getInitialState(): AppState {
  return {
    sessionId: crypto.randomUUID(),
    stage: "intro",
    user: {
      name: "",
      email: "",
      businessName: "",
      businessType: "",
      businessSize: "",
      industry: "",
      currentGoogleWorkspaceUsage: "",
    },
    audit: {
      answers: [],
      softwareInventory: [],
      workflowInventory: [],
      bottlenecks: [],
      manualTasks: [],
      googleWorkspaceOpportunities: [],
      automationOpportunities: [],
      consolidationOpportunities: [],
      risks: [],
      recommendations: [],
      gspaceConsolidationScore: 0,
      scoreLabel: "" as ConsolidationScoreLabel,
      estimatedMonthlySoftwareSpend: 0,
      estimatedReplaceableMonthlySpend: 0,
      estimatedAnnualSavings: 0,
      auditComplete: false,
      // v2.0 questionnaire fields
      freeQuestions: [],
      paid29Questions: [],
      freeIntakeAnswers: [],
      paid29IntakeAnswers: [],
      paid79ChatAnswers: [],
      freeReportSummary: "",
      currentQuestionIndex: 0,
    },
    messages: [],
    payments: {
      recommendations_report: makePaymentRecord(),
      implementation_guide_sop: makePaymentRecord(),
      done_with_you: makePaymentRecord(),
    },
    deliverables: {
      platform_consolidation_snapshot: { status: "not_started" },
      recommendations_report: { status: "locked" },
      implementation_guide_sop: { status: "locked" },
    },
  };
}

// ------------------------------------------------------------
// Action Types
// ------------------------------------------------------------

export type AppAction =
  | { type: "TRANSITION_STAGE"; to: WorkflowStage }
  | { type: "SET_USER"; user: Partial<UserProfile> }
  | { type: "ADD_MESSAGE"; message: ChatMessage }
  | { type: "MERGE_AUDIT_DATA"; data: GeminiExtractedData }
  | { type: "SET_SCORE"; score: number; label: ConsolidationScoreLabel }
  | { type: "SET_SAVINGS"; monthly: number; replaceable: number; annual: number }
  | { type: "SET_PAYMENT_VERIFIED"; productKey: keyof PaymentsState; email: string }
  | { type: "SET_PAYMENT_FAILED"; productKey: keyof PaymentsState }
  | { type: "SET_DELIVERABLE_STATUS"; key: keyof DeliverablesState; status: FreeDeliverableStatus | PaidDeliverableStatus }
  | { type: "SET_DELIVERABLE_CONTENT"; key: keyof DeliverablesState; content: ReportContent }
  | { type: "HYDRATE_FROM_STORAGE"; savedState: AppState }
  | { type: "RESET_SESSION" }
  // v2.0 questionnaire actions
  | { type: "SET_FREE_QUESTIONS"; questions: GeneratedQuestion[] }
  | { type: "SET_PAID29_QUESTIONS"; questions: GeneratedQuestion[] }
  | { type: "SET_FREE_INTAKE_ANSWERS"; answers: QuestionnaireAnswer[] }
  | { type: "SET_PAID29_INTAKE_ANSWERS"; answers: QuestionnaireAnswer[] }
  | { type: "SET_PAID79_CHAT_ANSWERS"; answers: Array<{ question: string; answer: string }> }
  | { type: "SET_FREE_REPORT_SUMMARY"; summary: string }
  | { type: "SET_CURRENT_QUESTION_INDEX"; index: number };

// ------------------------------------------------------------
// Reducer
// ------------------------------------------------------------

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case "TRANSITION_STAGE": {
      if (!canTransition(state.stage, action.to, state)) {
        console.warn(`GSpaceAi: Blocked transition ${state.stage} → ${action.to}`);
        return state;
      }
      return { ...state, stage: action.to };
    }

    case "SET_USER": {
      return { ...state, user: { ...state.user, ...action.user } };
    }

    case "ADD_MESSAGE": {
      return { ...state, messages: [...state.messages, action.message] };
    }

    case "MERGE_AUDIT_DATA": {
      const data = action.data;
      const audit = state.audit;
      return {
        ...state,
        audit: {
          ...audit,
          softwareInventory: mergeUnique(audit.softwareInventory, data.softwareInventory ?? [], "name"),
          workflowInventory: mergeUnique(audit.workflowInventory, data.workflowInventory ?? [], "name"),
          manualTasks:       mergeUniqueStrings(audit.manualTasks, data.manualTasks ?? []),
          automationOpportunities: mergeUnique(audit.automationOpportunities, data.automationOpportunities ?? [], "title"),
          consolidationOpportunities: mergeUnique(audit.consolidationOpportunities, data.consolidationOpportunities ?? [], "title"),
          bottlenecks: mergeUniqueStrings(audit.bottlenecks, data.bottlenecks ?? []),
          risks: mergeUniqueStrings(audit.risks, data.risks ?? []),
          auditComplete: data.auditComplete ?? audit.auditComplete,
        },
      };
    }

    case "SET_SCORE": {
      return {
        ...state,
        audit: {
          ...state.audit,
          gspaceConsolidationScore: action.score,
          scoreLabel: action.label,
        },
      };
    }

    case "SET_SAVINGS": {
      return {
        ...state,
        audit: {
          ...state.audit,
          estimatedMonthlySoftwareSpend: action.monthly,
          estimatedReplaceableMonthlySpend: action.replaceable,
          estimatedAnnualSavings: action.annual,
        },
      };
    }

    case "SET_PAYMENT_VERIFIED": {
      return {
        ...state,
        payments: {
          ...state.payments,
          [action.productKey]: {
            status: "verified" as const,
            email: action.email,
            verifiedAt: new Date().toISOString(),
          },
        },
      };
    }

    case "SET_PAYMENT_FAILED": {
      return {
        ...state,
        payments: {
          ...state.payments,
          [action.productKey]: {
            ...state.payments[action.productKey],
            status: "failed" as const,
          },
        },
      };
    }

    case "SET_DELIVERABLE_STATUS": {
      return {
        ...state,
        deliverables: {
          ...state.deliverables,
          [action.key]: {
            ...state.deliverables[action.key],
            status: action.status,
          },
        },
      };
    }

    case "SET_DELIVERABLE_CONTENT": {
      return {
        ...state,
        deliverables: {
          ...state.deliverables,
          [action.key]: {
            ...state.deliverables[action.key],
            content: action.content,
          },
        },
      };
    }

    case "HYDRATE_FROM_STORAGE": {
      return action.savedState;
    }

    case "RESET_SESSION": {
      return getInitialState();
    }

    // v2.0 questionnaire reducer cases
    case "SET_FREE_QUESTIONS": {
      return { ...state, audit: { ...state.audit, freeQuestions: action.questions } };
    }

    case "SET_PAID29_QUESTIONS": {
      return { ...state, audit: { ...state.audit, paid29Questions: action.questions } };
    }

    case "SET_FREE_INTAKE_ANSWERS": {
      return { ...state, audit: { ...state.audit, freeIntakeAnswers: action.answers } };
    }

    case "SET_PAID29_INTAKE_ANSWERS": {
      return { ...state, audit: { ...state.audit, paid29IntakeAnswers: action.answers } };
    }

    case "SET_PAID79_CHAT_ANSWERS": {
      return { ...state, audit: { ...state.audit, paid79ChatAnswers: action.answers } };
    }

    case "SET_FREE_REPORT_SUMMARY": {
      return { ...state, audit: { ...state.audit, freeReportSummary: action.summary } };
    }

    case "SET_CURRENT_QUESTION_INDEX": {
      return { ...state, audit: { ...state.audit, currentQuestionIndex: action.index } };
    }

    default:
      return state;
  }
}

// ------------------------------------------------------------
// Merge helpers
// ------------------------------------------------------------

function mergeUnique<T extends object>(existing: T[], incoming: T[], key: keyof T): T[] {
  const map = new Map<unknown, T>();
  for (const item of existing) map.set(item[key], item);
  for (const item of incoming) map.set(item[key], { ...map.get(item[key]), ...item });
  return Array.from(map.values());
}

function mergeUniqueStrings(existing: string[], incoming: string[]): string[] {
  return Array.from(new Set([...existing, ...incoming]));
}

// ------------------------------------------------------------
// Context
// ------------------------------------------------------------

type AppStateContextValue = {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  transition: (to: WorkflowStage) => void;
  resetSession: () => void;
  isHydrated: boolean;
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  // Always start with empty initial state — identical on server and client.
  // This prevents hydration mismatches when localStorage has existing data.
  const [state, dispatch] = useReducer(appReducer, getInitialState());
  const [isHydrated, setIsHydrated] = useState(false);

  // Load persisted state from localStorage AFTER mount (client only).
  // This runs once, after the first render, so server and client agree on initial HTML.
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      dispatch({ type: "HYDRATE_FROM_STORAGE", savedState: saved });
    }
    setIsHydrated(true);
  }, []);

  // Persist state to localStorage on every change (skip before hydration to avoid overwriting)
  useEffect(() => {
    if (isHydrated) {
      saveState(state);
    }
  }, [state, isHydrated]);

  const transition = useCallback(
    (to: WorkflowStage) => {
      dispatch({ type: "TRANSITION_STAGE", to });
    },
    [dispatch]
  );

  const resetSession = useCallback(() => {
    dispatch({ type: "RESET_SESSION" });
  }, [dispatch]);

  return (
    <AppStateContext.Provider value={{ state, dispatch, transition, resetSession, isHydrated }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppStateProvider");
  return ctx;
}
