import { describe, expect, it, vi } from "vitest"
import { buildQuoteIntegrityPayload, validateQuoteWithServer } from "./quoteIntegrity.js"

const pricing = {
  woodwork: [{ name: "Base Cabinet", price: 100, finLF: 1 }],
  construction: [{ name: "Standard", premium: 0 }],
  wood: [{ name: "Maple", premium: 0 }],
  upgrades: [],
  countertops: [],
  finishing: [],
  installType: [{ name: "No Install", rate: 0 }],
}

describe("quote integrity payload", () => {
  it("includes the server validation inputs and client total", () => {
    const project = { noDelivery: false, deliveryAmount: "25", taxEnabled: false, taxRate: "0" }
    const rooms = [{
      cabinetry: [{ product: "Base Cabinet", construction: "Standard", wood: "Maple", qty: "2", adjPct: "0" }],
      upgrades: [],
      countertops: [],
      finishing: [],
      install: { type: "No Install" },
    }]

    expect(buildQuoteIntegrityPayload({ project, rooms, pricing })).toEqual({
      project,
      rooms,
      pricing,
      clientTotal: 225,
    })
  })

  it("throws when required server validation fails", async () => {
    const supabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({ error: new Error("offline") }),
      },
    }

    await expect(validateQuoteWithServer(supabase, { clientTotal: 1 }, { required: true }))
      .rejects.toThrow("offline")
  })

  it("fails open only when validation is explicitly optional", async () => {
    const supabase = {
      functions: {
        invoke: vi.fn().mockResolvedValue({ error: new Error("offline") }),
      },
    }

    await expect(validateQuoteWithServer(supabase, { clientTotal: 1 }, { required: false }))
      .resolves.toMatchObject({ ok: false })
  })
})
