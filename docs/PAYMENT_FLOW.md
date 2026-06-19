# GSpaceAi Payment Flow

## Overview

GSpaceAi uses **external Stripe payment links** — no Stripe SDK, no webhooks.
Payment verification is done against a **Google Sheet** via a **Google Apps Script web app**.

---

## Payment Links (from environment variables)

| Product | Price | Env Var |
|---|---|---|
| Recommendations Report | $29 | `STRIPE_RECOMMENDATIONS_LINK` |
| Implementation Guide + SOP Book | $79 | `STRIPE_IMPLEMENTATION_LINK` |
| Done-With-You Implementation | $159 | `STRIPE_DONE_WITH_YOU_LINK` |

Links are NEVER hardcoded in components. Always read from `process.env` via `productConfig.ts`.

---

## Verification Endpoint

**URL (env var):** `PAYMENT_VERIFICATION_ENDPOINT`

Called **server-side only** from `/api/verify-payment`. Never called directly from the browser.

**Request:** `GET ?email=<email>&product=<sheetProductName>`

**Response:**
```json
{ "status": "PAID" | "NOT_FOUND" | "ERROR", "email": "...", "product": "...", "message": "..." }
```

---

## Product Name Mapping

The Google Sheet uses these exact product names (case-insensitive matching):

| Internal Key | Sheet Product Name |
|---|---|
| `recommendations_report` | `Recommendations Report` |
| `implementation_guide_sop` | `Implementation Guide & SOP Book` |
| `done_with_you` | `Done-With-You Implementation` |

The mapping lives in `src/lib/productConfig.ts` (`sheetProductName` field).

---

## Payment Gating Rules (NEVER VIOLATE)

1. Free report: no payment required.
2. `recommendations_report`: requires verified `$29` payment.
3. `implementation_guide_sop`: requires verified `$79` payment.
4. `done_with_you`: requires verified `$159` payment.

**Correct sequence after verification:**
```
verified → generate deliverable → save → display → THEN show next offer
```

**This sequence is enforced by:**
- `canTransition()` in `src/lib/workflowState.ts`
- Gating check in `app/api/generate-report/route.ts`
- Reducer guards in `src/context/AppStateContext.tsx`

---

## Error Messages

| Scenario | Message |
|---|---|
| Not found | "Payment could not be verified yet. Please confirm the email used at checkout and try again. If you just paid, wait a moment and click verify again." |
| Wrong product | "We found a payment for this email, but not for this specific report. Please confirm you selected the correct offer and try again." |
| Missing email | "Please enter the email address used at checkout so we can verify your payment." |
| Service error | "We could not complete payment verification right now. Please try again in a moment." |

---

## Google Sheet Structure

The Apps Script reads a sheet named `Payments` with columns:
- **A: Timestamp**
- **B: Email**
- **C: Product**
- **D: Amount**
- **E: Stripe Event ID**
- **F: Status** (must be `Paid` for verification to succeed)
