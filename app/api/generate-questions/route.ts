// ============================================================
// GSpaceAi — /api/generate-questions
// Generates 7 personalized tap-based intake questions via Gemini.
// Used for free tier (no prior context) and $29 tier (full context).
// Returns structured JSON only — never markdown.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeneratedQuestion, QuestionnaireAnswer } from "@/src/lib/types";
import { logError } from "@/src/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  tier: "free" | "paid_29";
  questionCount?: number; // default 7 for backward compat; pass 5 for free tier Q6-10 call
  priorContext?: {
    freeIntakeAnswers?: QuestionnaireAnswer[];
    freeReportSummary?: string;
    paid29IntakeAnswers?: QuestionnaireAnswer[];
    fixedAnswers?: QuestionnaireAnswer[]; // Q1-Q5 answers for free tier Q6-10 generation
  };
};

type GeminiQuestionSet = {
  questions: GeneratedQuestion[];
};

// ------------------------------------------------------------
// JSON extraction — strips markdown fences if Gemini wraps output
// ------------------------------------------------------------
function extractJSON(raw: string): string {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

// ------------------------------------------------------------
// Format prior answers as readable Q&A pairs for Gemini context
// ------------------------------------------------------------
function formatAnswers(answers: QuestionnaireAnswer[]): string {
  return answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.selectedOptions.join(", ")}`)
    .join("\n\n");
}

// ------------------------------------------------------------
// Sanitize + validate — coerce minor violations rather than reject
// ------------------------------------------------------------
function sanitizeAndValidate(questions: unknown[], expectedCount: number): GeneratedQuestion[] | null {
  if (!Array.isArray(questions) || questions.length === 0) return null;

  const result: GeneratedQuestion[] = [];
  for (const q of questions) {
    if (typeof q !== "object" || q === null) continue;
    const raw = q as Record<string, unknown>;
    if (typeof raw.id !== "string" || typeof raw.question !== "string") continue;
    if (raw.type !== "single_select" && raw.type !== "multi_select") continue;
    if (!Array.isArray(raw.options) || raw.options.length < 2) continue;

    // Coerce: truncate long question text and option labels instead of rejecting
    const question = raw.question.length > 120 ? raw.question.slice(0, 117) + "…" : raw.question;

    const options: GeneratedQuestion["options"] = [];
    for (const opt of raw.options as unknown[]) {
      if (typeof opt !== "object" || opt === null) continue;
      const o = opt as Record<string, unknown>;
      if (typeof o.id !== "string" || typeof o.label !== "string") continue;
      const label = o.label.length > 60 ? o.label.slice(0, 57) + "…" : o.label;
      options.push({ id: o.id, label });
      if (options.length === 6) break; // cap at 6 options
    }

    if (options.length < 2) continue;
    result.push({ id: raw.id, question, type: raw.type, options });
    if (result.length === expectedCount) break; // truncate to expected count
  }

  return result.length >= expectedCount ? result.slice(0, expectedCount) : null;
}

// ------------------------------------------------------------
// Hardcoded paid_29 fallback — used when both Gemini attempts fail
// ------------------------------------------------------------
const PAID_29_FALLBACK: GeneratedQuestion[] = [
  {
    id: "p29_f1",
    question: "Which tools do you use every single day?",
    type: "multi_select",
    options: [
      { id: "p29_f1_a", label: "Email (Gmail)" },
      { id: "p29_f1_b", label: "Calendar / scheduling tool" },
      { id: "p29_f1_c", label: "CRM or contact manager" },
      { id: "p29_f1_d", label: "Project or task tracker" },
      { id: "p29_f1_e", label: "Accounting or invoicing tool" },
    ],
  },
  {
    id: "p29_f2",
    question: "Where does information most often get lost in your business?",
    type: "single_select",
    options: [
      { id: "p29_f2_a", label: "Between email and other tools" },
      { id: "p29_f2_b", label: "Between team members" },
      { id: "p29_f2_c", label: "Between clients and our team" },
      { id: "p29_f2_d", label: "Inside a single tool we underuse" },
    ],
  },
  {
    id: "p29_f3",
    question: "How do new leads or customers typically first contact you?",
    type: "single_select",
    options: [
      { id: "p29_f3_a", label: "Phone call or text" },
      { id: "p29_f3_b", label: "Email inquiry" },
      { id: "p29_f3_c", label: "Website form or booking link" },
      { id: "p29_f3_d", label: "Social media or referral" },
    ],
  },
  {
    id: "p29_f4",
    question: "How do you currently track your active clients or open jobs?",
    type: "single_select",
    options: [
      { id: "p29_f4_a", label: "Spreadsheet or Google Sheets" },
      { id: "p29_f4_b", label: "CRM or dedicated software" },
      { id: "p29_f4_c", label: "Email threads or inbox labels" },
      { id: "p29_f4_d", label: "Paper or whiteboard" },
      { id: "p29_f4_e", label: "We don't have a consistent system" },
    ],
  },
  {
    id: "p29_f5",
    question: "What's your biggest scheduling or appointment pain point?",
    type: "single_select",
    options: [
      { id: "p29_f5_a", label: "Back-and-forth to find availability" },
      { id: "p29_f5_b", label: "No-shows or last-minute cancellations" },
      { id: "p29_f5_c", label: "Double-bookings or conflicts" },
      { id: "p29_f5_d", label: "Scheduling isn't a problem for us" },
    ],
  },
  {
    id: "p29_f6",
    question: "How do you currently generate reports or review business performance?",
    type: "single_select",
    options: [
      { id: "p29_f6_a", label: "Manually pull numbers from multiple tools" },
      { id: "p29_f6_b", label: "Built-in reports from our main software" },
      { id: "p29_f6_c", label: "Spreadsheet we update ourselves" },
      { id: "p29_f6_d", label: "We don't have a reporting process" },
    ],
  },
  {
    id: "p29_f7",
    question: "What would make the biggest difference if Google Workspace solved it?",
    type: "single_select",
    options: [
      { id: "p29_f7_a", label: "Fewer tools and less switching" },
      { id: "p29_f7_b", label: "Less time on admin and manual tasks" },
      { id: "p29_f7_c", label: "Better visibility into what's happening" },
      { id: "p29_f7_d", label: "Reducing monthly software costs" },
    ],
  },
];

// ------------------------------------------------------------
// Gemini call — retries once on validation failure
// ------------------------------------------------------------
async function generateQuestions(
  tier: "free" | "paid_29",
  priorContext: RequestBody["priorContext"],
  questionCount = 7
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey || apiKey === "PASTE_GEMINI_API_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    systemInstruction: `You are GSpaceAi, a senior Google Workspace Consolidation Consultant.
Your job is to generate a focused intake questionnaire for a small business owner.
You will return ONLY valid JSON — no markdown, no preamble, no explanation.

Question generation rules:
- Generate exactly the number of questions requested
- Each question must be answerable with a tap — no typing
- Question text: maximum 120 characters
- Option labels: maximum 60 characters each
- Each question must have 3 to 5 options
- Use "single_select" for questions with one correct answer
- Use "multi_select" when multiple answers may apply
- Questions must feel personalized and specific, not generic
- Never ask about information already provided in prior context
- Questions should fill the specific gaps needed to generate the report

Return this exact JSON structure and nothing else:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "type": "single_select",
      "options": [
        { "id": "opt_a", "label": "Option A" },
        { "id": "opt_b", "label": "Option B" },
        { "id": "opt_c", "label": "Option C" }
      ]
    }
  ]
}`,
  });

  const userPrompt = tier === "free"
    ? buildFreePrompt(priorContext?.fixedAnswers ?? [], questionCount)
    : buildPaid29Prompt(priorContext, questionCount);

  for (let attempt = 0; attempt <= 1; attempt++) {
    const result = await model.generateContent(userPrompt);
    const raw = result.response.text();
    try {
      const jsonStr = extractJSON(raw);
      const parsed = JSON.parse(jsonStr) as GeminiQuestionSet;
      const valid = sanitizeAndValidate(parsed.questions, questionCount);
      if (valid) return valid;
      console.warn(`[generate-questions] Sanitization failed on attempt ${attempt + 1}. Count: ${parsed.questions?.length ?? 0}`);
    } catch (err) {
      console.warn(`[generate-questions] JSON parse failed on attempt ${attempt + 1}:`, err);
    }
  }

  // Both attempts failed — use hardcoded fallback for paid_29 so the user isn't blocked
  if (tier === "paid_29") {
    console.warn("[generate-questions] Using hardcoded paid_29 fallback questions");
    return PAID_29_FALLBACK;
  }

  throw new Error("Gemini returned invalid question structure after 2 attempts.");
}

function buildFreePrompt(fixedAnswers: QuestionnaireAnswer[], questionCount: number): string {
  if (!fixedAnswers.length) {
    // Fallback for direct calls without fixed answers (backward compat)
    return `Generate ${questionCount} intake questions for a small business owner starting a free Google Workspace consolidation audit. Focus on discovering their tools, workflows, and biggest operational pain points. Questions must be tap-based (single_select or multi_select only). 3 to 5 options each.`;
  }

  // Find specific answers from Q1-Q5 by position
  const q1 = fixedAnswers[0];
  const q2 = fixedAnswers[1];
  const q3 = fixedAnswers[2];
  const q4 = fixedAnswers[3];
  const q5 = fixedAnswers[4];

  return `Generate ${questionCount} intake questions for a small business owner.

