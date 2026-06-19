// ============================================================
// GSpaceAi — Product & Payment Ladder Configuration
//
// All payment links, product names, and offer copy live here.
// No Stripe URLs or product names anywhere else in the codebase.
//
// IMPORTANT: sheetProductName must match the Google Sheet's
// Product column exactly (case-insensitive comparison is done
// by the Apps Script, but keep these accurate).
// ============================================================

import type { ProductConfig } from "./types";

export const PRODUCTS: Record<string, ProductConfig> = {
  recommendations_report: {
    key: "recommendations_report",
    name: "Recommendations Report",
    price: 29,
    stripeLinkEnvKey: "STRIPE_RECOMMENDATIONS_LINK",
    sheetProductName: "Recommendations Report",
    unlockedDeliverable: "recommendations_report",
    offerHeadline: "Unlock Your Personalized Replacement Roadmap",
    offerCopy:
      "Your free snapshot shows where software overlap may exist. The Recommendations Report gives you the full roadmap for which tools to keep, replace, consolidate, or automate using Google Workspace.",
    buttonLabel: "Get Recommendations Report — $29",
  },

  implementation_guide_sop: {
    key: "implementation_guide_sop",
    name: "Implementation Guide + SOP Book",
    price: 79,
    stripeLinkEnvKey: "STRIPE_IMPLEMENTATION_LINK",
    // Note: ampersand (&) not plus (+) — must match the Google Sheet
    sheetProductName: "Implementation Guide & SOP Book",
    unlockedDeliverable: "implementation_guide_sop",
    offerHeadline: "Turn Your Roadmap Into A Build Plan",
    offerCopy:
      "Get the step-by-step implementation guide, recommended Google Workspace setup, automation ideas, and SOPs for putting your recommendations into action.",
    buttonLabel: "Get Implementation Guide + SOP Book — $79",
  },

  done_with_you: {
    key: "done_with_you",
    name: "Done-With-You Implementation",
    price: 159,
    stripeLinkEnvKey: "STRIPE_DONE_WITH_YOU_LINK",
    sheetProductName: "Done-With-You Implementation",
    unlockedDeliverable: "done_with_you_confirmation",
    offerHeadline: "Want Help Implementing This?",
    offerCopy:
      "GSpace Solutions can help you review the roadmap and begin implementing the recommended systems with you.",
    buttonLabel: "Get Done-With-You Implementation — $159",
  },
};

// Ordered list for offer progression
export const PRODUCT_ORDER: (keyof typeof PRODUCTS)[] = [
  "recommendations_report",
  "implementation_guide_sop",
  "done_with_you",
];

/**
 * Returns the Stripe payment link for a product.
 * Server-side only — reads from process.env at runtime.
 */
export function getStripeLink(productKey: string): string {
  const product = PRODUCTS[productKey];
  if (!product) return "";
  const link = process.env[product.stripeLinkEnvKey];
  if (!link) {
    console.warn(`Missing env var: ${product.stripeLinkEnvKey}`);
    return "";
  }
  return link;
}

/**
 * Client-safe Stripe links.
 *
 * Next.js inlines NEXT_PUBLIC_ vars at build time using STATIC analysis only.
 * Dynamic access like process.env[`NEXT_PUBLIC_${key}`] always returns undefined.
 * These must be literal property references — do not refactor into dynamic lookups.
 */
export const CLIENT_STRIPE_LINKS: Record<string, string> = {
  recommendations_report:  process.env.NEXT_PUBLIC_STRIPE_RECOMMENDATIONS_LINK  ?? "",
  implementation_guide_sop: process.env.NEXT_PUBLIC_STRIPE_IMPLEMENTATION_LINK  ?? "",
  done_with_you:            process.env.NEXT_PUBLIC_STRIPE_DONE_WITH_YOU_LINK    ?? "",
};

/**
 * Returns the Stripe payment link for a product — safe to call from client components.
 */
export function getClientStripeLink(productKey: string): string {
  return CLIENT_STRIPE_LINKS[productKey] ?? "";
}

/**
 * Returns the sheet product name used for payment verification.
 * This must match the Google Sheet's Product column (case-insensitive).
 */
export function getSheetProductName(productKey: string): string {
  return PRODUCTS[productKey]?.sheetProductName ?? "";
}
