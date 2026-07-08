import { logWarn } from "./logger.js"

export async function recordAuditEvent(supabase, {
  session,
  action,
  entityType,
  entityId,
  metadata = {},
}) {
  if (!supabase || !action || !entityType) return { ok: false, skipped: true }

  try {
    const user = session?.user
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: user?.id || null,
      actor_email: user?.email || null,
      action,
      entity_type: entityType,
      entity_id: entityId == null ? null : String(entityId),
      metadata,
    })
    if (error) throw error
    return { ok: true }
  } catch (err) {
    logWarn("audit.recordAuditEvent", "Audit log write failed", {
      action,
      entityType,
      entityId,
      message: err?.message || String(err),
    })
    return { ok: false, warning: err?.message || String(err) }
  }
}
