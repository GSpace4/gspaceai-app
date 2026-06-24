// ============================================================
// GSpaceAi — /api/chat
// Handles audit conversation. Calls Gemini, returns dual response.
// This route does NOT control workflow state — the client does.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { callGeminiAudit } from "@/src/lib/aiAuditLogic";
import { upsertSession } from "@/src/lib/db";
import type { ChatMessage } from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatRequestBody = {
  messages: ChatMessage[];
  userMessage: string;
  stage?: string;
  sessionId?: string;
  isFirstMessage?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, userMessage, stage, sessionId, isFirstMessage } = body;

    if (!userMessage?.trim()) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // Write a session stub on the first user message — captures abandoned audits
    if (isFirstMessage && sessionId) {
      upsertSession(sessionId, { stage: "audit_in_progress" }).catch(() => {});
    }

    const response = await callGeminiAudit(messages, userMessage.trim(), stage);

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Log the full error so we can see exactly what Gemini returned
    console.error("[/api/chat] Error:", message);
    if (err instanceof Error && err.stack) {
      console.error("[/api/chat] Stack:", err.stack);
    }

    // Return a graceful user-facing error
    return NextResponse.json(
      {
        customerResponse:
          "I'm having trouble connecting right now. Please try again in a moment.",
        extractedData: {},
        error: message,
      },
      { status: 500 }
    );
  }
}
