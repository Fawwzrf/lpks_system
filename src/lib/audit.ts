import { SupabaseClient } from "@supabase/supabase-js";

export interface AuditLogPayload {
  actorId?: string | null;
  actorRole: string;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

/**
 * Mencatat aktivitas penting ke tabel audit_log secara non-blocking.
 * Dilengkapi error handling agar kegagalan logging tidak memutus flow transaksi utama.
 */
export async function logAuditEvent(
  supabase: SupabaseClient,
  payload: AuditLogPayload
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      actor_id: payload.actorId || null,
      actor_role: payload.actorRole || "system",
      action: payload.action,
      target_table: payload.targetTable || null,
      target_id: payload.targetId ? String(payload.targetId) : null,
      details: payload.details || {},
      ip_address: payload.ipAddress || null,
    });
  } catch (err) {
    console.error("[AUDIT_LOG_ERROR] Gagal menyimpan log audit:", err);
  }
}
