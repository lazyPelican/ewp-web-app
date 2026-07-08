import { calcTotal } from "./appUtils.js"
import { logWarn } from "./logger.js"

export const buildQuoteIntegrityPayload = ({ project, rooms, pricing }) => ({
  project,
  rooms,
  pricing,
  clientTotal: calcTotal({ project, rooms }, pricing),
})

export async function validateQuoteWithServer(supabase, payload, { required = false } = {}) {
  try {
    const { data, error } = await supabase.functions.invoke("validate-quote", {
      body: payload,
    })
    if (error) throw error
    if (!data?.valid) {
      throw new Error(`Quote validation failed${data?.delta != null ? `; delta ${data.delta}` : ""}`)
    }
    return { ok: true, data }
  } catch (err) {
    if (required) throw err
    logWarn("quoteIntegrity.validateQuoteWithServer", "Server validation unavailable or failed open", {
      message: err?.message || String(err),
    })
    return { ok: false, warning: err?.message || String(err) }
  }
}

