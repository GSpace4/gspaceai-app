// ============================================================
// GSpaceAi — Recommendations Report PDF ($29)
// ============================================================

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { shared, C, priorityColor, actionColor } from "./shared/pdfStyles";
import type { RecommendationsReportData, PriorityMatrixItem, PrimaryFinding, TimeRecoveryItem, EnhancementOpportunity, RecommendationsGeminiOpportunity } from "@/src/lib/reportGeneration";

const s = StyleSheet.create({
  coverPage: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 60 },
  coverBrand: { fontSize: 28, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 8 },
  coverDivider: { width: 60, height: 3, backgroundColor: C.blue, marginBottom: 32, marginTop: 8 },
  coverTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.dark, textAlign: "center", marginBottom: 12 },
  coverBusinessName: { fontSize: 14, color: C.blue, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 6 },
  coverMeta: { fontSize: 8, color: C.gray, textAlign: "center", marginBottom: 3 },
  coverFooter: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  coverFooterText: { fontSize: 7.5, color: C.gray },
  noData: { fontSize: 8, color: C.gray, fontStyle: "italic", paddingVertical: 6 },
  roadmapPeriod: { fontFamily: "Helvetica-Bold", fontSize: 9, color: C.blue, marginBottom: 4, marginTop: 8 },
  execSummary: { fontSize: 9, color: C.dark, lineHeight: 1.5, backgroundColor: C.blueBg, borderRadius: 4, padding: 10, marginBottom: 4 },
  // Platform replacement
  toolCard: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  toolName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark },
  toolDetail: { fontSize: 8, color: C.gray, marginTop: 2, lineHeight: 1.4 },
  toolOutcome: { fontSize: 8, color: C.dark, marginTop: 2, lineHeight: 1.4 },
  toolGW: { fontSize: 7.5, color: C.blue, marginTop: 2 },
  toolSavings: { fontSize: 7.5, color: C.green, marginTop: 2 },
  // Opportunity cards
  oppCard: { marginBottom: 7, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.blue },
  oppTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 1 },
  oppBody: { fontSize: 8, color: C.gray, lineHeight: 1.4 },
  oppMeta: { fontSize: 7.5, color: C.green, marginTop: 1 },
  // GW opportunities
  gwCard: { marginBottom: 9, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  gwTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 },
  gwRow: { flexDirection: "row", marginBottom: 2 },
  gwLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blue, width: 80 },
  gwValue: { fontSize: 7.5, color: C.dark, flex: 1, lineHeight: 1.4 },
  // Bottleneck / manual work rows
  listRow: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  listBullet: { fontSize: 8, color: C.blue, width: 14, flexShrink: 0 },
  listText: { fontSize: 8, color: C.dark, flex: 1, lineHeight: 1.4 },
  // Recommended systems
  sysCard: { marginBottom: 8, flexDirection: "row" },
  sysLeft: { flex: 1, paddingRight: 8 },
  sysName: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark },
  sysPurpose: { fontSize: 8, color: C.gray, marginTop: 1 },
  sysGW: { fontSize: 7.5, color: C.blue, marginTop: 2 },
  // Priority matrix
  matrixHeader: { flexDirection: "row", backgroundColor: C.dark, paddingVertical: 5, paddingHorizontal: 4 },
  matrixHeaderCell: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white },
  matrixRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  matrixRowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.light },
  matrixCell: { fontSize: 8, color: C.dark },
  // Savings table
  savingsTotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, backgroundColor: C.blueBg, borderTopWidth: 1, borderTopColor: C.blue },
  savingsTotalCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.blue },
  // Primary finding
  primaryFindingBox: { backgroundColor: C.dark, borderRadius: 5, padding: 12, marginBottom: 12 },
  primaryFindingLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  primaryFindingHeadline: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 6, lineHeight: 1.3 },
  primaryFindingDetail: { fontSize: 8, color: "#cccccc", lineHeight: 1.5 },
  // Time recovery table total row
  timeRecoveryTotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, backgroundColor: C.dark },
  timeRecoveryTotalCell: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white },
  // Enhancement cards
  enhCard: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  enhTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 1 },
  enhRow: { flexDirection: "row", marginBottom: 1 },
  enhLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blue, width: 80 },
  enhValue: { fontSize: 7.5, color: C.dark, flex: 1, lineHeight: 1.4 },
});

