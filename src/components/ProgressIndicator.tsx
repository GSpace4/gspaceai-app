"use client";

import { getProgressStep, PROGRESS_STEPS } from "@/src/lib/workflowState";
import type { WorkflowStage } from "@/src/lib/types";

type Props = { stage: WorkflowStage };

export default function ProgressIndicator({ stage }: Props) {
  const currentStep = getProgressStep(stage);

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {PROGRESS_STEPS.map(({ step, label }, idx) => {
        const isComplete = step < currentStep;
        const isActive = step === currentStep;

        return (
          <div key={step} className="flex items-center">
            {/* Step dot */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-2.5 h-2.5 rounded-full transition-all duration-300
                  ${isComplete ? "bg-brand-green" : ""}
                  ${isActive ? "bg-brand-blue scale-125" : ""}
                  ${!isComplete && !isActive ? "bg-brand-border" : ""}
                `}
              />
              <span
                className={`
                  hidden sm:block text-xs font-medium transition-colors
                  ${isActive ? "text-brand-blue" : ""}
                  ${isComplete ? "text-brand-green" : ""}
                  ${!isComplete && !isActive ? "text-brand-dark/40" : ""}
                `}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {idx < PROGRESS_STEPS.length - 1 && (
              <div
                className={`
                  w-6 sm:w-10 h-px mx-1 transition-colors duration-300
                  ${isComplete ? "bg-brand-green" : "bg-brand-border"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
