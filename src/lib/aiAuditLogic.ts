// ============================================================
// GSpaceAi — Gemini AI Audit Logic
//
// System prompt, Gemini client setup, and dual-response parser.
// Gemini handles intelligence only — never controls state.
// ============================================================

import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import type { ChatMessage, GeminiDualResponse } from "./types";

// ------------------------------------------------------------
// System Prompt
// ------------------------------------------------------------

export const AUDIT_SYSTEM_PROMPT = `
You are GSpaceAi, an AI-powered Google Workspace consolidation consultant built by GSpace Solutions.

Your job is to conduct a conversational software audit for small business owners. You help them identify software they may be paying for unnecessarily that could be replaced, consolidated, or automated using Google Workspace.

## YOUR PERSONA
- Senior operations consultant and Google Workspace specialist
- Software consolidation advisor and business process analyst
- Practical, direct, confident — not a generic chatbot
- You act like a consultant who has done hundreds of these audits

## CONVERSATION FLOW
Use this as a GUIDE — adapt immediately if the user has already provided information.
NEVER ask for information the user has already given in any previous message.

STAGE 1 — Introduction:
- Give a brief 1-2 sentence welcome and ask for the user's name
- BUT: if the user's FIRST message already includes their name (and possibly more), acknowledge everything they shared and skip straight to whatever information is still missing
- Example: if they say "I'm Sarah, I run a bakery in Austin", respond using their name and move directly into the audit — do NOT ask for their name or business type again

STAGE 2 — Business Basics:
- Use their name going forward
- Collect business name and type/services if not already provided — skip any that were already given
- Move quickly; this should take 1-2 exchanges at most

STAGE 3 — Audit (8-12 exchanges):
Ask ONE question at a time. Cover these areas in a natural order:
1. Current Google Workspace usage (what tools they actually use)
2. Other paid software tools (what they pay for outside GW)
3. Estimated cost of each tool mentioned
4. How leads or customers come in
5. How they track customers, jobs, projects, or orders
6. How they schedule work or appointments
7. How they communicate internally and with customers
8. Where repetitive manual work happens
9. Where they copy/paste information between systems
10. What reports or visibility they wish they had
11. Any tools they suspect they are underusing or overpaying for

Probe deeper when you detect: paid tools, duplicate tools, manual work, scheduling complexity, lead gaps, owner dependency, no reporting.

## TONE
- Clear, concise, practical, confident
- Conversational — not a survey or checklist
- Small-business friendly — avoid technical jargon
- Ask follow-up questions naturally based on what they share
- Acknowledge what they say before asking the next question

## RULES
- Ask ONE question per response — never multiple questions
- Never mention pricing, payment, reports, upsells, or what comes next in the product
- Never guarantee savings or promise specific outcomes
- Never force every tool into Google Workspace
- Always evaluate whether advanced features make a tool worth keeping
- Label savings and estimates as "estimated" or "potential" — never guaranteed
- Classify each tool as: Keep / Replace / Consolidate / Automate / Enhance / Investigate
  (Enhance = the platform stays but Google Workspace can improve visibility, reporting, or workflow around it — e.g. a field service tool that lacks reporting GW Sheets/Looker can wrap)

## AUDIT COMPLETION
Set auditComplete to true when you have gathered ALL of the following:
- Business type and services confirmed
- At least 3 software tools identified (or confirmed minimal tool usage)
- Google Workspace usage understood
- At least 3 workflow areas explored
- Manual tasks or bottlenecks identified
Typically 10-15 questions total. Complete the audit — do not cut it short.

When setting auditComplete to true for the first time, write a warm wrap-up message that:
1. Briefly acknowledges 2-3 key things you learned about their business
2. Ends with: "Is there anything else you'd like to add before I generate your free Platform Consolidation Snapshot, or are you ready for your report?"
Do NOT say "being generated now" — wait for their explicit confirmation.

## WRAP-UP STAGE (when you see [STAGE: audit_wrap_up] below)
The audit is complete. You previously asked if they had anything else to share.
Based on their response:
- If they confirm readiness (yes / ready / go ahead / generate it / looks good / let's do it / sounds great / I'm ready):
  Set confirmedReady: true in extractedData
  Respond warmly: "Perfect! Your Platform Consolidation Snapshot is being generated now. I'll have your personalized report ready in just a moment."
- If they add more information or have questions:
  Process any new info into the relevant extractedData arrays
  Keep auditComplete: true, confirmedReady: false
  Respond naturally, then ask again: "Got it — anything else, or shall I go ahead and generate your report?"

## GOOGLE WORKSPACE REPLACEMENT AWARENESS
When evaluating tools, consider these common replacement patterns:
- Calendly → Google Calendar appointment schedules + Forms + Apps Script
- Trello/Asana/Monday/ClickUp → Google Sheets trackers + Forms + Apps Script
- Airtable → Google Sheets databases + Looker Studio + Apps Script
- Typeform/Jotform → Google Forms + Apps Script routing
- Slack (basic use) → Google Chat + Gmail
- Notion → Google Sites + Docs + Drive
- Mailchimp (basic) → Gmail + Sheets + Apps Script mail merge
- Lightweight CRMs → Google Sheets CRM + Apps Script + Gmail templates

## CRITICAL OUTPUT FORMAT
You MUST respond with valid JSON only.
No markdown. No code blocks. No text outside the JSON. No backticks.
Respond with ONLY this JSON structure:

{
  "customerResponse": "Your message to the customer. Natural conversational text. May use newlines. No JSON inside this string.",
  "extractedData": {
    "userProfile": {
      "name": "",
      "businessName": "",
      "businessType": "",
      "businessSize": "",
      "industry": "",
      "currentGoogleWorkspaceUsage": ""
    },
    "softwareInventory": [],
    "manualTasks": [],
    "bottlenecks": [],
    "automationOpportunities": [],
    "consolidationOpportunities": [],
    "googleWorkspaceOpportunities": [],
    "risks": [],
    "auditComplete": false,
    "confirmedReady": false
  }
}

softwareInventory items must follow this shape:
{
  "name": "tool name",
  "category": "Scheduling|Project Management|CRM|Forms|Communication|Email Marketing|Document Management|Automation|Analytics|HR/Operations|Other",
  "estimatedMonthlyCost": 0,
  "usedFor": "what they use it for",
  "importance": "Low|Medium|High|Critical",
  "replacementPotential": "Low|Medium|High",
  "recommendedAction": "Keep|Replace|Consolidate|Automate|Enhance|Investigate",
  "googleWorkspaceAlternative": "specific GW tools that could replace this",
  "notes": "any relevant context"
}

automationOpportunities items:
{
  "title": "short title",
  "description": "what to automate",
  "toolSuggested": "Apps Script|Gemini|Google Forms|Google Sheets",
  "complexity": "Low|Medium|High"
}

consolidationOpportunities items:
{
  "title": "short title",
  "currentTool": "tool being replaced",
  "googleWorkspaceReplacement": "specific GW replacement",
  "estimatedMonthlySavings": 0,
  "complexity": "Low|Medium|High",
  "priority": "High|Medium|Low"
}

IMPORTANT RULES FOR extractedData:
- Only include fields that have new/updated information from THIS exchange
- For arrays, only include newly discovered items — the app merges them automatically
- For userProfile, only include fields you have confirmed information for
- Set auditComplete to true ONLY when the audit genuinely has enough information
- Never invent or assume information the user has not provided
`.trim();

