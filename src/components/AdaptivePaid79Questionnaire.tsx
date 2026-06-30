"use client";

// ============================================================
// GSpaceAi — AdaptivePaid79Questionnaire
// Replaces the $79 open chat. Generates one question per call
// so Gemini can adapt to each answer before deciding what to
// ask next. Renders tap cards (or text input) exactly like
// QuestionnaireStep. Hard cap: 10 questions maximum, enforced
// both here and server-side.
// ============================================================

import { useState, useEffect, useRef } from "react";
import type { GeneratedQuestion, QuestionnaireAnswer, FreeAnalysisData } from "@/src/lib/types";

type Props = {
  freeIntakeAnswers:   QuestionnaireAnswer[];
  paid29IntakeAnswers: QuestionnaireAnswer[];
  freeAnalysisData:    FreeAnalysisData | null;
  freeReportSummary?:  string;
  paid29ReportContent?: string;
  onAnswered: (answers: QuestionnaireAnswer[]) => void;
  onComplete: (answers: QuestionnaireAnswer[]) => void;
};

export default function AdaptivePaid79Questionnaire({
  freeIntakeAnswers,
  paid29IntakeAnswers,
  freeAnalysisData,
  freeReportSummary,
  paid29ReportContent,
  onAnswered,
  onComplete,
}: Props) {
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [questionNumber,   setQuestionNumber]  = useState(1);
  const [answers,          setAnswers]          = useState<QuestionnaireAnswer[]>([]);
  const [selected,         setSelected]         = useState<string[]>([]);
  const [textValue,        setTextValue]        = useState("");
  const [isLoading,        setIsLoading]        = useState(true);
  const [visible,          setVisible]          = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const fetchTriggered = useRef(false);

  useEffect(() => {
    if (fetchTriggered.current) return;
    fetchTriggered.current = true;
    fetchQuestion(1, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchQuestion(num: number, answeredSoFar: QuestionnaireAnswer[]) {
    setIsLoading(true);
    setError(null);
    setSelected([]);
    setTextValue("");
    try {
      const res = await fetch("/api/generate-questions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: "paid_79",
          priorContext: {
            freeIntakeAnswers,
            paid29IntakeAnswers,
            freeAnalysisData,
            freeReportSummary,
            paid29ReportContent,
          },
          answeredSoFar,
          questionNumber: num,
        }),
      });

      const data = (await res.json()) as {
        question?: GeneratedQuestion | null;
        isComplete?: boolean;
        error?: string;
      };

      if (data.error) throw new Error(data.error);

      if (data.isComplete || !data.question) {
        onComplete(answeredSoFar);
        return;
      }

      setCurrentQuestion(data.question);
      setQuestionNumber(num);
      setVisible(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load question";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAnswer(opts: string[]) {
    if (!currentQuestion) return;
    const answer: QuestionnaireAnswer = {
      questionId:      currentQuestion.id,
      question:        currentQuestion.question,
      selectedOptions: opts,
    };
    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);
    onAnswered(updatedAnswers);

    // Fade out, then fetch next question
    setVisible(false);
    setTimeout(() => fetchQuestion(questionNumber + 1, updatedAnswers), 150);
  }

  function handleTap(label: string) {
    if (!currentQuestion) return;
    if (currentQuestion.type === "single_select") {
      handleAnswer([label]);
    } else {
      setSelected(prev =>
        prev.includes(label) ? prev.filter(o => o !== label) : [...prev, label]
      );
    }
  }

  function handleContinue() {
    if (!currentQuestion) return;
    if (currentQuestion.type === "text_input") {
      if (!textValue.trim()) return;
      handleAnswer([textValue.trim()]);
    } else {
      if (selected.length === 0) return;
      handleAnswer(selected);
    }
  }

  // Progress bar fills based on current question number out of 10 max
  const progressPct = Math.min((questionNumber / 10) * 100, 100);

  // ── Loading skeleton ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-brand-light overflow-hidden">
        <div className="flex-shrink-0 px-6 pt-5 pb-3 bg-brand-light">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
              Implementation Guide
            </span>
            <span className="text-xs text-brand-dark/50 font-medium">
              Question {questionNumber} of up to 10
            </span>
          </div>
          <div className="w-full bg-brand-border rounded-full h-1.5">
            <div
              className="bg-brand-blue h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-10 h-10 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mb-4" />
          <p className="text-brand-dark font-semibold text-sm">
            {questionNumber === 1 ? "Preparing your intake questions…" : "Thinking about what to ask next…"}
          </p>
        </div>
        <div className="flex-shrink-0 px-6 pb-5 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white rounded-2xl border border-brand-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="text-center max-w-md">
          <p className="text-brand-red font-semibold mb-2">Failed to load question</p>
          <p className="text-brand-dark/60 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchQuestion(questionNumber, answers)}
            className="text-brand-blue text-sm font-medium underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) return null;

  // ── Question UI ───────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-brand-light overflow-hidden">

      {/* Progress */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 bg-brand-light">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-brand-blue uppercase tracking-wider">
            Implementation Guide
          </span>
          <span className="text-xs text-brand-dark/50 font-medium">
            Question {questionNumber} of up to 10
          </span>
        </div>
        <div className="w-full bg-brand-border rounded-full h-1.5">
          <div
            className="bg-brand-blue h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Scrollable question + options */}
      <div
        className="flex-1 overflow-y-auto px-6 pt-4 pb-6"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.15s ease" }}
      >
        <h2 className="text-base font-bold text-brand-dark leading-tight mb-6">
          {currentQuestion.question}
        </h2>

        {currentQuestion.type === "multi_select" && (
          <p className="text-xs text-brand-dark/50 mb-4 -mt-2">Select all that apply</p>
        )}

        {/* text_input */}
        {currentQuestion.type === "text_input" && (
          <div className="space-y-4">
            <input
              type="text"
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && textValue.trim()) handleContinue(); }}
              placeholder={currentQuestion.placeholder ?? "Type your answer…"}
              className="w-full px-5 py-4 rounded-2xl border-2 border-brand-border bg-white text-brand-dark focus:outline-none focus:border-brand-blue transition-colors"
              style={{ fontSize: "16px" }}
            />
            <button
              onClick={handleContinue}
              disabled={!textValue.trim()}
              className="w-full bg-brand-blue text-white font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
            >
              Continue
            </button>
          </div>
        )}

        {/* single_select / multi_select tap cards */}
        {(currentQuestion.type === "single_select" || currentQuestion.type === "multi_select") && (
          <>
            <div className="space-y-3">
              {currentQuestion.options.map(option => {
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

            {currentQuestion.type === "multi_select" && (
              <button
                onClick={handleContinue}
                disabled={selected.length === 0}
                className="mt-6 w-full bg-brand-blue text-white font-semibold py-4 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
              >
                Continue
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
