// ============================================================
// GSpaceAi — /api/generate-questions
// Generates 7 personalized tap-based intake questions via Gemini.
// Used for free tier (no prior context) and $29 tier (full context).
// Returns structured JSON only — never markdown.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeneratedQuestion, QuestionnaireAnswer, FreeAnalysisData } from "@/src/lib/types";
import { logError } from "@/src/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

type RequestBody = {
  tier: "free" | "paid_29" | "paid_79";
  questionCount?: number; // default 7 for backward compat; pass 5 for free tier Q6-10 call
  priorContext?: {
    freeIntakeAnswers?: QuestionnaireAnswer[];
    freeReportSummary?: string;
    paid29IntakeAnswers?: QuestionnaireAnswer[];
    fixedAnswers?: QuestionnaireAnswer[]; // Q1-Q5 answers for free tier Q6-10 generation
    freeAnalysisData?: FreeAnalysisData | null;
    paid29ReportContent?: string;
  };
  // paid_79 mode only — adaptive single-question generation
  answeredSoFar?: QuestionnaireAnswer[];
  questionNumber?: number; // 1-indexed
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
// Validate a single question returned by the paid_79 generator.
// Accepts single_select, multi_select, and text_input.
// ------------------------------------------------------------
function sanitizeSingleQuestion(raw: unknown): GeneratedQuestion | null {
  if (typeof raw !== "object" || raw === null) return null;
  const q = raw as Record<string, unknown>;
  if (typeof q.id !== "string" || typeof q.question !== "string") return null;
  if (q.type !== "single_select" && q.type !== "multi_select" && q.type !== "text_input") return null;

  const question = q.question.length > 120 ? q.question.slice(0, 117) + "…" : q.question;
  const placeholder = typeof q.placeholder === "string" ? q.placeholder : undefined;

  if (q.type === "text_input") {
    return { id: q.id, question, type: "text_input", options: [], placeholder };
  }

  if (!Array.isArray(q.options) || q.options.length < 2) return null;
  const options: GeneratedQuestion["options"] = [];
  for (const opt of q.options as unknown[]) {
    if (typeof opt !== "object" || opt === null) continue;
    const o = opt as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.label !== "string") continue;
    const label = o.label.length > 60 ? o.label.slice(0, 57) + "…" : o.label;
    options.push({ id: o.id, label });
    if (options.length === 6) break;
  }
  if (options.length < 2) return null;
  return { id: q.id, question, type: q.type, options };
}

// ------------------------------------------------------------
// Fallback bank — used when Gemini fails for paid_79 and we
// still have fewer than 5 answers. Generic but useful.
// ------------------------------------------------------------
const PAID_79_FALLBACK_BANK: GeneratedQuestion[] = [
  {
    id: "p79_fb1",
    question: "Which area of your business takes the most manual effort each week?",
    type: "single_select",
    options: [
      { id: "p79_fb1_a", label: "Scheduling or appointments" },
      { id: "p79_fb1_b", label: "Following up with leads or clients" },
      { id: "p79_fb1_c", label: "Invoicing or payment tracking" },
      { id: "p79_fb1_d", label: "Internal team communication" },
    ],
  },
  {
    id: "p79_fb2",
    question: "How ready is your team to adopt new tools?",
    type: "single_select",
    options: [
      { id: "p79_fb2_a", label: "Very ready — we adopt tools easily" },
      { id: "p79_fb2_b", label: "Mostly ready with some coaching" },
      { id: "p79_fb2_c", label: "Resistant — needs gradual rollout" },
      { id: "p79_fb2_d", label: "It's just me — no team" },
    ],
  },
  {
    id: "p79_fb3",
    question: "What's your preferred timeline to have changes in place?",
    type: "single_select",
    options: [
      { id: "p79_fb3_a", label: "Within 2 weeks" },
      { id: "p79_fb3_b", label: "Within 1 month" },
      { id: "p79_fb3_c", label: "Within 3 months" },
      { id: "p79_fb3_d", label: "Flexible — quality matters more" },
    ],
  },
  {
    id: "p79_fb4",
    question: "Which outcome matters most to you from this implementation?",
    type: "single_select",
    options: [
      { id: "p79_fb4_a", label: "Fewer tools to manage" },
      { id: "p79_fb4_b", label: "Saving money on software" },
      { id: "p79_fb4_c", label: "Getting time back from admin work" },
      { id: "p79_fb4_d", label: "Better visibility into the business" },
    ],
  },
  {
    id: "p79_fb5",
    question: "How do you prefer to learn and roll out new systems?",
    type: "single_select",
    options: [
      { id: "p79_fb5_a", label: "Watch a short walkthrough video" },
      { id: "p79_fb5_b", label: "Follow a written step-by-step guide" },
      { id: "p79_fb5_c", label: "Try it hands-on and figure it out" },
      { id: "p79_fb5_d", label: "Have someone set it up for me" },
    ],
  },
];

