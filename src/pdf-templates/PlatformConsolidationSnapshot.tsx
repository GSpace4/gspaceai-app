// ============================================================
// GSpaceAi — Platform Consolidation Snapshot PDF Template
// Free report. Uses @react-pdf/renderer server-side only.
// ============================================================

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { shared, C, priorityColor, actionColor } from "./shared/pdfStyles";
import type { FreeReportData } from "@/src/lib/reportGeneration";

// Page-specific styles
const s = StyleSheet.create({
  // Cover page
  coverPage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 60,
  },
  coverBrand: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 8,
  },
  coverBrandAi: {
    color: C.blue,
  },
  coverTagline: {
    fontSize: 9,
    color: C.gray,
    marginBottom: 40,
  },
  coverDivider: {
    width: 60,
    height: 3,
    backgroundColor: C.blue,
    marginBottom: 32,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    textAlign: "center",
    marginBottom: 12,
  },
  coverBusinessName: {
    fontSize: 14,
    color: C.blue,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  coverPrepared: {
    fontSize: 8,
    color: C.gray,
    textAlign: "center",
    marginBottom: 4,
  },
  coverDate: {
    fontSize: 8,
    color: C.gray,
    textAlign: "center",
  },
  coverFooter: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  coverFooterText: {
    fontSize: 7.5,
    color: C.gray,
  },
  // Score page row layout
  scoreSplit: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  scoreLeft: {
    flex: 1,
  },
  scoreRight: {
    flex: 1,
  },
  // No-data placeholder
  noData: {
    fontSize: 8,
    color: C.gray,
    fontStyle: "italic",
    paddingVertical: 8,
  },
  // Opportunity row
  oppRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: "flex-start",
  },
  oppRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.light,
    alignItems: "flex-start",
  },
  oppTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    flex: 2,
  },
  oppDetail: {
    fontSize: 7.5,
    color: C.gray,
    flex: 2,
  },
  oppBadgeCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  confidentialNote: {
    fontSize: 7,
    color: C.gray,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
});

// ---- Helpers ----

function PageHeader({ title }: { title?: string }) {
  return (
    <View style={shared.pageHeader}>
      <Text style={shared.brandText}>
        GSpace<Text style={{ color: C.blue }}>Ai</Text>
      </Text>
      <View style={shared.headerRight}>
        <Text style={shared.reportTitleText}>{title ?? "Platform Consolidation Snapshot"}</Text>
        <Text style={shared.headerMeta}>A GSpace Solutions Product</Text>
      </View>
    </View>
  );
}

