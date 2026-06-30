"use client";

// ============================================================
// GSpaceAi — QuestionnaireStep
// Tap-based (and text-input) questionnaire UI. One question at a time.
// Works for free tier (Q1–Q10) and $29 tier intake.
// ============================================================

import { useState, useEffect, useRef } from "react";
import type { GeneratedQuestion, QuestionnaireAnswer } from "@/src/lib/types";
import { HQ2_PRODUCT } from "@/src/lib/hardcodedQuestions";

type Props = {
  questions: GeneratedQuestion[];
  onComplete: (answers: QuestionnaireAnswer[]) => void;
  onAnswered?: (questionId: string, answer: QuestionnaireAnswer) => void;
  tierLabel: string;
  isLoading?: boolean;
  initialIndex?: number;
  initialAnswers?: QuestionnaireAnswer[];
  // Total questions including Gemini-generated ones (e.g. 10 for free tier)
  totalQuestions?: number;
  // Called after fetchMoreAfterIndex to get the remaining questions from Gemini
  onFetchMore?: (answers: QuestionnaireAnswer[]) => Promise<GeneratedQuestion[]>;
  fetchMoreAfterIndex?: number; // 0-indexed; default 4 (after Q5)
};

function upsertAnswer(
  existing: QuestionnaireAnswer[],
  next: QuestionnaireAnswer
): QuestionnaireAnswer[] {
  const idx = existing.findIndex(a => a.questionId === next.questionId);
  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = next;
    return updated;
  }
  return [...existing, next];
}

