"use client";

import type { FreeReportData } from "@/src/lib/reportGeneration";
import { BRAND_COLORS } from "@/src/lib/constants";

type Props = {
  data: FreeReportData;
  pdfBase64: string;
  onMarkDisplayed: () => void;
};

export default function ReportViewer({ data, pdfBase64, onMarkDisplayed }: Props) {
  const score = data.scoreBreakdown;
  const savings = data.savings;
  const biz = data.businessSnapshot;

  // Mark as displayed on first render
  // Using a ref to avoid double-calling in strict mode
  const markedRef = { current: false };
  if (!markedRef.current) {
    markedRef.current = true;
    setTimeout(onMarkDisplayed, 100);
  }

  function handleDownload() {
    const byteChars = atob(pdfBase64);
    const byteNums = Array.from(byteChars).map((c) => c.charCodeAt(0));
    const blob = new Blob([new Uint8Array(byteNums)], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSpaceAi-Snapshot-${biz.businessName.replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scoreColor(s: number): string {
    if (s >= 76) return BRAND_COLORS.red;
    if (s >= 51) return BRAND_COLORS.green;
    if (s >= 26) return BRAND_COLORS.yellow;
    return BRAND_COLORS.blue;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* Report header */}
      <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider mb-1">
              Platform Consolidation Snapshot
            </p>
            <h2 className="text-xl font-bold text-brand-dark">{biz.businessName}</h2>
            <p className="text-sm text-brand-dark/50 mt-1">
              Generated {new Date(data.generatedAt).toLocaleDateString("en-US", {
                month: "long", day: "numeric", year: "numeric"
              })}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-brand-blue text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-blue/90 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold" style={{ color: scoreColor(score.total) }}>
              {score.total}
            </p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Consolidation Score</p>
          </div>
          <div className="bg-brand-light rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-brand-dark">{biz.toolCount}</p>
            <p className="text-xs text-brand-dark/50 mt-0.5">Tools Analyzed</p>
          </div>
          {data.primaryImpact && (
            <div className="bg-brand-light rounded-xl p-3 text-center">
              <p className={`text-base font-bold leading-tight ${
                data.primaryImpact.color === "green" ? "text-brand-green" :
                data.primaryImpact.color === "yellow" ? "text-brand-yellow" :
                "text-brand-blue"
              }`}>
                {data.primaryImpact.label}
              </p>
              <p className="text-xs text-brand-dark/50 mt-0.5">Primary Impact</p>
            </div>
          )}
          {data.secondaryImpact && (
            <div className="bg-brand-light rounded-xl p-3 text-center">
              <p className={`text-base font-bold leading-tight ${
                data.secondaryImpact.color === "green" ? "text-brand-green" :
                data.secondaryImpact.color === "yellow" ? "text-brand-yellow" :
                "text-brand-blue"
              }`}>
                {data.secondaryImpact.label}
              </p>
              <p className="text-xs text-brand-dark/50 mt-0.5">Secondary Impact</p>
            </div>
          )}
        </div>

        {/* Score label */}
        <div className="mt-3 text-center">
          <span className="inline-block bg-brand-blue/10 text-brand-blue text-xs font-semibold px-3 py-1 rounded-full">
            {score.label}
          </span>
        </div>
      </div>

      {/* Key Findings */}
      {data.keyFindings.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4">
            High-Level Findings
          </h3>
          <div className="space-y-3">
            {data.keyFindings.map((finding, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-brand-blue text-xs font-bold">{idx + 1}</span>
                </div>
                <p className="text-sm text-brand-dark/80 leading-relaxed">{finding}</p>
              </div>
            ))}
          </div>
          {savings.isEstimated && (
            <p className="text-xs text-brand-dark/40 mt-4 italic">
              * Savings figures are estimates based on the tools and usage described. Actual savings may vary.
            </p>
          )}
        </div>
      )}

      {/* Software Inventory preview */}
      {data.softwareInventory.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm">
          <h3 className="text-sm font-bold text-brand-dark uppercase tracking-wider mb-4">
            Software Inventory ({data.softwareInventory.length} tools)
          </h3>
          <div className="space-y-2">
            {data.softwareInventory.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-brand-border last:border-0">
                <div>
                  <span className="text-sm font-semibold text-brand-dark">{item.name}</span>
                  <span className="text-xs text-brand-dark/40 ml-2">{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.estimatedMonthlyCost ? (
                    <span className="text-xs text-brand-dark/60">${item.estimatedMonthlyCost}/mo</span>
                  ) : null}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.recommendedAction === "Replace" ? "bg-brand-green/10 text-brand-green" :
                    item.recommendedAction === "Consolidate" ? "bg-brand-blue/10 text-brand-blue" :
                    item.recommendedAction === "Keep" ? "bg-brand-dark/10 text-brand-dark/60" :
                    item.recommendedAction === "Automate" ? "bg-brand-yellow/20 text-brand-dark" :
                    "bg-brand-border text-brand-dark/50"
                  }`}>
                    {item.recommendedAction || "Investigate"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
