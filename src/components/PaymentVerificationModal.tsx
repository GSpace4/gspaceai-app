"use client";

import { useState } from "react";
import { PRODUCTS } from "@/src/lib/productConfig";

type Props = {
  productKey: keyof typeof PRODUCTS;
  sessionId?: string;
  onVerified: (email: string) => void;
  onCancel: () => void;
};

export default function PaymentVerificationModal({ productKey, sessionId, onVerified, onCancel }: Props) {
  const product = PRODUCTS[productKey];
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleVerify() {
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg("Please enter the email address used at checkout.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, productKey, sessionId }),
      });

      const data = await res.json() as {
        verified: boolean;
        status: string;
        message: string;
      };

      if (data.verified) {
        onVerified(trimmed);
      } else {
        setErrorMsg(data.message);
      }
    } catch {
      setErrorMsg("We could not complete payment verification right now. Please try again in a moment.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Verify Your Payment</h2>
            <p className="text-sm text-brand-dark/50 mt-0.5">
              {product?.name} — ${product?.price}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-brand-dark/30 hover:text-brand-dark/60 transition-colors ml-4 mt-0.5"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-brand-dark/70 mb-5 leading-relaxed">
          Enter the email address you used when purchasing through Stripe. We&apos;ll check our records
          and unlock your report instantly.
        </p>

        {/* Email input */}
        <div className="mb-4">
          <label htmlFor="verify-email" className="block text-sm font-medium text-brand-dark mb-1.5">
            Email used at checkout
          </label>
          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleVerify(); }}
            placeholder="you@example.com"
            disabled={isLoading}
            className="
              w-full border border-brand-border rounded-xl px-4 py-2.5 text-sm
              text-brand-dark placeholder-brand-dark/30
              focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue
              disabled:opacity-50
            "
            autoFocus
          />
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-brand-red/20 rounded-xl px-4 py-3 text-sm text-brand-red">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-brand-border text-sm font-medium text-brand-dark/60 hover:bg-brand-light transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            disabled={isLoading || !email.trim()}
            className="flex-1 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/90 transition-colors disabled:opacity-40"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              "Verify Payment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
