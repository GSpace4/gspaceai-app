// ============================================================
// GSpaceAi — /api/verify-payment
// Verifies a Stripe payment against the Google Sheet tracker.
// Calls the Apps Script web app endpoint server-side only —
// the endpoint URL is never exposed to the browser.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { getSheetProductName } from "@/src/lib/productConfig";
import { upsertSession } from "@/src/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

type VerifyPaymentBody = {
  email: string;
  productKey: string;
  sessionId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyPaymentBody;
    const email = (body.email ?? "").trim().toLowerCase();
    const productKey = (body.productKey ?? "").trim();
    const sessionId = (body.sessionId ?? "").trim();

    // Validate inputs
    if (!email) {
      return NextResponse.json({
        verified: false,
        status: "MISSING_EMAIL",
        message: "Please enter the email address used at checkout so we can verify your payment.",
      }, { status: 400 });
    }

    if (!productKey) {
      return NextResponse.json({
        verified: false,
        status: "ERROR",
        message: "Product key is missing. Please try again.",
      }, { status: 400 });
    }

    // Map internal product key to the exact name used in the Google Sheet
    const sheetProductName = getSheetProductName(productKey);
    if (!sheetProductName) {
      return NextResponse.json({
        verified: false,
        status: "ERROR",
        message: "Unknown product. Please try again.",
      }, { status: 400 });
    }

    const endpoint = process.env.PAYMENT_VERIFICATION_ENDPOINT;
    if (!endpoint) {
      console.error("[verify-payment] PAYMENT_VERIFICATION_ENDPOINT is not set");
      return NextResponse.json({
        verified: false,
        status: "ERROR",
        message: "Payment verification is not configured. Please contact support.",
      }, { status: 500 });
    }

    // Call the Google Apps Script web app — server-side only, never from browser
    const url = `${endpoint}?email=${encodeURIComponent(email)}&product=${encodeURIComponent(sheetProductName)}`;
    console.log(`[verify-payment] Checking: ${email} / ${sheetProductName}`);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned HTTP ${response.status}`);
    }

    const result = await response.json() as {
      status: string;
      email?: string;
      product?: string;
      message?: string;
    };

    console.log(`[verify-payment] Result:`, result);

    if (result.status === "PAID") {
      // Record the verified email on the session — fire and forget
      if (sessionId) {
        upsertSession(sessionId, { email, stage: `${productKey}_verified` })
          .catch((err) => console.warn("[verify-payment] Supabase update error:", err));
      }

      return NextResponse.json({
        verified: true,
        status: "PAID",
        email,
        productKey,
        message: "Payment confirmed.",
      });
    }

    if (result.status === "NOT_FOUND") {
      return NextResponse.json({
        verified: false,
        status: "NOT_FOUND",
        message:
          "Payment could not be verified yet. Please confirm the email used at checkout and try again. If you just paid, wait a moment and click verify again.",
      });
    }

    // Wrong product or other mismatch
    return NextResponse.json({
      verified: false,
      status: result.status ?? "ERROR",
      message:
        result.message ??
        "We could not complete payment verification right now. Please try again in a moment.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[verify-payment] Error:", message);
    return NextResponse.json({
      verified: false,
      status: "ERROR",
      message: "We could not complete payment verification right now. Please try again in a moment.",
    }, { status: 500 });
  }
}
