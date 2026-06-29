// ============================================================
// GSpaceAi — /api/chat
// Handles audit conversation. Calls Gemini, returns dual response.
// This route does NOT control workflow state — the client does.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { callGeminiAudit, AUDIT_SYSTEM_PROMPT } from "@/src/lib/aiAuditLogic";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { upsertSession } from "@/src/lib/db";
import type { ChatMessage, GeminiDualResponse } from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// ------------------------------------------------------------
// callGeminiAuditWithContext
// Used only for $79 chat intake. Prepends systemContextOverride
// (full prior context) to the standard AUDIT_SYSTEM_PROMPT so
// Gemini has all free + $29 answers and both report summaries.
// Mirrors the retry + parse logic from callGeminiAudit without
// modifying aiAuditLogic.ts.
// ------------------------------------------------------------
async function callGeminiAuditWithContext(
  messages: ChatMessage[],
  userMessage: string,
  systemContextOverride: string,
  stage?: string
): Promise<GeminiDualResponse> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const genAI   = new GoogleGenerativeAI(apiKey);
  const model   = genAI.getGenerativeModel({
    model:             process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    // Override replaces the standard prompt entirely — not appended
    systemInstruction: systemContextOverride,
  });

  const history = messages.slice(0, -1).map(m => ({
    role:  m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const chat   = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  const raw    = result.response.text();

  // Minimal JSON extraction — extract first JSON object from the response
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as GeminiDualResponse;
      if (typeof parsed.customerResponse === "string") {
        return { customerResponse: parsed.customerResponse, extractedData: parsed.extractedData ?? {} };
      }
    } catch { /* fall through to plain text */ }
  }

  // Fallback: treat entire response as plain text reply
  return { customerResponse: raw.trim(), extractedData: {} };
}

type ChatRequestBody = {
  messages: ChatMessage[];
  userMessage: string;
  stage?: string;
  sessionId?: string;
  isFirstMessage?: boolean;
  hadBusinessName?: boolean;
  // v2.0: prepended to system prompt for $79 chat intake — provides full prior context
  systemContextOverride?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { messages, userMessage, stage, sessionId, isFirstMessage, hadBusinessName, systemContextOverride } = body;

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

    // When systemContextOverride is provided ($79 intake), prepend it to the
    // standard audit system prompt so Gemini has full prior context.
    // Otherwise use the standard callGeminiAudit path unchanged.
    let response: GeminiDualResponse;
    if (systemContextOverride) {
      response = await callGeminiAuditWithContext(messages, userMessage.trim(), systemContextOverride, stage);
    } else {
      response = await callGeminiAudit(messages, userMessage.trim(), stage);
    }

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