function PageFooter({ businessName, page }: { businessName: string; page: number }) {
  return (
    <View style={shared.pageFooter} fixed>
      <Text style={shared.footerText}>
        {businessName} · Platform Consolidation Snapshot
      </Text>
      <Text style={shared.footerText}>
        GSpaceAi · Page {page}
      </Text>
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
      <Text style={shared.bulletText}>{children}</Text>
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

// ---- Main Document ----

export function PlatformConsolidationSnapshotPDF({ data }: { data: FreeReportData }) {
  const biz = data.businessSnapshot;
  const score = data.scoreBreakdown;
  const savings = data.savings;
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <Document
      title="Platform Consolidation Snapshot"
      author="GSpaceAi — A GSpace Solutions Product"
    >

      {/* ---- COVER PAGE ---- */}
      <Page size="LETTER" style={[shared.page, { justifyContent: "center" }]}>
        <View style={s.coverPage}>
          <Text style={s.coverBrand}>
            GSpace<Text style={s.coverBrandAi}>Ai</Text>
          </Text>
          <Text style={s.coverTagline}>A GSpace Solutions Product</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverTitle}>Platform Consolidation{"\n"}Snapshot</Text>
          <Text style={s.coverBusinessName}>{biz.businessName}</Text>
          <Text style={s.coverPrepared}>Prepared For: {data.user.name || biz.businessName}</Text>
          <Text style={s.coverPrepared}>Generated By: GSpaceAi · A GSpace Solutions Product</Text>
          <Text style={s.coverDate}>Date: {date}</Text>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>Confidential — Prepared exclusively for {biz.businessName}</Text>
        </View>
      </Page>

      {/* ---- PAGE 2: EXECUTIVE SNAPSHOT + INVENTORY ---- */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Business Profile */}
        <View style={shared.section}>
          <SectionTitle>Business Snapshot</SectionTitle>
          <View style={shared.metricsRow}>
            <View style={shared.metricCard}>
              <Text style={shared.metricValue}>{biz.toolCount}</Text>
              <Text style={shared.metricLabel}>Tools Analyzed</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={[shared.metricValue, { color: C.blue }]}>{score.total}</Text>
              <Text style={shared.metricLabel}>Consolidation Score</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={shared.metricValueGreen}>
                ${savings.estimatedReplaceableMonthlySpend}/mo
              </Text>
              <Text style={shared.metricLabel}>Potential{"\n"}Replaceable Spend</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={shared.metricValueGreen}>
                ${savings.estimatedAnnualSavings.toLocaleString()}/yr
              </Text>
              <Text style={shared.metricLabel}>Est. Annual{"\n"}Savings</Text>
            </View>
          </View>
          <View style={shared.metricsRow}>
            <View style={[shared.metricCard, { flex: 2 }]}>
              <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: C.dark }}>{biz.businessType || "—"}</Text>
              <Text style={shared.metricLabel}>Business Type</Text>
            </View>
            <View style={[shared.metricCard, { flex: 2 }]}>
              <Text style={{ fontSize: 8, color: C.dark, textAlign: "center" }}>{biz.googleWorkspaceUsage || "Not specified"}</Text>
              <Text style={shared.metricLabel}>Current GW Usage</Text>
            </View>
          </View>
        </View>

        {/* Software Inventory */}
        <View style={shared.section}>
          <SectionTitle>Current Software Inventory</SectionTitle>
          {data.softwareInventory.length === 0 ? (
            <Text style={s.noData}>No software inventory captured.</Text>
          ) : (
            <View style={shared.table}>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Platform</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Category</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Est. Cost/Mo</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Action</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Priority</Text>
              </View>
              {data.softwareInventory.map((item, idx) => (
                <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                  <Text style={[shared.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>
                    {item.name}
                  </Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: C.gray }]}>
                    {item.category || "—"}
                  </Text>
                  <Text style={[shared.tableCell, { flex: 1 }]}>
                    {item.estimatedMonthlyCost ? `$${item.estimatedMonthlyCost}` : "Est."}
                  </Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: actionColor(item.recommendedAction ?? "") }]}>
                    {item.recommendedAction || "Investigate"}
                  </Text>
                  <Text style={[shared.tableCell, { flex: 1, color: priorityColor(item.replacementPotential ?? "") }]}>
                    {item.replacementPotential || "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {savings.isEstimated && (
            <Text style={s.confidentialNote}>
              * Some costs are estimated. Actual savings may vary based on exact plan pricing.
            </Text>
          )}
        </View>

        <PageFooter businessName={biz.businessName} page={2} />
      </Page>

      {/* ---- PAGE 3: SCORE + OPPORTUNITIES ---- */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Score Section */}
        <View style={shared.section}>
          <SectionTitle>GSpace Consolidation Score™</SectionTitle>
          <View style={s.scoreSplit}>
            <View style={[s.scoreLeft, shared.scoreBox]}>
              <Text>
                <Text style={shared.scoreNumber}>{score.total}</Text>
                <Text style={shared.scoreOutOf}> / 100</Text>
              </Text>
              <Text style={shared.scoreLabel}>{score.label}</Text>
              <Text style={shared.scoreNote}>
                Based on software stack, overlap, and workflows identified during assessment.
              </Text>
            </View>
            <View style={s.scoreRight}>
              <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
                Score Factors
              </Text>
              {[
                { label: "Software Count", pts: score.softwareCountPoints, max: 20 },
                { label: "Monthly Spend", pts: score.spendPoints, max: 20 },
                { label: "Replacement Potential", pts: score.replacementPotentialPoints, max: 25 },
                { label: "GW Underutilization", pts: score.gwUnderutilizationPoints, max: 15 },
                { label: "Manual Work", pts: score.manualWorkPoints, max: 10 },
                { label: "Process Fragmentation", pts: score.fragmentationPoints, max: 10 },
              ].map((f) => (
                <View key={f.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 7.5, color: C.dark }}>{f.label}</Text>
                  <Text style={{ fontSize: 7.5, color: C.blue, fontFamily: "Helvetica-Bold" }}>
                    {f.pts}/{f.max}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Consolidation Opportunities */}
        <View style={shared.section}>
          <SectionTitle>Potential Consolidation Opportunities</SectionTitle>
          {data.consolidationOpportunities.length === 0 ? (
            <Text style={s.noData}>No specific consolidation opportunities recorded.</Text>
          ) : (
            <>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Current Tool</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2.5 }]}>Google Workspace Replacement</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Priority</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1 }]}>Complexity</Text>
              </View>
              {data.consolidationOpportunities.map((op, idx) => (
                <View key={idx} style={idx % 2 === 0 ? s.oppRow : s.oppRowAlt}>
                  <Text style={[s.oppTitle, { flex: 2 }]}>{op.currentTool}</Text>
                  <Text style={[s.oppDetail, { flex: 2.5 }]}>{op.replacement}</Text>
                  <View style={[s.oppBadgeCol, { flex: 1, alignItems: "flex-start" }]}>
                    <Badge label={op.priority} color={priorityColor(op.priority)} />
                  </View>
                  <Text style={[s.oppDetail, { flex: 1 }]}>{op.complexity}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Automation Opportunities */}
        {data.automationOpportunities.length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Potential Automation Opportunities</SectionTitle>
            {data.automationOpportunities.slice(0, 4).map((op, idx) => (
              <Bullet key={idx}>{`${op.title}: ${op.description} (${op.toolSuggested})`}</Bullet>
            ))}
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={3} />
      </Page>

      {/* ---- PAGE 4: SAVINGS + FINDINGS + CTA ---- */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Estimated Savings */}
        <View style={shared.section}>
          <SectionTitle>Estimated Savings Range</SectionTitle>
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
              <Text style={[shared.calloutValue, { fontSize: 12 }]}>
                ${savings.estimatedAnnualSavings.toLocaleString()}/year
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16, marginTop: 6 }}>
              <Text style={[shared.calloutKey, { color: C.blue }]}>
                {savings.potentialReplacementCount} Tools to Replace
              </Text>
              <Text style={[shared.calloutKey, { color: C.blue }]}>
                {savings.potentialConsolidationCount} to Consolidate
              </Text>
              <Text style={[shared.calloutKey, { color: C.blue }]}>
                {savings.potentialAutomationCount} Automations
              </Text>
            </View>
          </View>
          {savings.isEstimated && (
            <Text style={s.confidentialNote}>
              Based on the tools and usage described. Actual savings may vary.
            </Text>
          )}
        </View>

        {/* Key Findings */}
        <View style={shared.section}>
          <SectionTitle>High-Level Findings</SectionTitle>
          {data.keyFindings.length === 0 ? (
            <Text style={s.noData}>Complete the audit to generate key findings.</Text>
          ) : (
            data.keyFindings.map((finding, idx) => (
              <Bullet key={idx}>{finding}</Bullet>
            ))
          )}
        </View>

        {/* GW Usage Summary */}
        {data.googleWorkspaceSummary.underutilizationNotes.length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Google Workspace Expansion Opportunities</SectionTitle>
            {data.googleWorkspaceSummary.underutilizationNotes.map((note, idx) => (
              <Bullet key={idx}>{note}</Bullet>
            ))}
          </View>
        )}

        {/* CTA */}
        <View style={shared.ctaBox}>
          <Text style={shared.ctaTitle}>Unlock Your Full Replacement Roadmap</Text>
          <Text style={shared.ctaBody}>
            Your Platform Consolidation Snapshot shows where opportunity exists.{"\n"}
            The Recommendations Report gives you the complete strategic roadmap —{"\n"}
            exactly which tools to keep, replace, consolidate, or automate.
          </Text>
          <Text style={shared.ctaPrice}>Recommendations Report — $29</Text>
        </View>

        <PageFooter businessName={biz.businessName} page={4} />
      </Page>

    </Document>
  );
}