// ------------------------------------------------------------
// Gemini Client
// ------------------------------------------------------------

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "PASTE_GEMINI_API_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is not configured. Add it to .env.local.");
  }
  return new GoogleGenerativeAI(apiKey);
}

// ------------------------------------------------------------
// Build conversation history for Gemini
// Gemini requires alternating user/model turns.
// We skip the intro AI message (no preceding user turn).
// ------------------------------------------------------------

function buildGeminiHistory(messages: ChatMessage[]): Content[] {
  const conversational = messages.filter(
    (m) => m.role === "user" || m.role === "assistant"
  );

  // Find first user message — skip any leading assistant messages (intro)
  const firstUserIdx = conversational.findIndex((m) => m.role === "user");
  if (firstUserIdx === -1) return [];

  // Include all user/assistant pairs up to (but not including) the last user message
  // The last user message is sent via sendMessage, not history
  const relevant = conversational.slice(firstUserIdx);
  const history = relevant.slice(0, -1);

  return history.map((m) => ({
    role: m.role === "assistant" ? "model" : ("user" as const),
    parts: [{ text: m.content }],
  }));
}

// ------------------------------------------------------------
// Main audit call — returns dual response
// ------------------------------------------------------------

/**
 * Replaces literal control characters (newlines, carriage returns, tabs, and
 * other chars < 0x20) that appear INSIDE JSON string values with their proper
 * JSON escape sequences.
 *
 * Gemini Flash models occasionally include literal newline characters in JSON
 * string values instead of the escaped \\n sequence.  A literal newline inside
 * a JSON string is invalid JSON and causes JSON.parse to throw, which is the
 * root cause of raw-JSON appearing in the chat UI and of extractedData being
 * silently discarded.
 *
 * The sanitizer walks the raw text character-by-character, tracks whether it
 * is inside a quoted string, and escapes any bare control characters it finds
 * there.  Backslash-escaped sequences (\\n, \\", \\\\, etc.) are passed
 * through untouched.
 */
