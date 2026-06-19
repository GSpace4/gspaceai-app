// ============================================================
// GSpaceAi — Shared PDF Styles
// Used by all @react-pdf/renderer report templates.
// ============================================================

import { StyleSheet } from "@react-pdf/renderer";

export const C = {
  blue:    "#4285f3",
  red:     "#ea4335",
  yellow:  "#fabc04",
  green:   "#35a852",
  purple:  "#8430CE",
  dark:    "#1f1f1f",
  gray:    "#5f6368",
  light:   "#f8f9fa",
  border:  "#e8eaed",
  white:   "#ffffff",
  blueBg:  "#e8f0fe",
  greenBg: "#e6f4ea",
} as const;

export const shared = StyleSheet.create({
  // ---- Page ----
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.dark,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: C.white,
  },

  // ---- Header (page top) ----
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.blue,
  },
  brandText: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  brandAi: {
    color: C.blue,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  reportTitleText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
  },
  headerMeta: {
    fontSize: 7,
    color: C.gray,
    marginTop: 2,
  },

  // ---- Section ----
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    borderBottomWidth: 1,
    borderBottomColor: C.blue,
    paddingBottom: 4,
    marginBottom: 8,
  },

  // ---- Table ----
  table: {
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.blue,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.light,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  tableCell: {
    fontSize: 8,
    color: C.dark,
  },

  // ---- Score ----
  scoreBox: {
    backgroundColor: C.blueBg,
    borderRadius: 6,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  scoreNumber: {
    fontSize: 42,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
    lineHeight: 1,
  },
  scoreOutOf: {
    fontSize: 18,
    color: C.gray,
    fontFamily: "Helvetica-Bold",
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginTop: 4,
  },
  scoreNote: {
    fontSize: 7.5,
    color: C.gray,
    marginTop: 3,
    textAlign: "center",
  },

  // ---- Metric card grid ----
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.light,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.blue,
  },
  metricValueGreen: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.green,
  },
  metricLabel: {
    fontSize: 6.5,
    color: C.gray,
    textAlign: "center",
    marginTop: 2,
  },

  // ---- Callout box ----
  calloutBox: {
    backgroundColor: C.greenBg,
    borderRadius: 4,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.green,
    marginBottom: 10,
  },
  calloutTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 4,
  },
  calloutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  calloutKey: {
    fontSize: 8,
    color: C.gray,
  },
  calloutValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.green,
  },

  // ---- CTA box ----
  ctaBox: {
    backgroundColor: C.blue,
    borderRadius: 6,
    padding: 16,
    marginTop: 20,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    marginBottom: 4,
  },
  ctaBody: {
    fontSize: 8.5,
    color: C.white,
    opacity: 0.9,
    textAlign: "center",
    marginBottom: 8,
  },
  ctaPrice: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  // ---- List items ----
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  bulletDot: {
    fontSize: 9,
    color: C.blue,
    marginRight: 5,
    marginTop: 0.5,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    fontSize: 8.5,
    color: C.dark,
    flex: 1,
    lineHeight: 1.4,
  },

  // ---- Badge ----
  badge: {
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  // ---- Footer ----
  pageFooter: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: C.gray,
  },
});

// Priority → color mapping
export function priorityColor(priority: string): string {
  if (priority === "High") return C.red;
  if (priority === "Medium") return C.yellow;
  if (priority === "Low") return C.green;
  return C.gray;
}

// Action → color mapping
export function actionColor(action: string): string {
  if (action === "Replace") return C.green;
  if (action === "Consolidate") return C.blue;
  if (action === "Automate") return C.yellow;
  if (action === "Enhance") return C.purple;
  if (action === "Keep") return C.gray;
  return C.gray;
}
