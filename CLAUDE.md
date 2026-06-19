# GSpaceAi — Claude Code Project Guide

## What Is GSpaceAi

GSpaceAi is an AI-powered Google Workspace Consolidation Platform built for small business owners.
It conducts a conversational software audit, generates a free report, and offers a paid report ladder.

**Owner:** GSpace Solutions  
**Product:** GSpaceAi  
**Support:** support@gspacesolutions.org

---

## Core Product Positioning

GSpaceAi is NOT a generic chatbot or operations audit tool.  
GSpaceAi IS a software consolidation and Google Workspace optimization platform.

Primary value proposition: "Stop Paying Twice For Software."

The customer flow is:
Software Inventory → Consolidation Score → Savings Estimate → Paid Roadmap → Implementation Guide → Done-With-You Help

---

## Offer Ladder

| Offer | Price | Deliverable |
|---|---|---|
| Platform Consolidation Snapshot | Free | PDF report generated after audit |
| Recommendations Report | $29 | PDF report, gated behind payment verification |
| Implementation Guide + SOP Book | $79 | PDF report, gated behind payment verification |
| Done-With-You Implementation | $159 | Thank-you + next steps screen, no PDF |

---

## Critical Payment Gating Rules — NEVER VIOLATE

1. **Never unlock a paid deliverable without verified payment.**
2. **Never advance to the next offer before generating AND displaying the current purchased deliverable.**
3. **Never let Gemini control payment status, workflow stage, or report access.**
4. **Payment state lives in the app reducer only — never derived from Gemini output.**

Correct flow after payment verification:
```
payment verified → generate deliverable → save deliverable → display deliverable → THEN show next offer
```

Wrong flow (must never happen):
```
payment verified → show next offer (skipping generation/display)
```

---

## Tech Stack

- **Framework:** Next.js 14+ App Router
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + brand color tokens
- **AI:** Google Gemini API (`@google/generative-ai`), model set via `GEMINI_MODEL` env var
- **PDF:** `@react-pdf/renderer` — server-side in `/api/generate-report`
- **State:** React Context + useReducer (explicit state machine)
- **Persistence:** localStorage (`gspaceai_session` key) — MVP only
- **Payment Verification:** Google Apps Script web app endpoint (server-side only, never called from browser)
- **Payments:** External Stripe payment links (no Stripe SDK, no webhooks)

---

## Folder Structure

```
/app              — Next.js App Router pages and API routes
/app/api/chat     — Gemini conversation handler
/app/api/verify-payment  — Payment verification (calls Apps Script server-side)
/app/api/generate-report — Gated PDF generation
/src/lib          — Core logic (types, state, config, AI, scoring, PDF)
/src/components   — UI components
/src/context      — AppStateContext (React Context + useReducer)
/src/pdf-templates — @react-pdf/renderer report components
/docs             — Product spec and reference documents
```

---

## State Management Rules

- All workflow stage transitions go through the `AppStateContext` reducer.
- Transitions are guarded — invalid transitions are silently ignored.
- The `WorkflowStage` type in `src/lib/workflowState.ts` is the source of truth for allowed stages.
- Payment status (`pending | verified | failed`) is set ONLY by `/api/verify-payment` responses, applied in the reducer.
- Deliverable status (`not_started | generated | displayed`) must reach `displayed` before the next offer can render.

---

## Gemini Rules

- Gemini handles: conversation, data extraction, report content generation.
- Gemini does NOT handle: workflow stage, payment status, report access, customer permissions.
- Every Gemini chat response returns a dual-response JSON: `{ customerResponse, extractedData }`.
- Report sections are generated separately (not as one giant prompt).
- The model is configured via `GEMINI_MODEL` env var — never hardcode model names.

---

## Payment Verification

- Endpoint is in `PAYMENT_VERIFICATION_ENDPOINT` env var.
- Called only from `/api/verify-payment` (server-side) — never directly from browser.
- Request: GET `?email=...&product=...`
- Product names must match Google Sheet exactly (case-insensitive):
  - `recommendations_report` → `"Recommendations Report"`
  - `implementation_guide_sop` → `"Implementation Guide & SOP Book"`
  - `done_with_you` → `"Done-With-You Implementation"`
- Response statuses: `PAID`, `NOT_FOUND`, `ERROR`

---

## Brand

- **Blue:** `#4285f3` — primary CTAs, buttons, score display, "Ai" in wordmark
- **Red:** `#ea4335` — High priority, error states
- **Yellow:** `#fabc04` — Medium priority, callouts
- **Green:** `#35a852` — savings figures, positive indicators
- **Charcoal:** `#1f1f1f` — body text
- **Light:** `#f8f9fa` — backgrounds
- Logo: SVG component at `src/components/GSpaceAiLogo.tsx`

---

## Environment Variables

See `.env.example` for all required variables.  
Real values go in `.env.local` (gitignored).  
`NEXT_PUBLIC_*` vars are safe for the browser.  
All other vars are server-side only.

---

## Testing Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint check
```

---

## Report Generation Rules

- Free report generates after audit has sufficient data (scored > 0, at least 1 software item).
- Paid reports generate ONLY after the corresponding payment is verified.
- Reports are generated section-by-section via Gemini, then assembled and rendered to PDF.
- PDF content (structured JSON) is stored in React state during session.
- PDF blobs are NOT stored in localStorage (size limit concern).
- On page reload, the app restores stage/payment status from localStorage and can re-generate PDFs on demand.

---

## Important Safeguards (do not remove or work around these)

1. `/api/generate-report` must check report type eligibility before generating.
2. `/api/verify-payment` must map productKey to sheetProductName before calling Apps Script.
3. The reducer must not allow `free_report_ready → recommendations_payment_pending` transition if `platform_consolidation_snapshot.status !== "displayed"`.
4. The reducer must not allow `recommendations_report_ready → implementation_payment_pending` transition if `recommendations_report.status !== "displayed"`.
5. Gemini system prompt must instruct Gemini never to mention pricing, payment status, or unlock status.
6. Savings language must always be estimated/potential — never guaranteed.
