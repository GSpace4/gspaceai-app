// ============================================================
// GSpaceAi — Application Constants
// ============================================================

import type { ConsolidationScoreLabel } from "./types";

// ------------------------------------------------------------
// Brand Colors
// ------------------------------------------------------------

export const BRAND_COLORS = {
  blue:   "#4285f3",
  red:    "#ea4335",
  yellow: "#fabc04",
  green:  "#35a852",
  dark:   "#1f1f1f",
  light:  "#f8f9fa",
  border: "#e8eaed",
  white:  "#ffffff",
} as const;

// ------------------------------------------------------------
// GSpace Consolidation Score Ranges
// ------------------------------------------------------------

export const SCORE_RANGES: { min: number; max: number; label: ConsolidationScoreLabel }[] = [
  { min: 0,  max: 25,  label: "Minimal Opportunity" },
  { min: 26, max: 50,  label: "Moderate Opportunity" },
  { min: 51, max: 75,  label: "Strong Opportunity" },
  { min: 76, max: 100, label: "High Opportunity" },
];

// ------------------------------------------------------------
// localStorage Key
// ------------------------------------------------------------

export const STORAGE_KEY = "gspaceai_session";

// ------------------------------------------------------------
// Audit — Required Discovery Areas (for system prompt guidance)
// ------------------------------------------------------------

export const AUDIT_DISCOVERY_AREAS = [
  "business type and industry",
  "products or services offered",
  "current Google Workspace usage",
  "paid software tools outside Google Workspace",
  "estimated monthly cost of each tool",
  "how leads or customers come in",
  "how customers, jobs, projects, or appointments are tracked",
  "how work or appointments are scheduled",
  "internal and customer communication methods",
  "where repetitive manual work happens",
  "where copy/paste between systems occurs",
  "what reports or visibility are missing",
  "tools suspected to be underused or overpriced",
  "document management and storage",
] as const;

// ------------------------------------------------------------
// Common Platform Replacement Patterns
// ------------------------------------------------------------

export const PLATFORM_REPLACEMENT_PATTERNS: Record<string, string[]> = {
  Calendly: [
    "Google Calendar appointment schedules",
    "Google Forms intake",
    "Apps Script email confirmations",
    "Gmail templates",
  ],
  "Trello": [
    "Google Sheets project trackers",
    "Google Forms task intake",
    "Apps Script status updates",
    "Google Drive folders",
    "Google Calendar reminders",
  ],
  "Asana": [
    "Google Sheets project trackers",
    "Google Forms task intake",
    "Apps Script status updates",
  ],
  "Monday.com": [
    "Google Sheets project trackers",
    "Apps Script automation",
    "Looker Studio dashboards",
  ],
  "ClickUp": [
    "Google Sheets project trackers",
    "Apps Script status updates",
    "Google Calendar reminders",
  ],
  "Airtable": [
    "Google Sheets databases",
    "filtered views",
    "protected ranges",
    "Apps Script automation",
    "Looker Studio dashboards",
  ],
  "Notion": [
    "Google Sites",
    "Google Docs",
    "Google Drive shared folders",
    "internal knowledge bases",
  ],
  "Slack": [
    "Google Chat",
    "Gmail groups",
    "Spaces",
    "Calendar workflows",
  ],
  "Typeform": [
    "Google Forms",
    "Apps Script routing",
    "Google Sheets response tracking",
    "automatic confirmation emails",
  ],
  "Jotform": [
    "Google Forms",
    "Apps Script routing",
    "Google Sheets response tracking",
  ],
  "Mailchimp": [
    "Gmail",
    "Google Sheets contact lists",
    "Apps Script mail merge",
    "scheduled follow-ups",
  ],
  "HubSpot CRM (lightweight)": [
    "Google Sheets CRM",
    "Apps Script reminders",
    "Gmail templates",
    "Calendar follow-ups",
    "Looker Studio dashboards",
  ],
  "Dubsado": [
    "Google Forms intake",
    "Google Docs contracts",
    "Apps Script automation",
    "Gmail templates",
  ],
  "HoneyBook": [
    "Google Forms intake",
    "Google Docs proposals",
    "Apps Script automation",
    "Gmail templates",
  ],
};

// ------------------------------------------------------------
// Buildable Systems Inside Google Workspace
// ------------------------------------------------------------

export const BUILDABLE_WORKSPACE_SYSTEMS = [
  "Lead tracker",
  "Lightweight CRM",
  "Client onboarding tracker",
  "Job/project tracker",
  "Appointment request workflow",
  "Quote request workflow",
  "Customer follow-up system",
  "Email reminder system",
  "Employee onboarding tracker",
  "PTO request tracker",
  "Inventory tracker",
  "Service request portal",
  "SOP library",
  "Internal knowledge base",
  "Approval workflow",
  "Referral tracker",
  "Invoice/payment status tracker",
  "Dashboard/reporting system",
] as const;

// ------------------------------------------------------------
// Error Messages (payment verification)
// ------------------------------------------------------------

export const PAYMENT_ERROR_MESSAGES = {
  not_found:
    "Payment could not be verified yet. Please confirm the email used at checkout and try again. If you just paid, wait a moment and click verify again.",
  wrong_product:
    "We found a payment for this email, but not for this specific report. Please confirm you selected the correct offer and try again.",
  missing_email:
    "Please enter the email address used at checkout so we can verify your payment.",
  service_error:
    "We could not complete payment verification right now. Please try again in a moment.",
} as const;

// ------------------------------------------------------------
// App Copy
// ------------------------------------------------------------

export const APP_COPY = {
  introMessage:
    "Hi! I'm GSpaceAi, let's see what tools you can cut or where you can save time. First, what's your name?",
  landingHeadline: "You're Paying For Tools Google Workspace Can Replace.",
  landingSubheadline: "Find Out Exactly Which Ones In 5 Minutes. Free.",
  landingCta: "Start Free Audit",
  landingBullets: [
    "Find overlapping software subscriptions",
    "Estimate potential monthly savings",
    "Discover Google Workspace replacement opportunities",
    "Get your GSpace Consolidation Score™",
  ],
} as const;