// ------------------------------------------------------------
// Build Gemini prompt for paid_79 single-question mode
// ------------------------------------------------------------
function buildPaid79SinglePrompt(
  priorContext: RequestBody["priorContext"],
  answeredSoFar: QuestionnaireAnswer[],
  questionNumber: number
): string {
  const fad = priorContext?.freeAnalysisData;

  const inventoryLines = fad?.softwareInventory?.length
    ? fad.softwareInventory.map(t => `  - ${t.name} (${t.recommendedAction})`).join("\n")
    : "Not available";

  const freeAnswersText = priorContext?.freeIntakeAnswers?.length
    ? formatAnswers(priorContext.freeIntakeAnswers)
    : "None";

  const paid29AnswersText = priorContext?.paid29IntakeAnswers?.length
    ? formatAnswers(priorContext.paid29IntakeAnswers)
    : "None";

  const sessionAnswersText = answeredSoFar.length
    ? answeredSoFar.map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.selectedOptions.join(", ")}`).join("\n\n")
    : "None yet";

  const textInputGuidance = answeredSoFar.filter(a => a.questionId.startsWith("p79_")).length < 2
    ? `You may use type "text_input" (no options array needed) if the information genuinely cannot be captured as multiple choice — e.g. naming a specific tool or describing a precise workflow detail. Use text_input sparingly — at most 2 times across all 10 questions.`
    : `Do NOT use type "text_input" — you have already used it enough. Use single_select or multi_select only.`;

  return `You are GSpaceAi conducting the final intake before generating the Implementation Guide + SOP Book for this business.

You already know this business completely. Do not ask anything already answered in the prior context below.

BUSINESS CONTEXT:
Score: ${fad?.gspaceConsolidationScore ?? "N/A"}/100
Primary finding: ${fad?.primaryFinding ?? "Not available"}
Software inventory:
${inventoryLines}
Consolidation opportunities: ${fad?.consolidationOpportunities?.join("; ") ?? "None"}
Automation opportunities: ${fad?.automationOpportunities?.join("; ") ?? "None"}

Free audit answers:
${freeAnswersText}

Recommendations Report answers:
${paid29AnswersText}

Questions answered so far in this intake session:
${sessionAnswersText}

This is question ${questionNumber} of a maximum of 10.

${questionNumber >= 10
  ? "This is the FINAL question. After this, set isComplete: true. Do not indicate there will be more questions."
  : `You have up to ${10 - questionNumber} more questions after this one. Ask only what is most critical.`}

Generate the SINGLE next most valuable question. Prefer single_select or multi_select — tap-based, mobile-friendly, 3–5 options, max 120 characters for the question, max 60 per option label.
${textInputGuidance}

If you already have everything needed to build a complete, specific Implementation Guide, set isComplete: true and question: null.

Return ONLY this exact JSON — no markdown, no extra text:
{
  "question": {
    "id": "p79_${questionNumber}",
    "question": "Question text here",
    "type": "single_select",
    "options": [
      { "id": "p79_${questionNumber}_a", "label": "Option A" },
      { "id": "p79_${questionNumber}_b", "label": "Option B" },
      { "id": "p79_${questionNumber}_c", "label": "Option C" }
    ]
  },
  "isComplete": false
}

For text_input, omit the options array and add an optional "placeholder" string.
To signal completion without a question: { "question": null, "isComplete": true }`;
}

// ------------------------------------------------------------
// Generate a single adaptive question for paid_79 tier
// ------------------------------------------------------------
async function generateSinglePaid79Question(
  priorContext: RequestBody["priorContext"],
  answeredSoFar: QuestionnaireAnswer[],
  questionNumber: number
): Promise<{ question: GeneratedQuestion | null; isComplete: boolean }> {
  // Hard server-side cap — never trust the model alone to respect the limit
  if (questionNumber > 10) {
    return { question: null, isComplete: true };
  }

  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey || apiKey === "PASTE_GEMINI_API_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash" });
  const prompt = buildPaid79SinglePrompt(priorContext, answeredSoFar, questionNumber);

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      const jsonStr = extractJSON(raw);
      const parsed = JSON.parse(jsonStr) as { question?: unknown; isComplete?: boolean };

      // Gemini signals completion
      if (parsed.isComplete === true && !parsed.question) {
        return { question: null, isComplete: true };
      }

      const validated = sanitizeSingleQuestion(parsed.question);
      if (validated) {
        return { question: validated, isComplete: false };
      }
      console.warn(`[generate-questions] paid_79 single question validation failed on attempt ${attempt + 1}`);
    } catch (err) {
      console.warn(`[generate-questions] paid_79 attempt ${attempt + 1} failed:`, err);
    }
  }

  // Both attempts failed — use fallback bank if we don't have enough answers yet
  if (answeredSoFar.length < 5) {
    const fallbackIdx = Math.min(questionNumber - 1, PAID_79_FALLBACK_BANK.length - 1);
    const fallback = PAID_79_FALLBACK_BANK[fallbackIdx];
    if (fallback) {
      console.warn(`[generate-questions] paid_79 using fallback question ${fallbackIdx + 1}`);
      return { question: fallback, isComplete: false };
    }
  }

  // Enough answers — complete gracefully
  console.warn("[generate-questions] paid_79 completing early after Gemini failure");
  return { question: null, isComplete: true };
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

    if (tier !== "free" && tier !== "paid_29" && tier !== "paid_79") {
      return NextResponse.json(
        { error: "tier must be 'free', 'paid_29', or 'paid_79'" },
        { status: 400 }
      );
    }

    // paid_79: adaptive single-question mode — one question per call
    if (tier === "paid_79") {
      const questionNumber = body.questionNumber ?? 1;
      const answeredSoFar  = body.answeredSoFar ?? [];
      const result = await generateSinglePaid79Question(priorContext, answeredSoFar, questionNumber);
      return NextResponse.json(result);
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
