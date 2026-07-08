import { describe, expect, it } from "vitest"
import { validateQuotePayload } from "./quoteValidation.js"

describe("quote payload validation", () => {
  it("accepts a normal quote payload", () => {
    const result = validateQuotePayload(
      { email: "client@example.com", deliveryAmount: "50", taxRate: "8.53" },
      [{ cabinetry: [{ qty: "2", adjPct: "10" }], install: { metric: "1", adjPct: "0" } }],
    )

    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it("rejects invalid emails and unsafe numeric fields", () => {
    const result = validateQuotePayload(
      { email: "bad-email", deliveryAmount: "-1", taxRate: "120" },
      [{ cabinetry: [{ qty: "-2", adjPct: "1001" }], install: { metric: "-1", adjPct: "-101" } }],
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain("Client email is invalid.")
    expect(result.errors).toContain("Delivery amount must be a valid positive number.")
    expect(result.errors).toContain("Tax rate must be between 0 and 100.")
  })
})