Context already collected:
- Business type: ${q1?.selectedOptions.join(", ") ?? "Unknown"}
- Business category: ${q2?.selectedOptions.join(", ") ?? "Unknown"}
- Tools currently in use: ${q3?.selectedOptions.join(", ") ?? "None listed"}
- First name: ${q4?.selectedOptions.join(", ") ?? "Unknown"}
- Business name: ${q5?.selectedOptions.join(", ") ?? "Unknown"}

You already know their business type, category, tool stack, and name.
Do not ask about any of these again.

Generate ${questionCount} questions that fill the remaining gaps needed to produce a valuable Platform Consolidation Snapshot. Focus on:
- How they currently manage leads or customers
- Where their biggest time drains or manual bottlenecks are
- How they handle scheduling, reporting, or team communication
- What a successful outcome would look like for them

Questions must be tap-based (single_select or multi_select only — no text_input). 3 to 5 options each. Max 120 characters per question. Max 60 characters per option label.`;
}

function buildPaid29Prompt(priorContext: RequestBody["priorContext"], questionCount: number): string {
  const answersText = priorContext?.freeIntakeAnswers?.length
    ? formatAnswers(priorContext.freeIntakeAnswers)
    : "No prior answers available.";

  const summaryText = priorContext?.freeReportSummary?.trim()
    ? priorContext.freeReportSummary
    : "No summary available.";

  return `Generate ${questionCount} intake questions for a small business owner who has completed their free audit and paid for the Recommendations Report.