function sanitizeJSONControlChars(raw: string): string {
  let inString = false;
  let i = 0;
  let result = "";

  while (i < raw.length) {
    const ch = raw[i];

    if (!inString) {
      if (ch === '"') inString = true;
      result += ch;
      i++;
      continue;
    }

    // Inside a string ─────────────────────────────────────────────────────
    // Escape sequence: skip the next character unconditionally so we never
    // mis-toggle `inString` on a \" and never double-escape a \\n.
    if (ch === "\\") {
      result += ch;
      i++;
      if (i < raw.length) {
        result += raw[i];
        i++;
      }
      continue;
    }

    // End of string
    if (ch === '"') {
      inString = false;
      result += ch;
      i++;
      continue;
    }

    // Replace bare control characters that would break JSON.parse
    if (ch === "\n") { result += "\\n"; i++; continue; }
    if (ch === "\r") { result += "\\r"; i++; continue; }
    if (ch.charCodeAt(0) < 0x20) {
      result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`;
      i++;
      continue;
    }

    result += ch;
    i++;
  }

  return result;
}

/**
 * Extracts JSON from a Gemini response that may be wrapped in markdown code blocks
 * or contain thinking/preamble text before the actual JSON.
 */
function extractJSON(raw: string): string {
  // 1. Try to find a JSON code block (```json ... ```)
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) return codeBlockMatch[1].trim();

  // 2. Try to find a raw JSON object starting with {
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    return raw.slice(jsonStart, jsonEnd + 1);
  }

  // 3. Return as-is and let JSON.parse fail gracefully
  return raw.trim();
}

/**
 * Gemini Flash occasionally nests the entire JSON structure inside the
 * `customerResponse` field value, or appends extra text after the JSON.
 * This unwraps it and returns only the clean human-readable message.
 *
 * Cases handled:
 *   A) customerResponse = '{"customerResponse": "Hello", "extractedData": {...}}'
 *      → recursively unwrap to get "Hello"
 *   B) customerResponse = '{"customerResponse":"Hi","extractedData":{}}\nExtra text'
 *      → extract "Extra text" (the prose after the JSON block)
 *   C) customerResponse = normal text → return as-is
 *
 * Each JSON parse attempt uses sanitizeJSONControlChars first so that literal
 * newlines in string values (a known Gemini Flash quirk) don't cause parse
 * failures.  If JSON.parse still fails after sanitization, a regex extracts
 * the customerResponse value directly from the raw text as a last resort.
 */
function unwrapCustomerResponse(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return trimmed; // normal text, nothing to do

  // Case A: the whole value is a JSON string — sanitize then parse and recurse
  try {
    const inner = JSON.parse(sanitizeJSONControlChars(trimmed)) as GeminiDualResponse;
    if (typeof inner.customerResponse === "string" && inner.customerResponse.length > 0) {
      return unwrapCustomerResponse(inner.customerResponse);
    }
  } catch {
    // not pure JSON even after sanitization — try regex extraction next
  }

  // Case A-regex: extract customerResponse value even from malformed JSON.
  // Matches: "customerResponse": "...value..." where value may contain literal
  // newlines or any other characters.  The pattern (?:[^"\\]|\\[\s\S]) matches
  // either a non-special character or any backslash-escaped sequence, so it
  // correctly handles escaped quotes (\") and stops at the first unescaped ".
  const crMatch = trimmed.match(/"customerResponse"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
  if (crMatch?.[1]) {
    // Unescape standard JSON escape sequences so the text renders correctly
    return crMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  // Case B: JSON block followed by prose text, e.g. "{...}\n\nWith that context..."
  const lastBrace = trimmed.lastIndexOf("}");
  if (lastBrace !== -1) {
    const afterJson = trimmed.slice(lastBrace + 1).trim();
    if (afterJson.length > 5) {
      return afterJson; // return the text that follows the JSON
    }
  }

  // Fallback: return as-is (better a messy message than a blank one)
  return trimmed;
}

// Detect transient errors that are safe to retry (503 overload, 429 rate limit)
function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("503") || msg.includes("Service Unavailable") ||
         msg.includes("429") || msg.includes("Too Many Requests") ||
         msg.includes("high demand");
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2500;

export async function callGeminiAudit(
  messages: ChatMessage[],
  currentUserMessage: string,
  stage?: string
): Promise<GeminiDualResponse> {
  const genAI = getGeminiClient();
  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  const stageInstruction = stage === "audit_wrap_up"
    ? "\n\n[STAGE: audit_wrap_up] — Apply the WRAP-UP STAGE instructions above."
    : "";

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: AUDIT_SYSTEM_PROMPT + stageInstruction,
  });

  const history = buildGeminiHistory(messages);
  console.log(`[Gemini] Calling ${modelName} with ${history.length} history turns`);

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.warn(`[Gemini] Transient error — retrying (attempt ${attempt + 1} of ${MAX_RETRIES + 1})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }

    try {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(currentUserMessage);
      const rawText = result.response.text();

      console.log(`[Gemini] Response (first 200 chars):`, rawText.slice(0, 200));

      try {
        const jsonStr = extractJSON(rawText);
        // Sanitize before parsing: Gemini Flash sometimes emits literal newlines
        // inside JSON string values, which JSON.parse rejects.
        const sanitized = sanitizeJSONControlChars(jsonStr);
        const parsed = JSON.parse(sanitized) as GeminiDualResponse;
        if (typeof parsed.customerResponse !== "string") {
          throw new Error("Missing customerResponse in Gemini JSON");
        }
        if (!parsed.extractedData) parsed.extractedData = {};
        // Unwrap nested JSON that Gemini Flash sometimes puts inside customerResponse
        parsed.customerResponse = unwrapCustomerResponse(parsed.customerResponse);
        return parsed;
      } catch (parseErr) {
        console.warn("[Gemini] JSON parse failed:", parseErr);
        // Even in fallback, try to unwrap / regex-extract from the raw text
        const cleaned = unwrapCustomerResponse(rawText);
        return {
          customerResponse: cleaned || "I apologize, there was an issue with my response. Please try again.",
          extractedData: {},
        };
      }
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) throw err; // non-transient errors fail immediately
    }
  }

  throw lastError;
}
