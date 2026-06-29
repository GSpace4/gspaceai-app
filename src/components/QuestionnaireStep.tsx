"use client";

// ============================================================
// GSpaceAi — QuestionnaireStep
// Tap-based questionnaire UI. One question at a time.
// Works for both free tier and $29 tier intake.
// No typing required — all answers via tap.
// ============================================================

import { useState, useEffect } from "react";
import type { GeneratedQuestion, QuestionnaireAnswer } from "@/src/lib/types";

type Props = {
  questions: GeneratedQuestion[];
  onComplete: (answers: QuestionnaireAnswer[]) => void;
  tierLabel: string;
  isLoading?: boolean;
  initialIndex?: number;
  initialAnswers?: QuestionnaireAnswer[];
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
  questions,
  onComplete,
  tierLabel,
  isLoading = false,
  initialIndex = 0,
  initialAnswers = [],
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [answers, setAnswers]           = useState<QuestionnaireAnswer[]>(initialAnswers);
  const [selected, setSelected]         = useState<string[]>([]);
  const [visible, setVisible]           = useState(true);

  const total    = questions.length;
  const question = questions[currentIndex] ?? null;
  const isLast   = currentIndex === total - 1;

  // Restore prior selection when navigating between questions
  useEffect(() => {
    if (!question) return;
    const prior = answers.find(a => a.questionId === question.id);
    setSelected(prior?.selectedOptions ?? []);
  }, [currentIndex, question?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function fade(callback: () => void) {
    setVisible(false);
    setTimeout(() => { callback(); setVisible(true); }, 150);
  }

  function advance(updatedAnswers: QuestionnaireAnswer[]) {
    if (isLast) {
      onComplete(updatedAnswers);
      return;
    }
    fade(() => {
      setAnswers(updatedAnswers);
      setCurrentIndex(i => i + 1);
    });
  }

  function handleTap(label: string) {
    if (!question) return;

    if (question.type === "single_select") {
      const next: QuestionnaireAnswer = {
        questionId: question.id,
        question:   question.question,
        selectedOptions: [label],
      };
      advance(upsertAnswer(answers, next));
    } else {
      setSelected(prev =>
        prev.includes(label) ? prev.filter(o => o !== label) : [...prev, label]
      );
    }
  }

  function handleContinue() {
    if (!question || selected.length === 0) return;
    const next: QuestionnaireAnswer = {
      questionId:      question.id,
      question:        question.question,
      selectedOptions: selected,
    };
    advance(upsertAnswer(answers, next));
  }

  function handleBack() {
    if (currentIndex === 0) return;
    fade(() => setCurrentIndex(i => i - 1));
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading || !question) {
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
            Question {currentIndex + 1} of {total}
          </span>
        </div>
        <div className="w-full bg-brand-border rounded-full h-1.5">
          <div
            className="bg-brand-blue h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable question + options */}
      <div
        className="flex-1 overflow-y-auto px-6 pt-4 pb-6"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}
      >
        <h2 className="text-xl font-bold text-brand-dark leading-tight mb-6">
          {question.question}
        </h2>

        {question.type === "multi_select" && (
          <p className="text-xs text-brand-dark/50 mb-4 -mt-2">Select all that apply</p>
        )}

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
      </div>

      {/* Back button — questions 2-7 */}
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
