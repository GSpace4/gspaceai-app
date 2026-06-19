// ============================================================
// GSpaceAi — PDF Generation
// Server-side only. Uses @react-pdf/renderer renderToBuffer.
// ============================================================

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PlatformConsolidationSnapshotPDF } from "@/src/pdf-templates/PlatformConsolidationSnapshot";
import { RecommendationsReportPDF } from "@/src/pdf-templates/RecommendationsReport";
import { ImplementationGuidePDF } from "@/src/pdf-templates/ImplementationGuide";
import type { FreeReportData, RecommendationsReportData, ImplementationGuideData } from "./reportGeneration";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function renderPDF(component: any, props: any): Promise<Buffer> {
  const element = React.createElement(component, props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(element as any);
}

export async function generateFreeReportPDF(data: FreeReportData): Promise<Buffer> {
  return renderPDF(PlatformConsolidationSnapshotPDF, { data });
}

export async function generateRecommendationsReportPDF(data: RecommendationsReportData): Promise<Buffer> {
  return renderPDF(RecommendationsReportPDF, { data });
}

export async function generateImplementationGuidePDF(data: ImplementationGuideData): Promise<Buffer> {
  return renderPDF(ImplementationGuidePDF, { data });
}
