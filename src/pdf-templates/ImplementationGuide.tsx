// ============================================================
// GSpaceAi — Implementation Guide + SOP Book PDF ($79)
// ============================================================

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { shared, C, priorityColor } from "./shared/pdfStyles";
import type {
  ImplementationGuideData,
  FutureStateArchitecture,
  SystemBuildGuide,
  AppsScriptOpportunity,
  GeminiOpportunity,
  MaintenanceSOPs,
  PrimaryFinding,
  TimeRecoveryItem,
  EnhancementOpportunity,
} from "@/src/lib/reportGeneration";

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
  execSummary: { fontSize: 9, color: C.dark, lineHeight: 1.5, backgroundColor: C.blueBg, borderRadius: 4, padding: 10, marginBottom: 4 },
  // Sequence steps
  sequenceStep: { flexDirection: "row", marginBottom: 5, alignItems: "flex-start" },
  sequenceNum: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white, backgroundColor: C.blue, borderRadius: 2, width: 16, textAlign: "center", paddingVertical: 1, marginRight: 6, flexShrink: 0 },
  sequenceText: { fontSize: 8, color: C.dark, flex: 1, lineHeight: 1.4 },
  // Future state architecture
  stateBox: { flex: 1, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: C.border },
  stateLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  stateBody: { fontSize: 8, color: C.dark, lineHeight: 1.5 },
  // System build guides
  sysCard: { marginBottom: 12, padding: 10, borderRadius: 4, backgroundColor: C.light, borderWidth: 1, borderColor: C.border },
  sysHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  sysName: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.dark },
  sysPurpose: { fontSize: 8, color: C.gray, marginBottom: 4, fontStyle: "italic" },
  sysTools: { fontSize: 7.5, color: C.blue, marginBottom: 5 },
  sysStep: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
  sysStepNum: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blue, width: 14, flexShrink: 0 },
  sysStepText: { fontSize: 8, color: C.dark, flex: 1, lineHeight: 1.4 },
  sysOutcome: { fontSize: 7.5, color: C.green, marginTop: 4 },
  // SOP
  sopCard: { marginBottom: 12 },
  sopHeader: { backgroundColor: C.blueBg, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 4 },
  sopTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark },
  sopPurpose: { fontSize: 7.5, color: C.gray, fontStyle: "italic", marginTop: 1 },
  sopStep: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
  sopStepNum: { fontSize: 8, color: C.blue, width: 16, flexShrink: 0 },
  sopStepText: { fontSize: 8, color: C.dark, flex: 1, lineHeight: 1.4 },
  // Maintenance SOPs
  maintenancePeriod: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.blue, marginTop: 8, marginBottom: 4 },
  maintenanceItem: { flexDirection: "row", marginBottom: 3, alignItems: "flex-start" },
  maintenanceBullet: { fontSize: 8, color: C.blue, width: 14, flexShrink: 0 },
  maintenanceText: { fontSize: 8, color: C.dark, flex: 1, lineHeight: 1.4 },
  // Checklists
  checkItem: { flexDirection: "row", marginBottom: 4, alignItems: "flex-start" },
  checkBox: { width: 10, height: 10, borderWidth: 1, borderColor: C.dark, borderRadius: 2, marginRight: 6, marginTop: 1, flexShrink: 0 },
  checkText: { fontSize: 8, color: C.dark, flex: 1, lineHeight: 1.4 },
  // Phase card (legacy)
  phaseCard: { marginBottom: 10, padding: 10, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.light },
  phaseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  phaseLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, textTransform: "uppercase", letterSpacing: 0.5 },
  phaseTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 3 },
  phaseDesc: { fontSize: 8, color: C.dark, lineHeight: 1.4, marginBottom: 4 },
  phaseGW: { fontSize: 7.5, color: C.blue, marginBottom: 3 },
  phaseMeta: { flexDirection: "row", gap: 12, marginTop: 2 },
  phaseMetaText: { fontSize: 7, color: C.gray },
  // Blueprint card (legacy)
  blueprintCard: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  blueprintTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 2 },
  blueprintProblem: { fontSize: 8, color: C.gray, marginBottom: 2 },
  blueprintSolution: { fontSize: 8, color: C.dark, lineHeight: 1.4, marginBottom: 3 },
  blueprintMeta: { flexDirection: "row", gap: 8 },
  blueprintMetaText: { fontSize: 7.5, color: C.green },
  // Badge
  badge: { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start" },
  badgeText: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.white },
  // Primary finding
  primaryFindingBox: { backgroundColor: C.dark, borderRadius: 5, padding: 12, marginBottom: 12 },
  primaryFindingLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  primaryFindingHeadline: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.white, marginBottom: 6, lineHeight: 1.3 },
  primaryFindingDetail: { fontSize: 8, color: "#cccccc", lineHeight: 1.5 },
  // Enhancement cards
  enhCard: { marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  enhTitle: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.dark, marginBottom: 1 },
  enhRow: { flexDirection: "row", marginBottom: 1 },
  enhLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.blue, width: 80 },
  enhValue: { fontSize: 7.5, color: C.dark, flex: 1, lineHeight: 1.4 },
});