function priorityBadgeColor(p: string): string {
  if (p === "High") return C.red;
  if (p === "Medium") return C.yellow;
  return C.green;
}

function impactColor(v: string): string {
  if (v === "High") return C.green;
  if (v === "Medium") return C.yellow;
  return C.gray;
}

function PageHeader() {
  return (
    <View style={shared.pageHeader}>
      <Text style={shared.brandText}>GSpace<Text style={{ color: C.blue }}>Ai</Text></Text>
      <View style={shared.headerRight}>
        <Text style={shared.reportTitleText}>Recommendations Report</Text>
        <Text style={shared.headerMeta}>A GSpace Solutions Product</Text>
      </View>
    </View>
  );
}

function PageFooter({ businessName, page }: { businessName: string; page: number }) {
  return (
    <View style={shared.pageFooter} fixed>
      <Text style={shared.footerText}>{businessName} · Recommendations Report</Text>
      <Text style={shared.footerText}>GSpaceAi · Page {page}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={shared.sectionTitle}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={shared.bulletRow}>
      <Text style={shared.bulletDot}>›</Text>
      <Text style={shared.bulletText}>{String(children ?? '')}</Text>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[shared.badge, { backgroundColor: color }]}>
      <Text style={shared.badgeText}>{label.toUpperCase()}</Text>
    </View>
  );
}

