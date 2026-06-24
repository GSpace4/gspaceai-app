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
  hadBusinessName?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, userMessage, stage, sessionId, isFirstMessage, hadBusinessName } = body;

    if (!userMessage?.trim()) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // Milestone 1: first message — create session stub
    if (isFirstMessage && sessionId) {
      upsertSession(sessionId, { stage: "audit_in_progress" }).catch(() => {});
    }

    const response = await callGeminiAudit(messages, userMessage.trim(), stage);

    if (sessionId) {
      const profile = response.extractedData?.userProfile as {
        name?: string;
        businessName?: string;
        businessType?: string;
        industry?: string;
      } | undefined;

      const userMessageCount = messages.filter(m => m.role === "user").length;

      // Milestone 2: business name just extracted for the first time
      if (!hadBusinessName && profile?.businessName) {
        try {
          await upsertSession(sessionId, {
            name:         profile.name         || undefined,
            businessName: profile.businessName,
            businessType: profile.businessType || undefined,
            industry:     profile.industry     || undefined,
          });
        } catch {}
      }

      // Milestone 3: 5th user message
      if (userMessageCount === 5) {
        try {
          await upsertSession(sessionId, {
            ...(profile?.name         && { name:         profile.name }),
            ...(profile?.businessName && { businessName: profile.businessName }),
            ...(profile?.businessType && { businessType: profile.businessType }),
            ...(profile?.industry     && { industry:     profile.industry }),
          });
        } catch {}
      }
    }

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