export default function QuestionnaireStep({
  questions: initialQuestions,
  onComplete,
  onAnswered,
  tierLabel,
  isLoading = false,
  initialIndex = 0,
  initialAnswers = [],
  totalQuestions,
  onFetchMore,
  fetchMoreAfterIndex = 4,
}: Props) {
  const [questions, setQuestions]   = useState<GeneratedQuestion[]>(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [answers, setAnswers]       = useState<QuestionnaireAnswer[]>(initialAnswers);
  const [selected, setSelected]     = useState<string[]>([]);
  const [textValue, setTextValue]   = useState("");
  const [visible, setVisible]       = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const fetchedMore = useRef(false);

  const displayTotal = totalQuestions ?? questions.length;
  const question     = questions[currentIndex] ?? null;
  const isLast       = currentIndex === displayTotal - 1;

  // When questions prop updates (e.g. parent swaps Q2 for branching), sync local state
  // but only before the user has gone past that index
  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  // Restore prior selection when navigating between questions
  useEffect(() => {
    if (!question) return;
    const prior = answers.find(a => a.questionId === question.id);
    if (question.type === "text_input") {
      setTextValue(prior?.selectedOptions[0] ?? "");
      setSelected([]);
    } else {
      setSelected(prior?.selectedOptions ?? []);
      setTextValue("");
    }
  }, [currentIndex, question?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function fade(callback: () => void) {
    setVisible(false);
    setTimeout(() => { callback(); setVisible(true); }, 150);
  }

  async function advance(updatedAnswers: QuestionnaireAnswer[]) {
    // Check if we need to fetch more questions before advancing
    const needsFetch = onFetchMore && !fetchedMore.current && currentIndex === fetchMoreAfterIndex;

    if (needsFetch) {
      fetchedMore.current = true;
      setFetchingMore(true);
      try {
        const more = await onFetchMore!(updatedAnswers);
        setQuestions(prev => [...prev, ...more]);
      } catch (err) {
        console.error("[QuestionnaireStep] Failed to fetch more questions:", err);
        fetchedMore.current = false; // allow retry
      } finally {
        setFetchingMore(false);
      }
    }

    if (isLast) {
      onComplete(updatedAnswers);
      return;
    }

    fade(() => {
      setAnswers(updatedAnswers);
      setCurrentIndex(i => i + 1);
    });
  }

  function buildAnswer(opts: string[]): QuestionnaireAnswer {
    return {
      questionId:      question!.id,
      question:        question!.question,
      selectedOptions: opts,
    };
  }

  function handleTap(label: string) {
    if (!question) return;

    if (question.type === "single_select") {
      const next = buildAnswer([label]);
      const updated = upsertAnswer(answers, next);
      onAnswered?.(question.id, next);

      // Q1 branching: swap Q2 when user picks "Product"
      if (question.id === "hq1" && label.includes("Product")) {
        setQuestions(prev => {
          const copy = [...prev];
          if (copy[1]?.id === "hq2") copy[1] = HQ2_PRODUCT;
          return copy;
        });
      }

      advance(updated);
    } else {
      setSelected(prev =>
        prev.includes(label) ? prev.filter(o => o !== label) : [...prev, label]
      );
    }
  }

  function handleContinue() {
    if (!question) return;
    let opts: string[];
    if (question.type === "text_input") {
      if (!textValue.trim()) return;
      opts = [textValue.trim()];
    } else {
      if (selected.length === 0) return;
      opts = selected;
    }
    const next = buildAnswer(opts);
    const updated = upsertAnswer(answers, next);
    onAnswered?.(question.id, next);
    advance(updated);
  }

  function handleBack() {
    if (currentIndex === 0) return;
    fade(() => setCurrentIndex(i => i - 1));
  }

  // ── Initial loading skeleton ──────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-brand-light">
        <div className="w-full max-w-lg text-center">
          <div className="w-10 h-10 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mx-auto mb-5" />
          <p className="text-brand-dark font-semibold text-lg">Preparing your personalized questions...</p>
          <p className="text-brand-dark/50 text-sm mt-1">{tierLabel}</p>
        </div>
        <div className="w-full max-w-lg mt-8 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Mid-questionnaire loading (fetching Q6–Q10) ───────────
  if (fetchingMore) {
    return (
      <div className="flex-1 flex flex-col bg-brand-light">
        <div className="flex-shrink-0 px-6 pt-5 pb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">{tierLabel}</span>
            <span className="text-xs text-brand-dark/50 font-medium">Preparing questions 6–10…</span>
          </div>
          <div className="w-full bg-brand-border rounded-full h-1.5">
            <div className="bg-brand-blue h-1.5 rounded-full transition-all duration-300" style={{ width: "50%" }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-10 h-10 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mb-4" />
          <p className="text-brand-dark font-semibold">Preparing your final questions…</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  // ── Question UI ───────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-brand-light overflow-hidden">

      {/* Progress — always visible */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 bg-brand-light">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
            {tierLabel}
          </span>
          <span className="text-xs text-brand-dark/50 font-medium">
            Question {currentIndex + 1} of {displayTotal}
          </span>
        </div>
        <div className="w-full bg-brand-border rounded-full h-1.5">
          <div
            className="bg-brand-blue h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / displayTotal) * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable question + options */}
      <div
        className="flex-1 overflow-y-auto px-6 pt-4 pb-6"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}
      >
        <h2 className="text-base font-bold text-brand-dark leading-tight mb-6">
          {question.question}
        </h2>

        {question.type === "multi_select" && (
          <p className="text-xs text-brand-dark/50 mb-4 -mt-2">Select all that apply</p>
        )}

        {/* text_input */}
        {question.type === "text_input" && (
          <div className="space-y-4">
            <input
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && textValue.trim()) handleContinue(); }}
              placeholder={question.placeholder ?? "Type your answer…"}
              autoFocus
              className="w-full px-5 py-4 rounded-2xl border-2 border-brand-border bg-white text-brand-dark text-base focus:outline-none focus:border-brand-blue transition-colors"
            />
            <button
              onClick={handleContinue}
              disabled={!textValue.trim()}
              className="w-full bg-brand-blue text-white font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
            >
              {isLast ? "See My Results" : "Continue"}
            </button>
          </div>
        )}

        {/* single_select / multi_select tap cards */}
        {(question.type === "single_select" || question.type === "multi_select") && (
          <>
            <div className="space-y-3">
              {question.options.map(option => {
                const isSelected = selected.includes(option.label);
                return (
                  <button
                    key={option.id}
                    onClick={() => handleTap(option.label)}
                    className={`w-full text-left px-5 py-4 rounded-2xl border-2 transition-all duration-150 active:scale-[0.98] ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue/5"
                        : "border-brand-border bg-white hover:border-brand-blue/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        isSelected ? "border-brand-blue bg-brand-blue" : "border-brand-border"
                      }`}>
                        {isSelected && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-3 h-3">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-brand-dark">{option.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Continue button — multi_select only */}
            {question.type === "multi_select" && (
              <button
                onClick={handleContinue}
                disabled={selected.length === 0}
                className="mt-6 w-full bg-brand-blue text-white font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
              >
                {isLast ? "See My Results" : "Continue"}
              </button>
            )}
          </>
        )}
      </div>

      {/* Back button — questions 2–N */}
      {currentIndex > 0 && (
        <div className="flex-shrink-0 px-6 pb-5">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm text-brand-dark/50 font-medium hover:text-brand-dark transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}