function difficultyColor(d: string): string {
  if (d === "Easy") return C.green;
  if (d === "Medium") return C.yellow;
  if (d === "Advanced") return C.red;
  return C.gray;
}

function PageHeader() {
  return (
    <View style={shared.pageHeader}>
      <Text style={shared.brandText}>GSpace<Text style={{ color: C.blue }}>Ai</Text></Text>
      <View style={shared.headerRight}>
        <Text style={shared.reportTitleText}>Implementation Guide + SOP Book</Text>
        <Text style={shared.headerMeta}>A GSpace Solutions Product</Text>
      </View>
    </View>
  );
}

function PageFooter({ businessName, page }: { businessName: string; page: number }) {
  return (
    <View style={shared.pageFooter} fixed>
      <Text style={shared.footerText}>{businessName} · Implementation Guide + SOP Book</Text>
      <Text style={shared.footerText}>GSpaceAi · Page {page}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={shared.sectionTitle}>{children}</Text>;
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[s.badge, { backgroundColor: color }]}>
      <Text style={s.badgeText}>{label.toUpperCase()}</Text>
    </View>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <View style={s.checkItem}>
      <View style={s.checkBox} />
      <Text style={s.checkText}>{text}</Text>
    </View>
  );
}

export function ImplementationGuidePDF({ data }: { data: ImplementationGuideData }) {
  const biz = data.businessSnapshot;
  const score = data.scoreBreakdown;
  const savings = data.savings;
  const date = new Date(data.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // New field presence checks
  const hasFutureState    = !!(data.futureStateArchitecture?.currentState || data.futureStateArchitecture?.futureState);
  const hasImplSeq        = (data.implementationSequence ?? []).length > 0;
  const hasSysBuildGuides = (data.systemBuildGuides ?? []).length > 0;
  const hasAppsScript     = (data.appsScriptOpportunities ?? []).length > 0;
  const hasGemini         = (data.geminiOpportunities ?? []).length > 0;
  const hasOwnerSOPs      = (data.ownerSOPs ?? []).length > 0;
  const hasEmployeeSOPs   = (data.employeeSOPs ?? []).length > 0;
  const hasMaintSOPs      = !!(data.maintenanceSOPs?.monthly?.length || data.maintenanceSOPs?.quarterly?.length || data.maintenanceSOPs?.annual?.length);
  const hasTestChecklist  = (data.testingChecklist ?? []).length > 0;
  const hasLaunchChecklist = (data.launchChecklist ?? []).length > 0;

  // Legacy fallbacks
  const hasLegacyPhases   = (data.implementationPhases ?? []).length > 0;
  const hasLegacyBlueprints = (data.automationBlueprints ?? []).length > 0;
  const hasLegacySOPs     = (data.sopDocuments ?? []).length > 0;
  const hasLegacySeq      = (data.buildSequence ?? []).length > 0;

  let pageNum = 1;

  return (
    <Document title="Implementation Guide + SOP Book" author="GSpaceAi — A GSpace Solutions Product">

      {/* ── PAGE 1: COVER ── */}
      <Page size="LETTER" style={[shared.page, { justifyContent: "center" }]}>
        <View style={s.coverPage}>
          <Text style={s.coverBrand}>GSpace<Text style={{ color: C.blue }}>Ai</Text></Text>
          <Text style={{ fontSize: 9, color: C.gray }}>A GSpace Solutions Product</Text>
          <View style={s.coverDivider} />
          <Text style={s.coverTitle}>Implementation Guide{"\n"}+ SOP Book</Text>
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

      {/* ── PAGE 2: IMPLEMENTATION OVERVIEW + FUTURE STATE ── */}
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

        {/* Metrics */}
        <View style={shared.section}>
          <SectionTitle>Implementation Overview</SectionTitle>
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
              <Text style={[shared.metricValue, { color: C.green }]}>{data.estimatedCompletionWeeks}w</Text>
              <Text style={shared.metricLabel}>Est. Build{"\n"}Timeline</Text>
            </View>
            <View style={shared.metricCard}>
              <Text style={shared.metricValueGreen}>${savings.estimatedAnnualSavings.toLocaleString()}/yr</Text>
              <Text style={shared.metricLabel}>Est. Annual{"\n"}Savings</Text>
            </View>
          </View>

          {data.executiveSummary ? (
            <Text style={s.execSummary}>{data.executiveSummary}</Text>
          ) : null}
        </View>

        {/* Google Workspace Apps */}
        {data.googleWorkspaceApps.length > 0 && (
          <View style={shared.section}>
            <SectionTitle>Google Workspace Tools You Will Use</SectionTitle>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {data.googleWorkspaceApps.map((app, idx) => (
                <View key={idx} style={{ backgroundColor: C.blueBg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 8, color: C.blue, fontFamily: "Helvetica-Bold" }}>{app}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Future State Architecture */}
        {hasFutureState && (
          <View style={shared.section}>
            <SectionTitle>Before → After: Your Tech Stack Transformation</SectionTitle>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[s.stateBox, { borderColor: C.red, backgroundColor: "#fff5f5" }]}>
                <Text style={[s.stateLabel, { color: C.red }]}>Current State — Before</Text>
                <Text style={s.stateBody}>{(data.futureStateArchitecture as FutureStateArchitecture).currentState}</Text>
              </View>
              <View style={{ width: 20, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14, color: C.blue, fontFamily: "Helvetica-Bold" }}>→</Text>
              </View>
              <View style={[s.stateBox, { borderColor: C.green, backgroundColor: C.greenBg }]}>
                <Text style={[s.stateLabel, { color: C.green }]}>Future State — After</Text>
                <Text style={s.stateBody}>{(data.futureStateArchitecture as FutureStateArchitecture).futureState}</Text>
              </View>
            </View>
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={2} />
      </Page>

      {/* ── PAGE 3: MASTER BUILD SEQUENCE ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        <View style={shared.section}>
          <SectionTitle>Master Build Sequence</SectionTitle>
          <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
            Follow these steps in order. Quick wins are front-loaded — you will see results within the first two weeks.
          </Text>

          {hasImplSeq ? (
            data.implementationSequence.map((step, idx) => (
              <View key={idx} style={s.sequenceStep}>
                <Text style={s.sequenceNum}>{idx + 1}</Text>
                <Text style={s.sequenceText}>{step}</Text>
              </View>
            ))
          ) : hasLegacySeq ? (
            data.buildSequence.map((step, idx) => {
              const colonIdx = step.indexOf(":");
              const label = colonIdx > -1 ? step.slice(0, colonIdx + 1) : `${idx + 1}.`;
              const text  = colonIdx > -1 ? step.slice(colonIdx + 1).trim() : step;
              return (
                <View key={idx} style={s.sequenceStep}>
                  <Text style={[s.sequenceNum, { backgroundColor: "transparent", color: C.blue, fontFamily: "Helvetica-Bold" }]}>{label}</Text>
                  <Text style={s.sequenceText}>{text}</Text>
                </View>
              );
            })
          ) : (
            <Text style={s.noData}>Build sequence not available.</Text>
          )}
        </View>

        {/* Legacy implementation phases fallback */}
        {!hasSysBuildGuides && hasLegacyPhases && (
          <View style={shared.section}>
            <SectionTitle>Implementation Phases</SectionTitle>
            {data.implementationPhases.map((phase, idx) => (
              <View key={idx} style={s.phaseCard}>
                <View style={s.phaseHeader}>
                  <Text style={s.phaseLabel}>{phase.phase}</Text>
                  <Badge label={phase.difficulty} color={difficultyColor(phase.difficulty)} />
                </View>
                <Text style={s.phaseTitle}>{phase.title}</Text>
                <Text style={s.phaseDesc}>{phase.description}</Text>
                {phase.googleWorkspaceSetup ? (
                  <Text style={s.phaseGW}>
                    <Text style={{ fontFamily: "Helvetica-Bold" }}>GW Setup: </Text>
                    {phase.googleWorkspaceSetup}
                  </Text>
                ) : null}
                <View style={s.phaseMeta}>
                  {phase.toolsAffected.length > 0 && (
                    <Text style={s.phaseMetaText}>Tools: {phase.toolsAffected.join(", ")}</Text>
                  )}
                  {phase.timeEstimate ? (
                    <Text style={s.phaseMetaText}>· Est. time: {phase.timeEstimate}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={3} />
      </Page>

      {/* ── PAGE 4: SYSTEM BUILD GUIDES ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        <View style={shared.section}>
          <SectionTitle>System Build Guides</SectionTitle>
          <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
            Step-by-step instructions for building each Google Workspace system. Each system replaces a paid tool or fills an operational gap.
          </Text>

          {hasSysBuildGuides ? (
            (data.systemBuildGuides as SystemBuildGuide[]).map((sys, idx) => (
              <View key={idx} style={s.sysCard}>
                <View style={s.sysHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sysName}>{sys.systemName}</Text>
                    {sys.problemSolved ? (
                      <Text style={[s.sysPurpose, { color: C.red, marginBottom: 2 }]}>{sys.problemSolved}</Text>
                    ) : null}
                    <Text style={s.sysPurpose}>{sys.purpose}</Text>
                  </View>
                </View>
                {sys.currentState ? (
                  <Text style={{ fontSize: 7.5, color: C.gray, marginBottom: 4, fontStyle: "italic" }}>
                    Before: {sys.currentState}
                  </Text>
                ) : null}
                <Text style={s.sysTools}>Tools: {(sys.toolsNeeded ?? []).join(" · ")}</Text>
                {(sys.setupSteps ?? []).map((step, sIdx) => (
                  <View key={sIdx} style={s.sysStep}>
                    <Text style={s.sysStepNum}>{sIdx + 1}.</Text>
                    <Text style={s.sysStepText}>{String(step ?? '')}</Text>
                  </View>
                ))}
                {sys.expectedOutcome ? (
                  <Text style={s.sysOutcome}>✓ {sys.expectedOutcome}</Text>
                ) : null}
                {(sys.ownerBenefit || sys.teamBenefit) ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 5 }}>
                    {sys.ownerBenefit ? (
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 1 }}>OWNER</Text>
                        <Text style={{ fontSize: 7.5, color: C.dark, lineHeight: 1.4 }}>{sys.ownerBenefit}</Text>
                      </View>
                    ) : null}
                    {sys.teamBenefit ? (
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: C.blue, marginBottom: 1 }}>TEAM</Text>
                        <Text style={{ fontSize: 7.5, color: C.dark, lineHeight: 1.4 }}>{sys.teamBenefit}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={s.noData}>System build guides not available.</Text>
          )}
        </View>

        <PageFooter businessName={biz.businessName} page={4} />
      </Page>

      {/* ── PAGE 5: APPS SCRIPT + GEMINI AUTOMATIONS ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Apps Script Opportunities */}
        <View style={shared.section}>
          <SectionTitle>Apps Script Automation Opportunities</SectionTitle>
          <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
            These automations can be built with Google Apps Script — free, no third-party tools required.
          </Text>

          {hasAppsScript ? (
            <View style={shared.table}>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Automation</Text>
                <Text style={[shared.tableHeaderCell, { flex: 1.5 }]}>Trigger</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Outcome</Text>
              </View>
              {(data.appsScriptOpportunities as AppsScriptOpportunity[]).map((item, idx) => (
                <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                  <Text style={[shared.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{item.automation}</Text>
                  <Text style={[shared.tableCell, { flex: 1.5, color: C.gray }]}>{item.trigger}</Text>
                  <Text style={[shared.tableCell, { flex: 2, color: C.green }]}>{item.outcome}</Text>
                </View>
              ))}
            </View>
          ) : hasLegacyBlueprints ? (
            data.automationBlueprints.map((bp, idx) => (
              <View key={idx} style={s.blueprintCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={s.blueprintTitle}>{bp.title}</Text>
                  <Badge label={bp.complexity} color={priorityColor(bp.complexity)} />
                </View>
                <Text style={s.blueprintProblem}>Problem: {bp.problem}</Text>
                <Text style={s.blueprintSolution}>{bp.solution}</Text>
                <View style={s.blueprintMeta}>
                  <Text style={[s.blueprintMetaText, { color: C.blue }]}>Tool: {bp.googleTool}</Text>
                  {bp.estimatedTimeSaved ? (
                    <Text style={s.blueprintMetaText}> · Saves: {bp.estimatedTimeSaved}</Text>
                  ) : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={s.noData}>No automation opportunities identified.</Text>
          )}
        </View>

        {/* Gemini Opportunities */}
        {hasGemini && (
          <View style={shared.section}>
            <SectionTitle>Gemini AI Opportunities</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              Specific ways to use Gemini within Google Workspace to speed up repeatable tasks.
            </Text>
            <View style={shared.table}>
              <View style={shared.tableHeaderRow}>
                <Text style={[shared.tableHeaderCell, { flex: 2 }]}>Use Case</Text>
                <Text style={[shared.tableHeaderCell, { flex: 2.5 }]}>Benefit</Text>
              </View>
              {(data.geminiOpportunities as GeminiOpportunity[]).map((item, idx) => (
                <View key={idx} style={idx % 2 === 0 ? shared.tableRow : shared.tableRowAlt}>
                  <Text style={[shared.tableCell, { flex: 2, fontFamily: "Helvetica-Bold" }]}>{item.useCase}</Text>
                  <Text style={[shared.tableCell, { flex: 2.5, color: C.gray }]}>{item.benefit}</Text>
                </View>
              ))}
            </View>
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
                  <Text style={[shared.tableHeaderCell, { flex: 2.5 }]}>Task Eliminated</Text>
                  <Text style={[shared.tableHeaderCell, { flex: 1.2 }]}>Current Cost</Text>
                  <Text style={[shared.tableHeaderCell, { flex: 1.2 }]}>Recoverable</Text>
                  <Text style={[shared.tableHeaderCell, { flex: 2 }]}>System / Automation</Text>
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
              Tools you are keeping that can do significantly more with minor setup changes.
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

        {/* Savings callout */}
        <View style={shared.calloutBox}>
          <Text style={shared.calloutTitle}>
            {savings.isEstimated ? "Estimated Potential Savings" : "Potential Savings"}
          </Text>
          <View style={shared.calloutRow}>
            <Text style={shared.calloutKey}>Current Est. Monthly Spend</Text>
            <Text style={shared.calloutValue}>${savings.estimatedMonthlySoftwareSpend}/mo</Text>
          </View>
          <View style={shared.calloutRow}>
            <Text style={shared.calloutKey}>Potentially Replaceable</Text>
            <Text style={shared.calloutValue}>${savings.estimatedReplaceableMonthlySpend}/mo</Text>
          </View>
          <View style={shared.calloutRow}>
            <Text style={shared.calloutKey}>Estimated Annual Savings</Text>
            <Text style={[shared.calloutValue, { fontSize: 12 }]}>${savings.estimatedAnnualSavings.toLocaleString()}/year</Text>
          </View>
        </View>

        <PageFooter businessName={biz.businessName} page={5} />
      </Page>

      {/* ── PAGE 6: OWNER SOPs + EMPLOYEE SOPs ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Owner SOPs */}
        {(hasOwnerSOPs || (!hasOwnerSOPs && hasLegacySOPs)) && (
          <View style={shared.section}>
            <SectionTitle>Owner / Admin Standard Operating Procedures</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              Use these SOPs to run your new Google Workspace systems consistently.
            </Text>
            {hasOwnerSOPs ? (
              data.ownerSOPs.map((sop, idx) => (
                <View key={idx} style={s.sopCard}>
                  <View style={s.sopHeader}>
                    <Text style={s.sopTitle}>{sop.title}</Text>
                    {sop.purpose ? <Text style={s.sopPurpose}>{sop.purpose}</Text> : null}
                  </View>
                  {(sop.steps ?? []).map((step: unknown, sIdx) => (
                    <View key={sIdx} style={s.sopStep}>
                      <Text style={s.sopStepNum}>{sIdx + 1}.</Text>
                      <Text style={s.sopStepText}>{String(step ?? '')}</Text>
                    </View>
                  ))}
                </View>
              ))
            ) : (
              data.sopDocuments.map((sop, idx) => (
                <View key={idx} style={s.sopCard}>
                  <View style={s.sopHeader}>
                    <Text style={s.sopTitle}>{sop.title}</Text>
                    {sop.purpose ? <Text style={s.sopPurpose}>{sop.purpose}</Text> : null}
                  </View>
                  {(sop.steps ?? []).map((step: unknown, sIdx) => (
                    <View key={sIdx} style={s.sopStep}>
                      <Text style={s.sopStepNum}>{sIdx + 1}.</Text>
                      <Text style={s.sopStepText}>{String(step ?? '')}</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* Employee SOPs */}
        {hasEmployeeSOPs && (
          <View style={shared.section}>
            <SectionTitle>Team / Employee Standard Operating Procedures</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              Share these SOPs with your team after completing the setup.
            </Text>
            {data.employeeSOPs.map((sop, idx) => (
              <View key={idx} style={s.sopCard}>
                <View style={s.sopHeader}>
                  <Text style={s.sopTitle}>{sop.title}</Text>
                  {sop.purpose ? <Text style={s.sopPurpose}>{sop.purpose}</Text> : null}
                </View>
                {(sop.steps ?? []).map((step: unknown, sIdx) => (
                  <View key={sIdx} style={s.sopStep}>
                    <Text style={s.sopStepNum}>{sIdx + 1}.</Text>
                    <Text style={s.sopStepText}>{String(step ?? '')}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <PageFooter businessName={biz.businessName} page={6} />
      </Page>

      {/* ── PAGE 7: MAINTENANCE SOPs + CHECKLISTS ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        {/* Maintenance SOPs */}
        {hasMaintSOPs && (
          <View style={shared.section}>
            <SectionTitle>Ongoing Maintenance SOPs</SectionTitle>
            {(data.maintenanceSOPs as MaintenanceSOPs).monthly?.length > 0 && (
              <>
                <Text style={s.maintenancePeriod}>Monthly</Text>
                {(data.maintenanceSOPs as MaintenanceSOPs).monthly.map((item, idx) => (
                  <View key={idx} style={s.maintenanceItem}>
                    <Text style={s.maintenanceBullet}>›</Text>
                    <Text style={s.maintenanceText}>{item}</Text>
                  </View>
                ))}
              </>
            )}
            {(data.maintenanceSOPs as MaintenanceSOPs).quarterly?.length > 0 && (
              <>
                <Text style={s.maintenancePeriod}>Quarterly</Text>
                {(data.maintenanceSOPs as MaintenanceSOPs).quarterly.map((item, idx) => (
                  <View key={idx} style={s.maintenanceItem}>
                    <Text style={s.maintenanceBullet}>›</Text>
                    <Text style={s.maintenanceText}>{item}</Text>
                  </View>
                ))}
              </>
            )}
            {(data.maintenanceSOPs as MaintenanceSOPs).annual?.length > 0 && (
              <>
                <Text style={s.maintenancePeriod}>Annual</Text>
                {(data.maintenanceSOPs as MaintenanceSOPs).annual.map((item, idx) => (
                  <View key={idx} style={s.maintenanceItem}>
                    <Text style={s.maintenanceBullet}>›</Text>
                    <Text style={s.maintenanceText}>{item}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Testing Checklist */}
        {hasTestChecklist && (
          <View style={shared.section}>
            <SectionTitle>Pre-Launch Testing Checklist</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              Complete every item before cancelling any existing tools.
            </Text>
            {data.testingChecklist.map((item, idx) => (
              <ChecklistItem key={idx} text={item} />
            ))}
          </View>
        )}

        {/* Launch Checklist */}
        {hasLaunchChecklist && (
          <View style={shared.section}>
            <SectionTitle>Launch Checklist</SectionTitle>
            <Text style={{ fontSize: 8, color: C.gray, marginBottom: 8 }}>
              Your go-live sequence — follow in order.
            </Text>
            {data.launchChecklist.map((item, idx) => (
              <ChecklistItem key={idx} text={item} />
            ))}
          </View>
        )}

        {!hasMaintSOPs && !hasTestChecklist && !hasLaunchChecklist && (
          <Text style={s.noData}>Maintenance and launch materials not available.</Text>
        )}

        <PageFooter businessName={biz.businessName} page={7} />
      </Page>

      {/* ── PAGE 8: NEXT STEPS + CTA ── */}
      <Page size="LETTER" style={shared.page}>
        <PageHeader />

        <View style={shared.section}>
          <SectionTitle>You Are Ready to Build</SectionTitle>
          <Text style={{ fontSize: 9, color: C.dark, lineHeight: 1.5, marginBottom: 8 }}>
            You now have everything you need to execute your Google Workspace consolidation. Follow the Master Build Sequence on page 3, work through the System Build Guides, and use the SOPs to keep your systems running smoothly.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <View style={[shared.metricCard, { flex: 1 }]}>
              <Text style={[shared.metricValue, { color: C.green }]}>{data.estimatedCompletionWeeks}w</Text>
              <Text style={shared.metricLabel}>Estimated timeline{"\n"}at your own pace</Text>
            </View>
            <View style={[shared.metricCard, { flex: 1 }]}>
              <Text style={shared.metricValueGreen}>${savings.estimatedAnnualSavings.toLocaleString()}</Text>
              <Text style={shared.metricLabel}>Estimated annual savings{"\n"}once fully consolidated</Text>
            </View>
            <View style={[shared.metricCard, { flex: 1 }]}>
              <Text style={shared.metricValue}>{biz.toolCount}</Text>
              <Text style={shared.metricLabel}>Tools analyzed{"\n"}in this guide</Text>
            </View>
          </View>
          <Text style={{ fontSize: 8, color: C.gray, lineHeight: 1.5 }}>
            Savings figures are estimates based on your audit data. Actual results will vary based on execution, negotiation, and business-specific factors. GSpaceAi and GSpace Solutions make no guarantee of specific outcomes.
          </Text>
        </View>

        {/* CTA */}
        <View style={shared.ctaBox}>
          <Text style={shared.ctaTitle}>Want Us to Build This With You?</Text>
          <Text style={shared.ctaBody}>
            Skip the learning curve. GSpace Solutions will work directly with you to{"\n"}
            implement your consolidation plan, build your automation workflows,{"\n"}
            and get your team running on the new systems — done in days, not months.
          </Text>
          <Text style={shared.ctaPrice}>Done-With-You Implementation — $159</Text>
        </View>

        <PageFooter businessName={biz.businessName} page={8} />
      </Page>

    </Document>
  );
}