Prior context from free audit:
${answersText}

Free audit findings summary:
${summaryText}

Based on what you already know about this business, generate 7 questions that go deeper. Focus on:
1. Which tools they use daily vs. rarely
2. Where information gets lost or duplicated
3. How they currently manage leads or customers
4. How they handle scheduling and appointments
5. What their reporting and visibility looks like
6. Where their biggest manual bottlenecks are
7. What implementation would look like for them (team buy-in, timeline)

Do not ask anything already answered in the prior context.
Make questions feel specific to their business, not generic.`;
}

// ------------------------------------------------------------
// Route handler
// ------------------------------------------------------------
export async function POST(req: NextRequest) {
  let body: RequestBody | undefined;

  try {
    body = (await req.json()) as RequestBody;
    const { tier, priorContext, questionCount = 7 } = body;

    if (tier !== "free" && tier !== "paid_29") {
      return NextResponse.json(
        { error: "tier must be 'free' or 'paid_29'" },
        { status: 400 }
      );
    }

    const questions = await generateQuestions(tier, priorContext, questionCount);
    return NextResponse.json({ questions });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack   = err instanceof Error ? err.stack : undefined;
    console.error("[/api/generate-questions] Error:", message);
    logError({
      context: `generate-questions:${body?.tier ?? "unknown"}`,
      message,
      stack,
    }).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
