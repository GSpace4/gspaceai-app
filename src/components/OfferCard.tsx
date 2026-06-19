"use client";

import { PRODUCTS, getClientStripeLink } from "@/src/lib/productConfig";

type Props = {
  productKey: keyof typeof PRODUCTS;
  onPayNow: (stripeLink: string) => void;
  onVerifyPayment: () => void;
};

export default function OfferCard({ productKey, onPayNow, onVerifyPayment }: Props) {
  const product = PRODUCTS[productKey];
  if (!product) return null;

  // Use the static client-safe lookup — dynamic process.env[dynamicKey] always
  // returns undefined in Next.js because NEXT_PUBLIC_ vars are inlined at build time.
  const stripeLink = getClientStripeLink(String(productKey));
  const hasLink = stripeLink.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-8">
      <div className="bg-white rounded-2xl border-2 border-brand-blue shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-brand-blue px-6 py-4">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
            Recommended Next Step
          </p>
          <h3 className="text-white text-lg font-bold">{product.offerHeadline}</h3>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-brand-dark/70 text-sm leading-relaxed mb-5">
            {product.offerCopy}
          </p>

          {/* Pay button — only render as <a> when we have a real Stripe URL */}
          <div className="flex items-center gap-3 mb-3">
            {hasLink ? (
              <a
                href={stripeLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onPayNow(stripeLink)}
                className="flex-1 text-center bg-brand-blue text-white font-semibold py-3 px-6 rounded-xl hover:bg-brand-blue/90 active:scale-95 transition-all"
              >
                {product.buttonLabel}
              </a>
            ) : (
              <button
                onClick={() => onPayNow("")}
                className="flex-1 text-center bg-brand-blue text-white font-semibold py-3 px-6 rounded-xl hover:bg-brand-blue/90 active:scale-95 transition-all opacity-60 cursor-not-allowed"
                disabled
              >
                {product.buttonLabel} (link not configured)
              </button>
            )}
          </div>

          {/* Verify payment */}
          <button
            onClick={onVerifyPayment}
            className="w-full text-center text-brand-blue text-sm font-medium py-2 rounded-xl border border-brand-blue/30 hover:bg-brand-blue/5 transition-colors"
          >
            I already paid — Verify Payment
          </button>

          <p className="text-center text-xs text-brand-dark/30 mt-3">
            Secure payment via Stripe · Instant access after verification
          </p>
        </div>
      </div>
    </div>
  );
}
