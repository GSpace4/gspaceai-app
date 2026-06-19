# GSpaceAi

**AI-powered Google Workspace Consolidation Platform**  
Built by GSpace Solutions.

---

## What It Does

GSpaceAi helps small business owners discover software they may be paying for twice — tools whose functionality could potentially be replaced or consolidated using Google Workspace.

The app conducts a conversational AI-powered assessment, calculates a GSpace Consolidation Score, estimates potential savings, and delivers a series of branded PDF reports unlocked through a payment ladder.

---

## Offer Ladder

| Product | Price | Description |
|---|---|---|
| Platform Consolidation Snapshot | Free | Software inventory, consolidation score, savings estimate |
| Recommendations Report | $29 | Full strategic roadmap, 30/60/90 day plan, priority matrix |
| Implementation Guide + SOP Book | $79 | Step-by-step build guide, SOPs, checklists |
| Done-With-You Implementation | $159 | Hands-on help from GSpace Solutions |

---

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Google Gemini API
- `@react-pdf/renderer`
- Google Apps Script payment verification

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your real values:

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model name (e.g. `gemini-2.5-pro`) |
| `STRIPE_RECOMMENDATIONS_LINK` | Stripe payment link for $29 report |
| `STRIPE_IMPLEMENTATION_LINK` | Stripe payment link for $79 report |
| `STRIPE_DONE_WITH_YOU_LINK` | Stripe payment link for $159 service |
| `PAYMENT_VERIFICATION_ENDPOINT` | Google Apps Script web app URL |

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
app/                    Next.js App Router pages and API routes
  api/chat/             Gemini conversation API
  api/verify-payment/   Payment verification API
  api/generate-report/  Report generation API
src/
  lib/                  Core business logic (types, state, config, scoring)
  components/           UI components
  context/              App state (React Context + useReducer)
  pdf-templates/        @react-pdf/renderer report components
docs/                   Product specification reference documents
```

---

## Critical Rules

- Paid reports are only generated after verified payment — enforced in the API route.
- Payment status is never controlled by Gemini — only by the verification API.
- Stripe payment links are always read from environment variables, never hardcoded.
- The payment verification endpoint is called server-side only, never from the browser.
- No next offer is shown until the current purchased deliverable is generated and displayed.

---

## Support

support@gspacesolutions.org
