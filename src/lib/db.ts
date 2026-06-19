// ============================================================
// GSpaceAi — Database Operations
//
// All Supabase reads/writes go through this module.
// Every function is fire-safe: if Supabase is not configured
// or a write fails, it logs a warning and returns gracefully.
// The rest of the app never sees the error.
// ============================================================

import { getSupabaseClient } from "./supabase";
import type { AuditState, UserProfile } from "./types";

// ------------------------------------------------------------
// Error logging
// Fire-and-forget. Never throws — must never block the caller.
// ------------------------------------------------------------

export type ErrorLogParams = {
  context: string;
  message: string;
  stack?: string;
  session_id?: string;
  email?: string;
  business_name?: string;
};

export async function logError(params: ErrorLogParams): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase.from("errors").insert({
      context:       params.context,
      message:       params.message,
      stack:         params.stack ?? null,
      session_id:    params.session_id ?? null,
      email:         params.email ?? null,
      business_name: params.business_name ?? null,
    });
    if (error) console.warn("[db] logError insert failed:", error.message);
  } catch (err) {
    console.warn("[db] logError threw:", err);
  }
}

// ------------------------------------------------------------
// Session upsert
// Called after free report generation and on each subsequent
// report generation to keep session data fresh.
// ------------------------------------------------------------

export type SessionData = {
  name?: string;
  email?: string;
  businessName?: string;
  businessType?: string;
  industry?: string;
  stage?: string;
  consolidationScore?: number;
  scoreLabel?: string;
  estimatedAnnualSavings?: number;
  auditData?: AuditState;
  user?: UserProfile;
};

export async function upsertSession(
  sessionId: string,
  data: SessionData
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return; // Supabase not configured — skip silently

  try {
    const { error } = await supabase.from("sessions").upsert(
      {
        id: sessionId,
        updated_at: new Date().toISOString(),
        ...(data.email           && { email: data.email }),
        ...(data.name            && { name: data.name }),
        ...(data.businessName    && { business_name: data.businessName }),
        ...(data.businessType    && { business_type: data.businessType }),
        ...(data.industry        && { industry: data.industry }),
        ...(data.stage           && { stage: data.stage }),
        ...(data.consolidationScore !== undefined && { consolidation_score: data.consolidationScore }),
        ...(data.scoreLabel      && { score_label: data.scoreLabel }),
        ...(data.estimatedAnnualSavings !== undefined && { estimated_annual_savings: data.estimatedAnnualSavings }),
        ...(data.auditData       && { audit_data: data.auditData }),
      },
      { onConflict: "id" }
    );

    if (error) console.warn("[db] upsertSession error:", error.message);
  } catch (err) {
    console.warn("[db] upsertSession threw:", err);
  }
}

// ------------------------------------------------------------
// Session read
// Used by the admin regenerate-report route.
// ------------------------------------------------------------

export type StoredSession = {
  id: string;
  audit_data: AuditState;
  name: string | null;
  email: string | null;
  business_name: string | null;
  business_type: string | null;
  industry: string | null;
  stage: string | null;
};

export async function getSession(sessionId: string): Promise<StoredSession | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("id, audit_data, name, email, business_name, business_type, industry, stage")
      .eq("id", sessionId)
      .single();
    if (error) {
      console.warn("[db] getSession error:", error.message);
      return null;
    }
    return data as StoredSession;
  } catch (err) {
    console.warn("[db] getSession threw:", err);
    return null;
  }
}

// ------------------------------------------------------------
// Save generated report PDF + structured data
// Uploads the PDF buffer to Supabase Storage and records
// the report metadata in the reports table.
// Returns the signed URL (valid 1 year) or null on failure.
// ------------------------------------------------------------

export async function saveReport(
  sessionId: string,
  reportType: string,
  pdfBuffer: Buffer,
  reportData: unknown
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const storagePath = `${sessionId}/${reportType}.pdf`;

    // Upload PDF — upsert so re-generations overwrite cleanly
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(storagePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.warn("[db] PDF upload error:", uploadError.message);
      return null;
    }

    // Signed URL valid for 1 year
    const { data: urlData, error: urlError } = await supabase.storage
      .from("reports")
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60);

    if (urlError) console.warn("[db] createSignedUrl error:", urlError.message);
    const pdfUrl = urlData?.signedUrl ?? null;

    // Upsert report record — one row per (session, report_type)
    const { error: dbError } = await supabase.from("reports").upsert(
      {
        session_id: sessionId,
        report_type: reportType,
        generated_at: new Date().toISOString(),
        pdf_storage_path: storagePath,
        pdf_url: pdfUrl,
        report_data: reportData,
      },
      { onConflict: "session_id,report_type" }
    );

    if (dbError) console.warn("[db] report upsert error:", dbError.message);

    return pdfUrl;
  } catch (err) {
    console.warn("[db] saveReport threw:", err);
    return null;
  }
}
