"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAppState } from "@/src/context/AppStateContext";
import { APP_COPY } from "@/src/lib/constants";
import { isAuditStage } from "@/src/lib/workflowState";
import type { ChatMessage, GeminiDualResponse, WorkflowStage } from "@/src/lib/types";
import MessageBubble from "./MessageBubble";
import LoadingState from "./LoadingState";
import ErrorMessage from "./ErrorMessage";

function makeId() {
  return Math.random().toString(36).slice(2);
}

function makeMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return { id: makeId(), role, content, timestamp: new Date().toISOString() };
}

export default function ChatInterface() {
  const { state, dispatch, transition, isHydrated } = useAppState();
  const { stage, messages, user, sessionId } = state;

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasInitialized = useRef(false);

  // ------------------------------------------------------------
  // Auto-scroll to bottom on new messages
  // ------------------------------------------------------------
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ------------------------------------------------------------
  // Counter-scroll when keyboard opens on mobile.
  // iOS auto-scrolls the messages container when any input is focused,
  // pushing messages off screen. We snap back to the bottom immediately.
  // ------------------------------------------------------------
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    let lastHeight = vv.height;
    const handleResize = () => {
      if (vv.height < lastHeight) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        });
      }
      lastHeight = vv.height;
    };
    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  // ------------------------------------------------------------
  // Initialize: add intro message only AFTER hydration is complete.
  // This ensures we know whether localStorage had existing messages.
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isHydrated) return;           // wait for localStorage to load
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (messages.length > 0) return;   // restored session — don't add intro again

    const introMsg = makeMessage("assistant", APP_COPY.introMessage);
    dispatch({ type: "ADD_MESSAGE", message: introMsg });
    transition("collect_name");
  }, [isHydrated, messages.length, dispatch, transition]);

  // ------------------------------------------------------------
  // Apply extracted data and determine stage transitions
  // ------------------------------------------------------------
  const applyExtractionAndTransition = useCallback(
    (extracted: GeminiDualResponse["extractedData"], currentStage: WorkflowStage) => {
      dispatch({ type: "MERGE_AUDIT_DATA", data: extracted });

      // Update user profile from extracted fields
      const up = extracted.userProfile;
      if (up) {
        const updates: Partial<typeof user> = {};
        if (up.name) updates.name = up.name;
        if (up.businessName) updates.businessName = up.businessName;
        if (up.businessType) updates.businessType = up.businessType;
        if (up.businessSize) updates.businessSize = up.businessSize;
        if (up.industry) updates.industry = up.industry;
        if (up.currentGoogleWorkspaceUsage)
          updates.currentGoogleWorkspaceUsage = up.currentGoogleWorkspaceUsage;
        if (Object.keys(updates).length > 0) {
          dispatch({ type: "SET_USER", user: updates });
        }
      }

      const name = up?.name || user.name;
      const bizName = up?.businessName || user.businessName;

      // ── Priority 1: confirmedReady — works from ANY audit stage.
      // The conversation may have outrun the stage machine (e.g. stage stuck at
      // collect_business_basics). Always move to report generation when confirmed.
      if (extracted.confirmedReady && isAuditStage(currentStage)) {
        transition("free_report_generating");
        return;
      }

      // ── Priority 2: auditComplete — move to wrap-up from any non-wrap-up audit stage.
      if (extracted.auditComplete && isAuditStage(currentStage) && currentStage !== "audit_wrap_up") {
        transition("audit_wrap_up");
        return;
      }

      // ── Profile-based transitions (lower priority, run when AI hasn't signalled completion)
      if ((currentStage === "collect_name" || currentStage === "intro") && name) {
        transition("collect_business_basics");
        return;
      }
      // Transition to audit_in_progress once we have ANY business name.
      // Removed businessType requirement — Gemini doesn't always extract it in the same exchange.
      if (currentStage === "collect_business_basics" && bizName) {
        transition("audit_in_progress");
        return;
      }
    },
    [dispatch, transition, user.name, user.businessName, user.businessType]
  );

  // ------------------------------------------------------------
  // Core: call the API and handle the response
  // Used by both sendMessage and retryLastApiCall
  // ------------------------------------------------------------
  const callChatAPI = useCallback(
    async (messagesArray: ChatMessage[], userText: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const userMessageCount = messagesArray.filter(m => m.role === "user").length;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesArray,
            userMessage: userText,
            stage,
            sessionId,
            isFirstMessage: userMessageCount === 1,
            hadBusinessName: !!user.businessName,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error ?? `Server error: ${res.status}`);
        }

        const data = (await res.json()) as GeminiDualResponse & { error?: string };
        const aiMsg = makeMessage("assistant", data.customerResponse);
        dispatch({ type: "ADD_MESSAGE", message: aiMsg });

        if (data.extractedData) {
          applyExtractionAndTransition(data.extractedData, stage);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        console.error("[ChatInterface] API error:", msg);
        setError(msg);
      } finally {
        setIsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [dispatch, applyExtractionAndTransition, stage]
  );

  // ------------------------------------------------------------
  // Send a NEW message (adds user bubble, then calls API)
  // ------------------------------------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      setInput("");

      const userMsg = makeMessage("user", text.trim());
      dispatch({ type: "ADD_MESSAGE", message: userMsg });

      // Build array including the new user message
      await callChatAPI([...messages, userMsg], text.trim());
    },
    [isLoading, dispatch, messages, callChatAPI]
  );

  // ------------------------------------------------------------
  // Retry: re-sends the last user message WITHOUT adding a duplicate.
  // Uses the messages already in state (the user bubble is already there).
  // ------------------------------------------------------------
  const retryLastApiCall = useCallback(async () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || isLoading) return;
    setError(null);
    await callChatAPI(messages, lastUser.content);
  }, [messages, isLoading, callChatAPI]);

  // ------------------------------------------------------------
  // Keyboard: Enter sends, Shift+Enter newline
  // ------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const canSendMessage =
    isAuditStage(stage) ||
    stage === "collect_name" ||
    stage === "collect_business_basics";

  // Don't render until hydrated — prevents flash of wrong content
  if (!isHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <LoadingState />}

        {error && !isLoading && (
          <ErrorMessage
            message={"We're experiencing unusually high demand right now.\nPlease try again in a few seconds."}
            onRetry={retryLastApiCall}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {canSendMessage && (
        <div className="border-t border-brand-border bg-white px-4 py-3">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onTouchStart={() => window.scrollTo(0, 0)}
              onFocus={() => {
                setTimeout(() => window.scrollTo(0, 0), 100);
                setTimeout(() => window.scrollTo(0, 0), 300);
              }}
              placeholder={
                stage === "collect_name"
                  ? "Type your name..."
                  : stage === "collect_business_basics"
                  ? "Tell me about your business..."
                  : "Type your response..."
              }
              rows={1}
              disabled={isLoading}
              className="
                flex-1 resize-none rounded-xl border border-brand-border px-4 py-2.5
                text-base sm:text-sm text-brand-dark placeholder-brand-dark/40
                focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all overflow-hidden
              "
              style={{ height: "42px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              aria-label="Send message"
              className="
                flex-shrink-0 w-10 h-10 rounded-xl bg-brand-blue text-white
                flex items-center justify-center
                hover:bg-brand-blue/90 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-4 h-4"
              >
                <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-brand-dark/30 mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
