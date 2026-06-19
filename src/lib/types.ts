// ============================================================
// GSpaceAi — Core TypeScript Types
// All shared types used across the app.
// ============================================================

// ------------------------------------------------------------
// Workflow Stage
// ------------------------------------------------------------

export type WorkflowStage =
  | "intro"
  | "collect_name"
  | "collect_business_basics"
  | "audit_in_progress"
  | "audit_wrap_up"
  | "free_report_generating"
  | "free_report_ready"
  | "recommendations_payment_pending"
  | "recommendations_email_requested"
  | "recommendations_verifying"
  | "recommendations_verified"
  | "recommendations_report_generating"
  | "recommendations_report_ready"
  | "implementation_payment_pending"
  | "implementation_email_requested"
  | "implementation_verifying"
  | "implementation_verified"
  | "implementation_report_generating"
  | "implementation_report_ready"
  | "done_with_you_payment_pending"
  | "done_with_you_email_requested"
  | "done_with_you_verifying"
  | "done_with_you_verified"
  | "complete";

// ------------------------------------------------------------
// User Profile
// ------------------------------------------------------------

export type UserProfile = {
  name: string;
  email?: string;
  businessName: string;
  businessType: string;
  businessSize?: string;
  industry?: string;
  currentGoogleWorkspaceUsage?: string;
};

// ------------------------------------------------------------
// Software Inventory
// ------------------------------------------------------------

export type RecommendedAction = "Keep" | "Replace" | "Consolidate" | "Automate" | "Enhance" | "Investigate";
export type ImportanceLevel = "Low" | "Medium" | "High" | "Critical";
export type ReplacementPotential = "Low" | "Medium" | "High";

export type SoftwareInventoryItem = {
  name: string;
  category: string;
  estimatedMonthlyCost?: number;
  usedFor?: string;
  importance?: ImportanceLevel;
  replacementPotential?: ReplacementPotential;
  recommendedAction?: RecommendedAction;
  googleWorkspaceAlternative?: string;
  notes?: string;
};

// ------------------------------------------------------------
// Audit State
// ------------------------------------------------------------

export type AuditAnswer = {
  question: string;
  answer: string;
  timestamp: string;
};

export type WorkflowItem = {
  name: string;
  description: string;
  toolsInvolved: string[];
  manualSteps?: string[];
};

export type ConsolidationOpportunity = {
  title: string;
  currentTool: string;
  googleWorkspaceReplacement: string;
  estimatedMonthlySavings?: number;
  complexity: "Low" | "Medium" | "High";
  priority: "High" | "Medium" | "Low";
};

export type AutomationOpportunity = {
  title: string;
  description: string;
  toolSuggested: string;
  estimatedTimeSavedPerWeek?: string;
  complexity: "Low" | "Medium" | "High";
};

export type AuditState = {
  answers: AuditAnswer[];
  softwareInventory: SoftwareInventoryItem[];
  workflowInventory: WorkflowItem[];
  bottlenecks: string[];
  manualTasks: string[];
  googleWorkspaceOpportunities: string[];
  automationOpportunities: AutomationOpportunity[];
  consolidationOpportunities: ConsolidationOpportunity[];
  risks: string[];
  recommendations: string[];
  gspaceConsolidationScore: number;
  scoreLabel: ConsolidationScoreLabel;
  estimatedMonthlySoftwareSpend: number;
  estimatedReplaceableMonthlySpend: number;
  estimatedAnnualSavings: number;
  auditComplete: boolean;
};

export type ConsolidationScoreLabel =
  | "Minimal Opportunity"
  | "Moderate Opportunity"
  | "Strong Opportunity"
  | "High Opportunity"
  | "";

// ------------------------------------------------------------
// Chat Messages
// ------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
};

// ------------------------------------------------------------
// Gemini Dual Response
// ------------------------------------------------------------

export type GeminiExtractedData = {
  userProfile?: Partial<UserProfile>;
  softwareInventory?: SoftwareInventoryItem[];
  workflowInventory?: WorkflowItem[];
  manualTasks?: string[];
  automationOpportunities?: AutomationOpportunity[];
  consolidationOpportunities?: ConsolidationOpportunity[];
  googleWorkspaceOpportunities?: string[];
  bottlenecks?: string[];
  risks?: string[];
  auditComplete?: boolean;
  confirmedReady?: boolean;
};

export type GeminiDualResponse = {
  customerResponse: string;
  extractedData: GeminiExtractedData;
};

// ------------------------------------------------------------
// Payment Records
// ------------------------------------------------------------

export type PaymentStatus = "pending" | "verified" | "failed";

export type PaymentRecord = {
  status: PaymentStatus;
  email: string;
  verifiedAt: string;
};

export type PaymentsState = {
  recommendations_report: PaymentRecord;
  implementation_guide_sop: PaymentRecord;
  done_with_you: PaymentRecord;
};

// ------------------------------------------------------------
// Deliverables
// ------------------------------------------------------------

export type FreeDeliverableStatus = "not_started" | "generating" | "generated" | "displayed";
export type PaidDeliverableStatus = "locked" | "generating" | "generated" | "displayed";

export type ReportContent = {
  sections: Record<string, unknown>;
  generatedAt: string;
};

export type FreeDeliverable = {
  status: FreeDeliverableStatus;
  content?: ReportContent;
};

export type PaidDeliverable = {
  status: PaidDeliverableStatus;
  content?: ReportContent;
};

export type DeliverablesState = {
  platform_consolidation_snapshot: FreeDeliverable;
  recommendations_report: PaidDeliverable;
  implementation_guide_sop: PaidDeliverable;
};

// ------------------------------------------------------------
// Full App State
// ------------------------------------------------------------

export type AppState = {
  sessionId: string;
  stage: WorkflowStage;
  user: UserProfile;
  audit: AuditState;
  messages: ChatMessage[];
  payments: PaymentsState;
  deliverables: DeliverablesState;
};

// ------------------------------------------------------------
// Payment Verification API
// ------------------------------------------------------------

export type VerifyPaymentRequest = {
  email: string;
  productKey: keyof PaymentsState;
};

export type VerifyPaymentResponse = {
  verified: boolean;
  email: string;
  productKey: string;
  status: "PAID" | "NOT_FOUND" | "ERROR";
  message: string;
};

// ------------------------------------------------------------
// Report Generation API
// ------------------------------------------------------------

export type GenerateReportRequest = {
  reportType: "platform_consolidation_snapshot" | "recommendations_report" | "implementation_guide_sop";
  auditState: AuditState;
  user: UserProfile;
};

export type GenerateReportResponse = {
  success: boolean;
  pdfBase64?: string;
  content?: ReportContent;
  error?: string;
};

// ------------------------------------------------------------
// Product Config
// ------------------------------------------------------------

export type ProductKey = keyof PaymentsState;

export type ProductConfig = {
  key: ProductKey;
  name: string;
  price: number;
  stripeLinkEnvKey: string;
  sheetProductName: string;
  unlockedDeliverable: keyof DeliverablesState | "done_with_you_confirmation";
  offerHeadline: string;
  offerCopy: string;
  buttonLabel: string;
};
