"use client";

import { useRouter } from "next/navigation";
import { useAppState } from "@/src/context/AppStateContext";
import { clearState } from "@/src/lib/persistence";

export default function StartAssessmentButton() {
  const router = useRouter();
  const { resetSession } = useAppState();

  function handleClick() {
    // 1. Reset in-memory React state (AppStateContext stays mounted across navigations)
    resetSession();
    // 2. Clear localStorage so the hydration useEffect doesn't reload the old session
    clearState();
    // 3. Navigate to the audit page
    router.push("/audit");
  }

  return (
    <button
      onClick={handleClick}
      className="
        inline-flex items-center gap-2 bg-brand-blue text-white
        font-semibold text-lg px-8 py-4 rounded-full
        hover:bg-brand-blue/90 active:scale-95
        transition-all duration-150 shadow-md hover:shadow-lg
        mb-4
      "
    >
      Start Free Assessment
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path
          fillRule="evenodd"
          d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