function ImpactBadge({ label }: { label: string }) {
  return (
    <View style={[shared.badge, { backgroundColor: impactColor(label) }]}>
      <Text style={shared.badgeText}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function RecommendationsReportPDF({ data }: { data: RecommendationsReportData }) {
  const biz = data.businessSnapshot;
  const score = data.scoreBreakdown;
  const savings = data.savings;
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const totalSavingsMonthly = (data.savingsTable ?? []).reduce((sum, r) => sum + (r.monthlySavings ?? 0), 0);
  const totalSavingsAnnual  = (data.savingsTable ?? []).reduce((sum, r) => sum + (r.annualSavings ?? 0), 0);

  return (
    <Document title="Recommendations Report" author="GSpaceAi — A GSpace Solutions Product">

      {/* ── PAGE 1: COVER ── */}
      <Page size="LETTER" style={[shared.page, { justifyContent: "center" }]}>
        <View style={s.coverPage}>
          <Text style={s.coverBrand}>GSpace<Text style={{ color: C.blue }}>Ai</Text></Text>
          <Text style={{ fontSize: 9, color: C.gray }}>A GSpace Solutions Product</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverTitle}>Recommendations Report</Text>
          <Text style={s.coverBusinessName}>{biz.businessName}</Text>
          <Text style={s.coverMeta}>Prepared For: {data.user.name || biz.businessName}</Text>
          <Text style={s.coverMeta}>Generated By: GSpaceAi · A GSpace Solutions Product</Text>
          <Text style={s.coverMeta}>Date: {date}</Text>
          <View style={{ marginTop: 20, backgroundColor: C.blueBg, borderRadius: 6, padding: 12, alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: C.blue, fontFamily: "Helvetica-Bold" }}>CONFIDENTIAL — PAID REPORT</Text>
            <Text style={{ fontSize: 8, color: C.gray, marginTop: 2 }}>Prepared exclusively for {biz.businessName}</Text>
          </View>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>Confidential — Prepared exclusively for {biz.businessName}</Text>
        </View>
      </Page>

      {/* ── PAGE 2: EXECUTIVE SNAPSHOT + SOFTWARE STACK REVIEW ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Primary Finding */}
        {(data.primaryFinding as PrimaryFinding)?.headline && (
          <View style={s.primaryFindingBox}>
            <Text style={s.primaryFindingLabel}>
              Primary Finding · {(data.primaryFinding as PrimaryFinding).priority} Priority
            </Text>
            <Text style={s.primaryFindingHeadline}>{(data.primaryFinding as PrimaryFinding).headline}</Text>
            <Text style={s.primaryFindingDetail}>{(data.primaryFinding as PrimaryFinding).detail}</Text>
          </View>
        )}

        {/* Scorecard */}
        <View style={shared.section}>
          <SectionTitle>Executive Snapshot</SectionTitle>
          <View style={shared.metricsRow}>
            <View style={shared.metricCard}>
              <Text style={[shared.metricValue, { color: C.blue }]}>{score.total}</Text>
              <Text style={shared.metricLabel}>Consolidation{"\n"}Score</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={shared.metricValue}>{biz.toolCount}</Text>
              <Text style={shared.metricLabel}>Tools{"\n"}Analyzed</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={shared.metricValueGreen}>${savings.estimatedReplaceableMonthlySpend}/mo</Text>
              <Text style={shared.metricLabel}>Potential{"\n"}Savings</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={shared.metricValueGreen}>${savings.estimatedAnnualSavings.toLocaleString()}/yr</Text>
              <Text style={shared.metricLabel}>Est. Annual{"\n"}Savings</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <View style={[shared.badge, { backgroundColor: C.blue, marginRight: 8 }]}>
              <Text style={shared.badgeText}>{score.label.toUpperCase()}</Text>
            </View>
            <Text style={{ fontSize: 8, color: C.gray }}>{biz.businessType}{biz.industry ? ` · ${biz.industry}` : ""}</Text>
          </View>

          {data.executiveSummary ? (
            <Text style={s.execSummary}>{data.executiveSummary}</Text>
          ) : null}
        </View>

        {/* Software Stack Review — KRCA table */}
        <View style={shared.section}>
          <SectionTitle>Software Stack Review</SectionTitle>
          {(data.softwareStackReview ?? []).length > 0 ? (
            <View style={shared.table}>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 2.5 }]}>Platform</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Cost/Mo</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Recommendation</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2.5 }]}>Assessment</Text>
              </View>
              {data.softwareStackReview.map((item, idx) => (
                <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                  <Text style={[shared.tableCell, { flex: 2.5, fontFamily: "Helvetica-Bold" }]}>{item.platform}</Text>
                  <Text style={[shared.tableCell, { flex: 1 }]}>{item.estimatedMonthlyCost ? `$${item.estimatedMonthlyCost}` : "—"}</Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: actionColor(item.recommendation) }]}>{item.recommendation}</Text>
                  <Text style={[shared.tableCell, { flex: 2.5, color: C.gray }]}>{item.reason}</Text>
                </View>
              ))}
            </View>
          ) : data.softwareInventory.length > 0 ? (
            <View style={shared.table}>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Platform</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Category</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Cost/Mo</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Recommendation</Text>
              </View>
              {data.softwareInventory.map((item, idx) => (
                <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                  <Text style={[shared.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{item.name}</Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: C.gray }]}>{item.category}</Text>
                  <Text style={[shared.tableCell, { flex: 1 }]}>{item.estimatedMonthlyCost ? `$${item.estimatedMonthlyCost}` : "—"}</Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: actionColor(item.recommendedAction ?? "") }]}>
                    {item.recommendedAction ?? "Investigate"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.noData}>No software inventory recorded.</Text>
          )}
        </View>

        <PageFooter businessName={biz.businessName} page={2} />
      </Page>

      {/* ── PAGE 3: PLATFORM REPLACEMENT ANALYSIS ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        <View style={shared.section}>
          <SectionTitle>Platform Replacement Analysis</SectionTitle>
          <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
            Detailed assessment of every tool flagged for replacement, consolidation, or automation.
          </Text>
          {(data.platformReplacementAnalysis ?? []).length === 0 ? (
            <Text style={s.noData}>Platform analysis not available.</Text>
          ) : (
            data.platformReplacementAnalysis.map((item, idx) => (
              <View key={idx} style={s.toolCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <Text style={s.toolName}>{item.tool}</Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    <Badge label={item.priority ?? "Medium"} color={priorityBadgeColor(item.priority ?? "Medium")} />
                    <Badge label={item.recommendation} color={actionColor(item.recommendation)} />
                  </View>
                </View>
                <Text style={s.toolDetail}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Current: </Text>
                  {item.currentState}
                </Text>
                <Text style={s.toolDetail}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Problem: </Text>
                  {item.problem ?? item.reason ?? ""}
                </Text>
                {item.businessImpact ? (
                  <Text style={[s.toolDetail, { color: C.red }]}>
                    <Text style={{ fontFamily: "Helvetica-Bold", color: C.red }}>Business Impact: </Text>
                    {item.businessImpact}
                  </Text>
                ) : null}
                {item.googleWorkspaceAlternative ? (
                  <Text style={s.toolGW}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>GW Alternative: </Text>
                    {item.googleWorkspaceAlternative}
                  </Text>
                ) : null}
                <Text style={s.toolOutcome}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>Expected Outcome: </Text>
                  {item.expectedOutcome ?? ""}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 3 }}>
                  {item.estimatedMonthlySavings > 0 && (
                    <Text style={s.toolSavings}>Potential savings: ~${item.estimatedMonthlySavings}/mo</Text>
                  )}
                  {item.complexity && (
                    <Text style={{ fontSize: 7.5, color: C.gray }}>Complexity: {item.complexity}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <PageFooter businessName={biz.businessName} page={3} />
      </Page>

      {/* ── PAGE 4: GW CONSOLIDATION OPPORTUNITIES + BOTTLENECKS + MANUAL WORK ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* GW Consolidation Opportunities */}
        {(data.googleWorkspaceConsolidationOpportunities ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Google Workspace Consolidation Opportunities</SectionTitle>
            {data.googleWorkspaceConsolidationOpportunities.map((item, idx) => (
              <View key={idx} style={s.gwCard}>
                <Text style={s.gwTitle}>{item.opportunity}</Text>
                <View style={s.gwRow}>
                  <Text style={s.gwLabel}>Why:</Text>
                  <Text style={s.gwValue}>{item.why}</Text>
                </View>
                <View style={s.gwRow}>
                  <Text style={s.gwLabel}>What Changes:</Text>
                  <Text style={s.gwValue}>{item.whatChanges}</Text>
                </View>
                {item.whyWorkspaceIsAGoodFit ? (
                  <View style={s.gwRow}>
                    <Text style={s.gwLabel}>Why GW Fits:</Text>
                    <Text style={[s.gwValue, { color: C.blue }]}>{item.whyWorkspaceIsAGoodFit}</Text>
                  </View>
                ) : null}
                <View style={s.gwRow}>
                  <Text style={s.gwLabel}>Benefit:</Text>
                  <Text style={[s.gwValue, { color: C.green }]}>{item.expectedBenefit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Workflow Bottlenecks */}
        {(data.workflowBottlenecks ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Workflow Bottlenecks</SectionTitle>
            {data.workflowBottlenecks.map((item, idx) => (
              <View key={idx} style={{ marginBottom: 7 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark }}>{item.title}</Text>
                  <ImpactBadge label={item.impact ?? "Medium"} />
                </View>
                <Text style={{ fontSize: 8, color: C.gray, lineHeight: 1.4 }}>{item.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Manual Work Reductions */}
        {(data.manualWorkReductions ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Manual Work Reduction Opportunities</SectionTitle>
            {data.manualWorkReductions.map((item, idx) => (
              <View key={idx} style={{ marginBottom: 7 }}>
                <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 }}>{item.opportunity}</Text>
                <Text style={{ fontSize: 8, color: C.gray, lineHeight: 1.4 }}>{item.currentProcess}</Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                  <Text style={{ fontSize: 7.5, color: C.blue }}>Tool: {item.googleTool}</Text>
                  <Text style={{ fontSize: 7.5, color: C.green }}>Saves: {item.estimatedTimeSaved}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Time Recovery Metrics */}
        {(data.timeRecovery ?? []).length > 0 && (() => {
          const items = data.timeRecovery as TimeRecoveryItem[];
          return (
            <View style={shared.section}>
              <SectionTitle>Time Recovery Metrics</SectionTitle>
              <View style={shared.table}>
                <View style={shared.tableHeaderRow}>
                  <Text style={[shared.tableHeaderCell, { flex: 2.5 }]}>Manual Task</Text>
                  <Text style={[shared.tableHeaderCell, { flex: 1.2 }]}>Current Cost</Text>
                  <Text style={[shared.tableHeaderCell, { flex: 1.2 }]}>Recoverable</Text>
                  <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Method</Text>
                </View>
                {items.map((row, idx) => (
                  <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                    <Text style={[shared.tableCell, { flex: 2.5 }]}>{row.task}</Text>
                    <Text style={[shared.tableCell, { flex: 1.2, color: C.red }]}>{row.currentTimeSpent}</Text>
                    <Text style={[shared.tableCell, { flex: 1.2, color: C.green }]}>{row.recoveredTime}</Text>
                    <Text style={[shared.tableCell, { flex: 2, color: C.blue }]}>{row.method}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Enhancement Opportunities */}
        {(data.enhancementOpportunities ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Enhancement Opportunities</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              Tools already in use that can do significantly more with minor setup changes.
            </Text>
            {(data.enhancementOpportunities as EnhancementOpportunity[]).map((item, idx) => (
              <View key={idx} style={s.enhCard}>
                <Text style={s.enhTitle}>{item.title}</Text>
                <View style={s.enhRow}>
                  <Text style={s.enhLabel}>Tool:</Text>
                  <Text style={[s.enhValue, { fontFamily: "Helvetica-Bold", color: C.blue }]}>{item.tool}</Text>
                </View>
                <View style={s.enhRow}>
                  <Text style={s.enhLabel}>Today:</Text>
                  <Text style={s.enhValue}>{item.currentUsage}</Text>
                </View>
                <View style={s.enhRow}>
                  <Text style={s.enhLabel}>Enhancement:</Text>
                  <Text style={s.enhValue}>{item.enhancement}</Text>
                </View>
                <View style={s.enhRow}>
                  <Text style={s.enhLabel}>Benefit:</Text>
                  <Text style={[s.enhValue, { color: C.green }]}>{item.expectedBenefit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={4} />
      </Page>

      {/* ── PAGE 5: GEMINI AI OPPORTUNITIES ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {(data.geminiOpportunities ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Gemini AI Opportunities</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 10 }}>
              Specific ways Gemini can reduce manual work for {biz.businessName} — each tied to an actual workflow identified in your audit.
            </Text>
            {(data.geminiOpportunities as RecommendationsGeminiOpportunity[]).map((item, idx) => (
              <View key={idx} style={{ marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 4 }}>{item.useCase}</Text>
                <View style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.gray, width: 90 }}>Today:</Text>
                  <Text style={{ fontSize: 7.5, color: C.gray, flex: 1, lineHeight: 1.4 }}>{item.currentProcess}</Text>
                </View>
                <View style={{ flexDirection: "row", marginBottom: 3 }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blue, width: 90 }}>With Gemini:</Text>
                  <Text style={{ fontSize: 7.5, color: C.dark, flex: 1, lineHeight: 1.4 }}>{item.geminiEnhancement}</Text>
                </View>
                <View style={{ flexDirection: "row" }}>
                  <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.green, width: 90 }}>Benefit:</Text>
                  <Text style={{ fontSize: 7.5, color: C.green, flex: 1, lineHeight: 1.4 }}>{item.expectedBenefit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={5} />
      </Page>

      {/* ── PAGE 6: RECOMMENDED SYSTEMS + QUICK WINS ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {(data.recommendedSystems ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Recommended Lightweight Systems</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              These systems can be built inside Google Workspace to replace paid tools or fill operational gaps.
            </Text>
            {data.recommendedSystems.map((sys, idx) => (
              <View key={idx} style={s.sysCard}>
                <View style={s.sysLeft}>
                  <Text style={s.sysName}>{sys.name}</Text>
                  <Text style={s.sysPurpose}>{sys.purpose}</Text>
                  <Text style={s.sysGW}>{(sys.googleComponents ?? []).join(" · ")}</Text>
                  <Text style={{ fontSize: 7.5, color: C.green, marginTop: 2 }}>{sys.expectedImpact}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Badge label={sys.complexity} color={priorityColor(sys.complexity)} />
                </View>
              </View>
            ))}
          </View>
        )}

        {(data.quickWins ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Quick Wins — First 30 Days</SectionTitle>
            {data.quickWins.map((item, idx) => (
              <View key={idx} style={s.oppCard}>
                <Text style={s.oppTitle}>{item.title}</Text>
                <Text style={s.oppBody}>{item.description}</Text>
                <Text style={s.oppMeta}>Impact: {item.impact} · {item.timeToImplement}</Text>
              </View>
            ))}
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={6} />
      </Page>

      {/* ── PAGE 7: MEDIUM / ADVANCED + PRIORITY MATRIX ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {(data.mediumComplexityProjects ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Medium Complexity Projects</SectionTitle>
            {data.mediumComplexityProjects.map((item, idx) => (
              <View key={idx} style={s.oppCard}>
                <Text style={s.oppTitle}>{item.title}</Text>
                <Text style={s.oppBody}>{item.description}</Text>
                <Text style={s.oppMeta}>Impact: {item.impact} · {item.timeToImplement}</Text>
              </View>
            ))}
          </View>
        )}

        {(data.advancedOpportunities ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Advanced Opportunities</SectionTitle>
            {data.advancedOpportunities.map((item, idx) => (
              <View key={idx} style={s.oppCard}>
                <Text style={s.oppTitle}>{item.title}</Text>
                <Text style={s.oppBody}>{item.description}</Text>
                <Text style={s.oppMeta}>Impact: {item.impact} · {item.timeToImplement}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Priority Matrix */}
        {(data.priorityMatrix ?? []).length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Priority Matrix</SectionTitle>
            <View style={shared.table}>
              <View style={s.matrixHeader}>
                <Text style={[s.matrixHeaderCell, { flex: 1 }]}>Priority</Text>
                <Text style={[s.matrixHeaderCell, { flex: 3 }]}>Opportunity</Text>
                <Text style={[s.matrixHeaderCell, { flex: 1 }]}>Impact</Text>
                <Text style={[s.matrixHeaderCell, { flex: 1 }]}>Difficulty</Text>
              </View>
              {(data.priorityMatrix as PriorityMatrixItem[]).map((row, idx) => (
                <View key={idx} style={idx % 2 === 0 ? s.matrixRow : s.matrixRowAlt}>
                  <View style={{ flex: 1 }}>
                    <Badge label={row.priority} color={priorityBadgeColor(row.priority)} />
                  </View>
                  <Text style={[s.matrixCell, { flex: 3 }]}>{row.opportunity}</Text>
                  <Text style={[s.matrixCell, { flex: 1, color: impactColor(row.impact) }]}>{row.impact}</Text>
                  <Text style={[s.matrixCell, { flex: 1, color: priorityColor(row.difficulty) }]}>{row.difficulty}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={7} />
      </Page>

      {/* ── PAGE 8: SAVINGS TABLE + ROADMAP + CTA ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Savings Table */}
        <View style={shared.section}>
          <SectionTitle>Estimated Savings</SectionTitle>

          {(data.savingsTable ?? []).length > 0 ? (
            <View style={shared.table}>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 3 }]}>Opportunity</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Monthly Savings</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Annual Savings</Text>
              </View>
              {data.savingsTable.map((row, idx) => (
                <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                  <Text style={[shared.tableCell, { flex: 3 }]}>{row.opportunity}</Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: C.green }]}>${row.monthlySavings}/mo</Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: C.green }]}>${row.annualSavings.toLocaleString()}/yr</Text>
                </View>
              ))}
              {totalSavingsAnnual > 0 && (
                <View style={s.savingsTotal}>
                  <Text style={[s.savingsTotalCell, { flex: 3 }]}>TOTAL ESTIMATED SAVINGS</Text>
                  <Text style={[s.savingsTotalCell, { flex: 1.5 }]}>${totalSavingsMonthly}/mo</Text>
                  <Text style={[s.savingsTotalCell, { flex: 1.5 }]}>${totalSavingsAnnual.toLocaleString()}/yr</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={shared.calloutBox}>
              <Text style={shared.calloutTitle}>
                {savings.isEstimated ? "Estimated Potential Savings" : "Potential Savings"}
              </Text>
              <View style={shared.calloutRow}>
                <Text style={shared.calloutKey}>Current Est. Monthly Spend</Text>
                <Text style={shared.calloutValue}>${savings.estimatedMonthlySoftwareSpend}/mo</Text>
              </View>
              <View style={shared.calloutRow}>
                <Text style={shared.calloutKey}>Potential Replaceable Spend</Text>
                <Text style={shared.calloutValue}>${savings.estimatedReplaceableMonthlySpend}/mo</Text>
              </View>
              <View style={shared.calloutRow}>
                <Text style={shared.calloutKey}>Estimated Annual Savings</Text>
                <Text style={[shared.calloutValue, { fontSize: 12 }]}>${savings.estimatedAnnualSavings.toLocaleString()}/year</Text>
              </View>
            </View>
          )}
        </View>

        {/* 30/60/90 Roadmap */}
        <View style={shared.section}>
          <SectionTitle>Recommended 30 / 60 / 90 Day Roadmap</SectionTitle>
          {(data.roadmap30Day ?? []).length > 0 && (
            <>
              <Text style={s.roadmapPeriod}>First 30 Days</Text>
              {data.roadmap30Day.map((item, idx) => <Bullet key={idx}>{String(item ?? '')}</Bullet>)}
            </>
          )}
          {(data.roadmap60Day ?? []).length > 0 && (
            <>
              <Text style={s.roadmapPeriod}>Days 31–60</Text>
              {data.roadmap60Day.map((item, idx) => <Bullet key={idx}>{String(item ?? '')}</Bullet>)}
            </>
          )}
          {(data.roadmap90Day ?? []).length > 0 && (
            <>
              <Text style={s.roadmapPeriod}>Days 61–90</Text>
              {data.roadmap90Day.map((item, idx) => <Bullet key={idx}>{String(item ?? '')}</Bullet>)}
            </>
          )}
        </View>

        {/* CTA */}
        <View style={shared.ctaBox}>
          <Text style={shared.ctaTitle}>Ready to Implement?</Text>
          <Text style={shared.ctaBody}>
            Get the complete step-by-step Implementation Guide + SOP Book{"\n"}
            with build sequences, Apps Script automations, Owner SOPs, and launch checklists{"\n"}
            customized for {biz.businessName}.
          </Text>
          <Text style={shared.ctaPrice}>Implementation Guide + SOP Book — $79</Text>
        </View>

        <PageFooter businessName={biz.businessName} page={8} />
      </Page>

    </Document>
  );
}
