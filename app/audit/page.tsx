"use client";

import { useState, useEffect, useRef } from "react";
import { useAppState } from "@/src/context/AppStateContext";
import GSpaceAiLogo from "@/src/components/GSpaceAiLogo";
import ProgressIndicator from "@/src/components/ProgressIndicator";
import ChatInterface from "@/src/components/ChatInterface";
import ReportViewer from "@/src/components/ReportViewer";
import OfferCard from "@/src/components/OfferCard";
import PaymentVerificationModal from "@/src/components/PaymentVerificationModal";
import QuestionnaireStep from "@/src/components/QuestionnaireStep";
import AdaptivePaid79Questionnaire from "@/src/components/AdaptivePaid79Questionnaire";
import { isAuditStage } from "@/src/lib/workflowState";
import type { FreeReportData } from "@/src/lib/reportGeneration";
import type { PaymentsState, QuestionnaireAnswer, FreeAnalysisData } from "@/src/lib/types";

// Inline display card for the Recommendations Report
function ImpactCardColor({ color }: { color: "green" | "blue" | "yellow" }) {
  if (color === "green")  return "text-brand-green";
  if (color === "yellow") return "text-brand-yellow";
  return "text-brand-blue";
}

function RecommendationsReportCard({ data, pdfBase64, businessName, generatedAt, freeAnalysisData, onMarkDisplayed }: {
  data: Record<string, unknown>;
  pdfBase64: string;
  businessName: string;
  generatedAt: string;
  freeAnalysisData: FreeAnalysisData | null;
  onMarkDisplayed: () => void;
}) {
  // Mark displayed once on mount
  const marked = useRef(false);
  if (!marked.current) { marked.current = true; setTimeout(onMarkDisplayed, 100); }

  function handleDownload() {
    const blob = new Blob([Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSpaceAi-Recommendations-${businessName.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const executiveSummary = data.executiveSummary as string | undefined;

  // Use freeAnalysisData as the authoritative source — same data the PDF uses
  const toolCount    = freeAnalysisData?.softwareInventory?.length ?? 0;
  const score        = freeAnalysisData?.gspaceConsolidationScore ?? 0;
  const primaryLabel = freeAnalysisData?.primaryImpact
    || freeAnalysisData?.consolidationOpportunities?.[0]
    || "Google Workspace Optimized";
  const secondaryLabel = freeAnalysisData?.secondaryImpact
    || freeAnalysisData?.automationOpportunities?.[0]
    || "";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">Recommendations Report</span>
            <h2 className="text-xl font-bold text-brand-dark mt-0.5">{businessName}</h2>
            <p className="text-sm text-brand-dark/50 mt-1">
              Generated {new Date(generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button onClick={handleDownload} className="flex items-center gap-2 bg-brand-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-blue/90 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Download PDF
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-blue">{score}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Consolidation Score</p>
          </div>
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-dark">{toolCount}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Tools Analyzed</p>
          </div>
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-base font-bold leading-tight text-brand-blue">{primaryLabel}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Primary Impact</p>
          </div>
          {secondaryLabel && (
            <div className="bg-brand-light rounded-xl p-3 text-center">
              <p className="text-base font-bold leading-tight text-brand-green">{secondaryLabel}</p>
              <p className="text-xs text-brand-dark/50 mt-0.5">Secondary Impact</p>
            </div>
          )}
        </div>
        {executiveSummary && (
          <div className="bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/10">
            <p className="text-sm text-brand-dark/80 leading-relaxed">{executiveSummary}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline display card for the Implementation Guide + SOP Book
function ImplDeliveryCard({ data, pdfBase64, businessName, generatedAt, freeAnalysisData, onMarkDisplayed }: {
  data?: Record<string, unknown> | null;
  pdfBase64: string | null;
  businessName: string;
  generatedAt?: string;
  freeAnalysisData: FreeAnalysisData | null;
  onMarkDisplayed: () => void;
}) {
  const marked = useRef(false);
  if (!marked.current) { marked.current = true; setTimeout(onMarkDisplayed, 100); }

  function handleDownload() {
    if (!pdfBase64) return;
    const blob = new Blob([Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSpaceAi-Implementation-${businessName.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const executiveSummary  = data?.executiveSummary as string | undefined;
  const toolCount         = freeAnalysisData?.softwareInventory?.length ?? 0;
  const score             = freeAnalysisData?.gspaceConsolidationScore ?? 0;
  const oppsCount         = (freeAnalysisData?.consolidationOpportunities?.length ?? 0) +
                            (freeAnalysisData?.automationOpportunities?.length ?? 0);
  const primaryLabel      = freeAnalysisData?.primaryImpact
    || freeAnalysisData?.consolidationOpportunities?.[0]
    || "Google Workspace Optimized";
  const secondaryLabel    = freeAnalysisData?.secondaryImpact
    || freeAnalysisData?.automationOpportunities?.[0]
    || "";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">Implementation Guide + SOP Book</span>
            <h2 className="text-xl font-bold text-brand-dark mt-0.5">{businessName}</h2>
            {generatedAt && (
              <p className="text-sm text-brand-dark/50 mt-1">
                Generated {new Date(generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          {pdfBase64 ? (
            <button onClick={handleDownload} className="flex items-center gap-2 bg-brand-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-blue/90 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              Download PDF
            </button>
          ) : (
            <span className="text-xs font-semibold text-brand-yellow bg-brand-yellow/10 px-3 py-1.5 rounded-full">Delivery Pending</span>
          )}
        </div>

        {/* Metrics row — sourced from freeAnalysisData, same as Recommendations card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-blue">{score}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Consolidation Score</p>
          </div>
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-dark">{toolCount}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Tools Analyzed</p>
          </div>
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-base font-bold leading-tight text-brand-blue">{primaryLabel}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Primary Impact</p>
          </div>
          {secondaryLabel && (
            <div className="bg-brand-light rounded-xl p-3 text-center">
              <p className="text-base font-bold leading-tight text-brand-green">{secondaryLabel}</p>
              <p className="text-xs text-brand-dark/50 mt-0.5">Secondary Impact</p>
            </div>
          )}
        </div>

        {/* Executive summary */}
        {executiveSummary && (
          <div className="bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/10">
            <p className="text-sm text-brand-dark/80 leading-relaxed">{executiveSummary}</p>
          </div>
        )}

        {/* Pending delivery fallback */}
        {!pdfBase64 && !data && (
          <div className="bg-brand-blue/5 rounded-xl p-4 border border-brand-blue/10">
            <p className="text-sm font-semibold text-brand-dark mb-1">Your Implementation Guide is on its way!</p>
            <p className="text-sm text-brand-dark/70 leading-relaxed">
              Our team is personally preparing your step-by-step guide and SOP templates. You&apos;ll receive it at your payment email within 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { state, dispatch, transition, isHydrated } = useAppState();
  const { stage } = state;


  // Free report state
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [reportData, setReportData] = useState<FreeReportData | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const generationTriggered = useRef(false);
  const recSectionRef  = useRef<HTMLDivElement>(null);
  const implSectionRef = useRef<HTMLDivElement>(null);

  // Recommendations report state
  const [recPdfBase64, setRecPdfBase64] = useState<string | null>(null);
  const [recReportData, setRecReportData] = useState<Record<string, unknown> | null>(null);
  const [recReportError, setRecReportError] = useState<string | null>(null);
  const [recRetryCount, setRecRetryCount] = useState(0);
  const recGenerationTriggered = useRef(false);

  // Implementation Guide + SOP Book state
  const [implPdfBase64, setImplPdfBase64] = useState<string | null>(null);
  const [implReportData, setImplReportData] = useState<Record<string, unknown> | null>(null);
  const [implReportError, setImplReportError] = useState<string | null>(null);
  const [implRetryCount, setImplRetryCount] = useState(0);
  const implGenerationTriggered = useRef(false);

  // Payment verification modal state
  const [verifyModalProduct, setVerifyModalProduct] = useState<keyof PaymentsState | null>(null);

  // v2.0 questionnaire state
  const [freeQuestionsLoading, setFreeQuestionsLoading]     = useState(false);
  const [paid29QuestionsLoading, setPaid29QuestionsLoading] = useState(false);
  const [questionnaireError, setQuestionnaireError]         = useState<string | null>(null);
  const freeQuestionsTriggered   = useRef(false);
  const paid29QuestionsTriggered = useRef(false);

  // ------------------------------------------------------------------
  // Trigger report generation when stage reaches free_report_generating
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;
    if (stage !== "free_report_generating") return;
    if (generationTriggered.current) return;

    // Guard: all 10 questionnaire answers must be present before calling the API.
    // If answers haven't flushed to state yet, wait for the next render cycle.
    if (state.audit.freeIntakeAnswers.length < 10) {
      console.warn("[AuditPage] Waiting for all 10 answers before generating report. Current:", state.audit.freeIntakeAnswers.length);
      return;
    }

    generationTriggered.current = true;

    async function generate() {
      setReportError(null);
      try {
        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: "platform_consolidation_snapshot",
            auditState: state.audit,
            user: state.user,
            sessionId: state.sessionId,
            freeIntakeAnswers: state.audit.freeIntakeAnswers,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Server error: ${res.status}`);
        }

        const data = await res.json();
        if (!data.success || !data.pdfBase64) {
          throw new Error("Report generation returned no data");
        }

        // Store locally — PDF base64 is NOT persisted to localStorage (too large)
        setPdfBase64(data.pdfBase64);
        // data.reportData is the full FreeReportData object with correct property names
        setReportData(data.reportData as FreeReportData);

        // Store the full structured analysis as the single source of truth for all tiers
        if (data.analysisData) {
          dispatch({ type: "SET_FREE_ANALYSIS_DATA", data: data.analysisData });
        }

        // Also build a text summary for $79 chat context
        const rd = data.reportData as FreeReportData;
        if (rd) {
          const toolList = rd.softwareInventory?.map((t: {name: string}) => t.name).join(", ") ?? "";
          const topOpps  = rd.consolidationOpportunities?.slice(0, 3).map((o: {title: string}) => o.title).join("; ") ?? "";
          const findings = rd.keyFindings?.slice(0, 3).join(" ") ?? "";
          const score    = rd.scoreBreakdown;
          const savings  = rd.savings;
          const summary  = [
            `Business: ${state.user.businessName} (${state.user.businessType})`,
            `GSpace Consolidation Score: ${score?.total ?? 0}/100 (${score?.label ?? ""})`,
            `Tools Identified: ${toolList}`,
            `Estimated Annual Savings: $${savings?.estimatedAnnualSavings?.toLocaleString() ?? 0}`,
            `Top Opportunities: ${topOpps}`,
            `Key Findings: ${findings}`,
          ].join("\n");
          dispatch({ type: "SET_FREE_REPORT_SUMMARY", summary });
        }

        // Update deliverable status in app state
        dispatch({
          type: "SET_DELIVERABLE_STATUS",
          key: "platform_consolidation_snapshot",
          status: "generated",
        });
        dispatch({
          type: "SET_DELIVERABLE_CONTENT",
          key: "platform_consolidation_snapshot",
          content: { sections: data.reportData, generatedAt: data.reportData.generatedAt },
        });

        // Transition to ready
        transition("free_report_ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Report generation failed";
        console.error("[AuditPage] Report generation error:", msg);
        setReportError(msg);
      }
    }

    generate();
  }, [isHydrated, stage, state.audit, state.user, dispatch, transition]);

  // Reset free report trigger when returning to audit
  useEffect(() => {
    if (isAuditStage(stage)) {
      generationTriggered.current = false;
      setPdfBase64(null);
      setReportData(null);
      setReportError(null);
    }
  }, [stage]);

  // ------------------------------------------------------------------
  // Trigger Recommendations Report generation after payment verified
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;
    if (stage !== "recommendations_report_generating") return;
    if (recGenerationTriggered.current) return;
    recGenerationTriggered.current = true;

    async function generateRec() {
      setRecReportError(null);
      try {
        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: "recommendations_report",
            auditState: state.audit,
            user: state.user,
            sessionId: state.sessionId,
            freeIntakeAnswers:   state.audit.freeIntakeAnswers,
            paid29IntakeAnswers: state.audit.paid29IntakeAnswers,
            freeReportContent:   state.audit.freeReportSummary,
            freeAnalysisData:    state.audit.freeAnalysisData,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as {error?: string}).error ?? `Server error: ${res.status}`);
        }
        const data = await res.json() as { success: boolean; pdfBase64?: string; reportData?: Record<string, unknown>; error?: string };
        if (!data.success || !data.pdfBase64) throw new Error("Report generation returned no data");

        setRecPdfBase64(data.pdfBase64);
        setRecReportData(data.reportData ?? null);
        dispatch({ type: "SET_DELIVERABLE_STATUS", key: "recommendations_report", status: "generated" });
        transition("recommendations_report_ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Report generation failed";
        console.error("[AuditPage] Recommendations report error:", msg);
        setRecReportError(msg);
        recGenerationTriggered.current = false; // allow retry
      }
    }

    generateRec();
  }, [isHydrated, stage, state.audit, state.user, dispatch, transition, recRetryCount]);

  // v2.0: recommendations_verified → $29 questionnaire (not directly to report generation)
  useEffect(() => {
    if (stage === "recommendations_verified") {
      paid29QuestionsTriggered.current = false;
      recGenerationTriggered.current   = false;
      transition("paid_29_questionnaire_loading");
    }
  }, [stage, transition]);

  // ------------------------------------------------------------------
  // Trigger Implementation Guide generation after payment verified
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;
    if (stage !== "implementation_report_generating") return;
    if (implGenerationTriggered.current) return;
    implGenerationTriggered.current = true;

    async function generateImpl() {
      setImplReportError(null);
      try {
        const paid79ChatAnswers = state.audit.paid79ChatAnswers;
        console.log(`[AuditPage] impl guide call — freeAnalysisData: ${!!state.audit.freeAnalysisData}, paid79ChatAnswers: ${paid79ChatAnswers.length}`);

        const res = await fetch("/api/generate-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportType: "implementation_guide_sop",
            auditState: state.audit,
            user: state.user,
            sessionId: state.sessionId,
            freeIntakeAnswers:    state.audit.freeIntakeAnswers,
            paid29IntakeAnswers:  state.audit.paid29IntakeAnswers,
            paid79ChatAnswers,
            freeAnalysisData:     state.audit.freeAnalysisData,
            freeReportContent:    state.audit.freeReportSummary,
            paid29ReportContent:  recReportData
              ? String((recReportData as Record<string,unknown>).executiveSummary ?? "")
              : undefined,
          }),
        });

        // 403 = not yet automated — advance for manual delivery confirmation
        if (res.status === 403) {
          dispatch({ type: "SET_DELIVERABLE_STATUS", key: "implementation_guide_sop", status: "generated" });
          transition("implementation_report_ready");
          return;
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as {error?: string}).error ?? `Server error: ${res.status}`);
        }

        const data = await res.json() as { success: boolean; pdfBase64?: string; reportData?: Record<string, unknown>; error?: string };
        if (!data.success || !data.pdfBase64) throw new Error("Report generation returned no data");

        setImplPdfBase64(data.pdfBase64);
        setImplReportData(data.reportData ?? null);
        dispatch({ type: "SET_DELIVERABLE_STATUS", key: "implementation_guide_sop", status: "generated" });
        transition("implementation_report_ready");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Report generation failed";
        console.error("[AuditPage] Implementation guide error:", msg);
        setImplReportError(msg);
        implGenerationTriggered.current = false; // allow retry
      }
    }

    generateImpl();
  }, [isHydrated, stage, state.audit, state.user, dispatch, transition, implRetryCount]);

  // v2.0: implementation_verified → $79 chat intake (not directly to report generation)
  useEffect(() => {
    if (stage === "implementation_verified") {
      implGenerationTriggered.current = false;
      transition("paid_79_chat_active");
    }
  }, [stage, transition]);

  // Auto-advance from done_with_you_verified to complete (no report for this tier)
  useEffect(() => {
    if (stage === "done_with_you_verified") {
      transition("complete");
    }
  }, [stage, transition]);

  // ------------------------------------------------------------------
  // v2.0: Fetch free-tier questions when entering free_questionnaire_loading
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;
    if (stage !== "free_questionnaire_loading") return;
    if (freeQuestionsTriggered.current) return;
    freeQuestionsTriggered.current = true;
    setFreeQuestionsLoading(true);
    setQuestionnaireError(null);

    fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "free" }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (!data.questions?.length) throw new Error("No questions returned");
        dispatch({ type: "SET_FREE_QUESTIONS", questions: data.questions });
        dispatch({ type: "SET_CURRENT_QUESTION_INDEX", index: 0 });
        transition("free_questionnaire_active");
      })
      .catch(err => {
        setQuestionnaireError(err.message ?? "Failed to load questions");
        freeQuestionsTriggered.current = false;
      })
      .finally(() => setFreeQuestionsLoading(false));
  }, [isHydrated, stage, dispatch, transition]);

  // Reset free questionnaire trigger when returning to audit start
  useEffect(() => {
    if (stage === "intro" || stage === "collect_name") {
      freeQuestionsTriggered.current = false;
    }
  }, [stage]);

  // Auto-advance from free_questionnaire_complete to report generation
  useEffect(() => {
    if (stage === "free_questionnaire_complete") {
      transition("free_report_generating");
    }
  }, [stage, transition]);

  // ------------------------------------------------------------------
  // v2.0: Fetch $29-tier questions when entering paid_29_questionnaire_loading
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;
    if (stage !== "paid_29_questionnaire_loading") return;
    if (paid29QuestionsTriggered.current) return;
    paid29QuestionsTriggered.current = true;
    setPaid29QuestionsLoading(true);
    setQuestionnaireError(null);

    fetch("/api/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: "paid_29",
        priorContext: {
          freeIntakeAnswers:   state.audit.freeIntakeAnswers,
          freeReportSummary:   state.audit.freeReportSummary,
        },
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        if (!data.questions?.length) throw new Error("No questions returned");
        dispatch({ type: "SET_PAID29_QUESTIONS", questions: data.questions });
        dispatch({ type: "SET_CURRENT_QUESTION_INDEX", index: 0 });
        transition("paid_29_questionnaire_active");
      })
      .catch(err => {
        setQuestionnaireError(err.message ?? "Failed to load questions");
        paid29QuestionsTriggered.current = false;
      })
      .finally(() => setPaid29QuestionsLoading(false));
  }, [isHydrated, stage, state.audit.freeIntakeAnswers, state.audit.freeReportSummary, dispatch, transition]);

  // Auto-advance from paid_29_questionnaire_complete to report generation
  useEffect(() => {
    if (stage === "paid_29_questionnaire_complete") {
      transition("recommendations_report_generating");
    }
  }, [stage, transition]);

  // Auto-advance from paid_79_chat_complete to implementation report generation
  useEffect(() => {
    if (stage === "paid_79_chat_complete") {
      implGenerationTriggered.current = false;
      transition("implementation_report_generating");
    }
  }, [stage, transition]);

  // Scroll to Recommendations Report section when it starts generating
  useEffect(() => {
    if (stage !== "recommendations_report_generating") return;
    const timer = setTimeout(() => {
      recSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [stage]);

  // Scroll to Implementation Guide section when it starts generating
  useEffect(() => {
    if (stage !== "implementation_report_generating") return;
    const timer = setTimeout(() => {
      implSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(timer);
  }, [stage]);

  // Mark free report as displayed
  function handleReportDisplayed() {
    if (state.deliverables.platform_consolidation_snapshot.status !== "displayed") {
      dispatch({
        type: "SET_DELIVERABLE_STATUS",
        key: "platform_consolidation_snapshot",
        status: "displayed",
      });
    }
  }

  // Mark implementation guide as displayed (needed before Done-With-You offer unlocks)
  function handleImplReportDisplayed() {
    if (state.deliverables.implementation_guide_sop.status !== "displayed") {
      dispatch({
        type: "SET_DELIVERABLE_STATUS",
        key: "implementation_guide_sop",
        status: "displayed",
      });
    }
  }

  // Chat only for basic intake stages — questionnaire stages each have their own component
  const showChat = [
    "intro", "collect_name", "collect_business_basics",
    "audit_in_progress", "audit_wrap_up",
  ].includes(stage);

  // v2.0: questionnaire display flags
  const showFreeQuestionnaire = [
    "free_questionnaire_loading", "free_questionnaire_active", "free_questionnaire_complete",
  ].includes(stage);

  const showPaid29Questionnaire = [
    "paid_29_questionnaire_loading", "paid_29_questionnaire_active", "paid_29_questionnaire_complete",
  ].includes(stage);

  // Adaptive tap-based intake for the $79 Implementation Guide
  const showPaid79Questionnaire = stage === "paid_79_chat_active";

  // Free report display
  const showGenerating = stage === "free_report_generating";
  const showFreeReport = (
    stage === "free_report_ready" ||
    stage === "recommendations_payment_pending" ||
    stage === "recommendations_verified" ||
    stage === "recommendations_report_generating" ||
    stage === "recommendations_report_ready" ||
    stage === "implementation_payment_pending" ||
    stage === "implementation_email_requested" ||
    stage === "implementation_verifying" ||
    // paid_79_chat_active / paid_79_chat_complete excluded — chat uses flex-1 h-full layout
    stage === "implementation_report_generating" ||
    stage === "implementation_report_ready" ||
    stage === "done_with_you_payment_pending" ||
    stage === "done_with_you_email_requested" ||
    stage === "done_with_you_verifying" ||
    stage === "done_with_you_verified" ||
    stage === "complete"
  ) && !!(pdfBase64 || reportData);
  const showFreeOffer = stage === "free_report_ready" || stage === "recommendations_payment_pending";

  // Recommendations report display
  const showRecGenerating = stage === "recommendations_report_generating";
  const showRecReport = (
    stage === "recommendations_report_ready" ||
    stage === "implementation_payment_pending" ||
    stage === "implementation_email_requested" ||
    stage === "implementation_verifying" ||
    // paid_79_chat_active / paid_79_chat_complete excluded — chat uses flex-1 h-full layout
    stage === "implementation_report_generating" ||
    stage === "implementation_report_ready" ||
    stage === "done_with_you_payment_pending" ||
    stage === "done_with_you_email_requested" ||
    stage === "done_with_you_verifying" ||
    stage === "done_with_you_verified" ||
    stage === "complete"
  ) && !!(recPdfBase64 || recReportData);
  // Keep the Rec offer visible through all implementation payment/verifying stages
  const showRecOffer = (
    stage === "recommendations_report_ready" ||
    stage === "implementation_payment_pending" ||
    stage === "implementation_email_requested" ||
    stage === "implementation_verifying"
  );

  // Implementation Guide display
  const showImplGenerating = stage === "implementation_report_generating";
  const showImplReport = stage === "implementation_report_ready" && !!(implPdfBase64 || implReportData);
  // Show pending-delivery card at ready when no PDF (403 manual delivery path)
  const showImplPending = stage === "implementation_report_ready" && !implPdfBase64 && !implReportData;
  // Keep the Impl offer visible at done_with_you_payment_pending for the same reason
  const showImplOffer = stage === "implementation_report_ready" || stage === "done_with_you_payment_pending";

  // Done-With-You complete screen
  const showComplete = stage === "complete";

  // Backward-compat alias for existing JSX references
  const showReport = showFreeReport;
  const showOffer = showFreeOffer;

  return (
    <div className="fixed inset-0 flex flex-col bg-brand-light">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 bg-white border-b border-brand-border">
        <GSpaceAiLogo size="sm" showWordmark />
        <ProgressIndicator stage={stage} />
        <button
          onClick={() => {
            if (confirm("Start a new assessment? Your current progress will be lost.")) {
              // Reset in-memory state first, then clear localStorage, then navigate
              dispatch({ type: "RESET_SESSION" });
              import("@/src/lib/persistence").then(({ clearState }) => {
                clearState();
                window.location.href = "/";
              });
            }
          }}
          className="text-xs text-brand-dark/40 hover:text-brand-dark/70 transition-colors"
        >
          Start Over
        </button>
      </header>

      {/* Main scrollable area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full h-full flex flex-col">

          {/* Chat — basic intake only (intro → audit_wrap_up) */}
          {showChat && (
            <div className="flex-1 flex flex-col min-h-0">
              <ChatInterface />
            </div>
          )}

          {/* Adaptive tap-based $79 intake — replaces the open chat */}
          {showPaid79Questionnaire && (
            <AdaptivePaid79Questionnaire
              freeIntakeAnswers={state.audit.freeIntakeAnswers}
              paid29IntakeAnswers={state.audit.paid29IntakeAnswers}
              freeAnalysisData={state.audit.freeAnalysisData}
              freeReportSummary={state.audit.freeReportSummary}
              paid29ReportContent={
                recReportData
                  ? String((recReportData as Record<string, unknown>).executiveSummary ?? "")
                  : undefined
              }
              onAnswered={(answers) => {
                dispatch({
                  type: "SET_PAID79_CHAT_ANSWERS",
                  answers: answers.map(a => ({
                    question: a.question,
                    answer:   a.selectedOptions.join(", "),
                  })),
                });
              }}
              onComplete={(answers) => {
                dispatch({
                  type: "SET_PAID79_CHAT_ANSWERS",
                  answers: answers.map(a => ({
                    question: a.question,
                    answer:   a.selectedOptions.join(", "),
                  })),
                });
                transition("paid_79_chat_complete");
              }}
            />
          )}

          {/* Free tier questionnaire — Q1-Q5 hardcoded, Q6-Q10 fetched after Q5 */}
          {showFreeQuestionnaire && (
            <QuestionnaireStep
              questions={state.audit.freeQuestions}
              isLoading={freeQuestionsLoading || stage === "free_questionnaire_loading"}
              tierLabel="Free Audit"
              totalQuestions={10}
              fetchMoreAfterIndex={4}
              initialIndex={stage === "free_questionnaire_active" ? state.audit.currentQuestionIndex : 0}
              initialAnswers={state.audit.freeIntakeAnswers}
              onAnswered={(questionId, answer) => {
                // Persist current question index for page-refresh resume
                dispatch({ type: "SET_CURRENT_QUESTION_INDEX", index: state.audit.currentQuestionIndex + 1 });
                // Store name from Q4, business name from Q5
                if (questionId === "hq4" && answer.selectedOptions[0]) {
                  dispatch({ type: "SET_USER", user: { name: answer.selectedOptions[0] } });
                }
                if (questionId === "hq5" && answer.selectedOptions[0]) {
                  dispatch({ type: "SET_USER", user: { businessName: answer.selectedOptions[0] } });
                }
                // Early-funnel session capture — fire and forget so it never blocks the UI
                {
                  let sessionUpdate: { stage?: string; name?: string; businessName?: string } | null = null;
                  if (questionId === "hq1") {
                    sessionUpdate = { stage: "intake_started" };
                  } else if (questionId === "hq4" && answer.selectedOptions[0]) {
                    sessionUpdate = { stage: "name_captured", name: answer.selectedOptions[0] };
                  } else if (questionId === "hq5" && answer.selectedOptions[0]) {
                    sessionUpdate = { stage: "business_name_captured", businessName: answer.selectedOptions[0] };
                  }
                  if (sessionUpdate) {
                    fetch("/api/update-session", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sessionId: state.sessionId, data: sessionUpdate }),
                    }).catch((err) => console.warn("[session-capture]", err));
                  }
                }
              }}
              onFetchMore={async (answeredSoFar: QuestionnaireAnswer[]) => {
                const res = await fetch("/api/generate-questions", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    tier: "free",
                    questionCount: 5,
                    priorContext: { fixedAnswers: answeredSoFar },
                  }),
                });
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                if (!data.questions?.length) throw new Error("No questions returned for Q6-10");
                // Store all 10 answers (Q1-5 from hardcoded + Q6-10 from Gemini) for later report context
                dispatch({ type: "SET_FREE_QUESTIONS", questions: [...state.audit.freeQuestions, ...data.questions] });
                return data.questions;
              }}
              onComplete={(answers: QuestionnaireAnswer[]) => {
                dispatch({ type: "SET_FREE_INTAKE_ANSWERS", answers });
                dispatch({ type: "SET_CURRENT_QUESTION_INDEX", index: 0 });
                transition("free_questionnaire_complete");
              }}
            />
          )}

          {/* $29 tier questionnaire */}
          {showPaid29Questionnaire && (
            <QuestionnaireStep
              questions={state.audit.paid29Questions}
              isLoading={paid29QuestionsLoading || stage === "paid_29_questionnaire_loading"}
              tierLabel="Recommendations Report"
              initialIndex={stage === "paid_29_questionnaire_active" ? state.audit.currentQuestionIndex : 0}
              initialAnswers={state.audit.paid29IntakeAnswers}
              onComplete={(answers: QuestionnaireAnswer[]) => {
                dispatch({ type: "SET_PAID29_INTAKE_ANSWERS", answers });
                dispatch({ type: "SET_CURRENT_QUESTION_INDEX", index: 0 });
                transition("paid_29_questionnaire_complete");
              }}
            />
          )}

          {/* Questionnaire error */}
          {questionnaireError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center max-w-md">
                <p className="text-brand-red font-semibold mb-2">Failed to load questions</p>
                <p className="text-brand-dark/60 text-sm mb-4">{questionnaireError}</p>
                <button
                  onClick={() => {
                    setQuestionnaireError(null);
                    freeQuestionsTriggered.current   = false;
                    paid29QuestionsTriggered.current = false;
                    if (stage === "free_questionnaire_loading")   dispatch({ type: "TRANSITION_STAGE", to: "free_questionnaire_loading" });
                    if (stage === "paid_29_questionnaire_loading") dispatch({ type: "TRANSITION_STAGE", to: "paid_29_questionnaire_loading" });
                  }}
                  className="text-brand-blue text-sm font-medium underline"
                >Try again</button>
              </div>
            </div>
          )}

          {/* Generating spinner */}
          {showGenerating && !reportError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center">
                <div className="w-14 h-14 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-5" />
                <p className="text-brand-dark font-semibold text-lg mb-2">
                  Generating your Platform Consolidation Snapshot
                </p>
                <p className="text-brand-dark/50 text-sm">
                  Analyzing your software stack and calculating your consolidation score...
                </p>
              </div>
            </div>
          )}

          {/* Error state */}
          {showGenerating && reportError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center max-w-md">
                <p className="text-brand-red font-semibold mb-2">Report generation failed</p>
                <p className="text-brand-dark/60 text-sm mb-4">{reportError}</p>
                <button
                  onClick={() => {
                    generationTriggered.current = false;
                    setReportError(null);
                    // Re-trigger by briefly leaving and re-entering the stage
                    dispatch({ type: "TRANSITION_STAGE", to: "free_report_generating" });
                  }}
                  className="text-brand-blue text-sm font-medium underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Report + offer */}
          {showReport && reportData && pdfBase64 && (
            <div className="py-4">
              <ReportViewer
                data={reportData as unknown as import("@/src/lib/reportGeneration").FreeReportData}
                pdfBase64={pdfBase64}
                onMarkDisplayed={handleReportDisplayed}
              />
            </div>
          )}

          {showFreeOffer && (
            <OfferCard
              productKey="recommendations_report"
              onPayNow={() => transition("recommendations_payment_pending")}
              onVerifyPayment={() => setVerifyModalProduct("recommendations_report")}
            />
          )}

          {/* Scroll anchor — jumped to when recommendations_report_generating starts */}
          <div ref={recSectionRef} />

          {/* ── Recommendations Report generating spinner ── */}
          {showRecGenerating && !recReportError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center">
                <div className="w-14 h-14 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-5" />
                <p className="text-brand-dark font-semibold text-lg mb-2">
                  Generating your Recommendations Report
                </p>
                <p className="text-brand-dark/50 text-sm">
                  Building your personalized roadmap — this takes about 30 seconds...
                </p>
              </div>
            </div>
          )}

          {showRecGenerating && recReportError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center max-w-md">
                <p className="text-brand-red font-semibold mb-2">Report generation failed</p>
                <p className="text-brand-dark/60 text-sm mb-4">{recReportError}</p>
                <button
                  onClick={() => { recGenerationTriggered.current = false; setRecReportError(null); setRecRetryCount(c => c + 1); }}
                  className="text-brand-blue text-sm font-medium underline"
                >Try again</button>
              </div>
            </div>
          )}

          {/* ── Recommendations Report display ── */}
          {showRecReport && recReportData && recPdfBase64 && (
            <div className="py-4">
              <RecommendationsReportCard
                data={recReportData}
                pdfBase64={recPdfBase64}
                businessName={state.user.businessName}
                generatedAt={(recReportData.generatedAt as string) ?? new Date().toISOString()}
                freeAnalysisData={state.audit.freeAnalysisData}
                onMarkDisplayed={() => dispatch({ type: "SET_DELIVERABLE_STATUS", key: "recommendations_report", status: "displayed" })}
              />
            </div>
          )}

          {showRecOffer && (
            <OfferCard
              productKey="implementation_guide_sop"
              onPayNow={() => transition("implementation_payment_pending")}
              onVerifyPayment={() => setVerifyModalProduct("implementation_guide_sop")}
            />
          )}

          {/* Scroll anchor — jumped to when implementation_report_generating starts */}
          <div ref={implSectionRef} />

          {/* ── Implementation Guide generating spinner ── */}
          {showImplGenerating && !implReportError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center">
                <div className="w-14 h-14 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-5" />
                <p className="text-brand-dark font-semibold text-lg mb-2">
                  Preparing your Implementation Guide + SOP Book
                </p>
                <p className="text-brand-dark/50 text-sm">
                  Building your step-by-step roadmap and standard operating procedures...
                </p>
              </div>
            </div>
          )}

          {showImplGenerating && implReportError && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center max-w-md">
                <p className="text-brand-red font-semibold mb-2">Report generation failed</p>
                <p className="text-brand-dark/60 text-sm mb-4">{implReportError}</p>
                <button
                  onClick={() => { implGenerationTriggered.current = false; setImplReportError(null); setImplRetryCount(c => c + 1); }}
                  className="text-brand-blue text-sm font-medium underline"
                >Try again</button>
              </div>
            </div>
          )}

          {/* ── Implementation Guide report display ── */}
          {showImplReport && (
            <div className="py-4">
              <ImplDeliveryCard
                data={implReportData}
                pdfBase64={implPdfBase64}
                businessName={state.user.businessName}
                generatedAt={(implReportData?.generatedAt as string) ?? new Date().toISOString()}
                freeAnalysisData={state.audit.freeAnalysisData}
                onMarkDisplayed={handleImplReportDisplayed}
              />
            </div>
          )}

          {/* ── Implementation Guide pending delivery (manual delivery fallback) ── */}
          {showImplPending && (
            <div className="py-4">
              <ImplDeliveryCard
                data={null}
                pdfBase64={null}
                businessName={state.user.businessName}
                generatedAt={new Date().toISOString()}
                freeAnalysisData={state.audit.freeAnalysisData}
                onMarkDisplayed={handleImplReportDisplayed}
              />
            </div>
          )}

          {/* ── Done-With-You offer ── */}
          {showImplOffer && (
            <OfferCard
              productKey="done_with_you"
              onPayNow={() => transition("done_with_you_payment_pending")}
              onVerifyPayment={() => setVerifyModalProduct("done_with_you")}
            />
          )}

          {/* ── Done-With-You complete screen ── */}
          {showComplete && (
            <div className="flex-1 flex items-center justify-center px-6 py-16">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-brand-green">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-brand-dark mb-2">You&apos;re All Set!</h2>
                <p className="text-brand-dark/60 text-sm leading-relaxed mb-6">
                  Your Done-With-You Implementation has been confirmed. Our team will reach out within 1–2 business days to schedule your onboarding session.
                </p>
                <p className="text-xs text-brand-dark/40">
                  Questions? Email us at support@gspacesolutions.org
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Payment Verification Modal */}
      {verifyModalProduct && (
        <PaymentVerificationModal
          productKey={verifyModalProduct}
          sessionId={state.sessionId}
          onVerified={(email) => {
            // Payment confirmed — update state and advance to the correct verified stage
            dispatch({
              type: "SET_PAYMENT_VERIFIED",
              productKey: verifyModalProduct,
              email,
            });
            setVerifyModalProduct(null);
            if (verifyModalProduct === "recommendations_report") {
              transition("recommendations_verified");
            } else if (verifyModalProduct === "implementation_guide_sop") {
              transition("implementation_verified");
            } else if (verifyModalProduct === "done_with_you") {
              transition("done_with_you_verified");
            }
          }}
          onCancel={() => setVerifyModalProduct(null)}
        />
      )}
    </div>
  );
}
