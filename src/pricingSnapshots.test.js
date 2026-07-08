import { describe, expect, it } from "vitest"
import {
  buildPricingSnapshotForRooms,
  detectPricingChanges,
  displayPriceValue,
  pricingSnapshotToTables,
} from "./pricingSnapshots.js"

const pricing = {
  woodwork: [{ name: "Base Cabinet", price: 100, finLF: 1 }],
  construction: [{ name: "Standard", premium: 0.1 }],
  wood: [{ name: "Maple", premium: 0.2 }],
  upgrades: [{ name: "Glass Doors", price: 50 }],
  countertops: [{ name: "Quartz", price: 200 }],
  finishing: [{ name: "Paint", pricePerLF: 30 }],
  installType: [{ name: "Hourly Rate", rate: 125 }],
}

const room = {
  cabinetry: [{ product: "Base Cabinet", construction: "Standard", wood: "Maple" }],
  upgrades: [{ upgrade: "Glass Doors" }],
  countertops: [{ product: "Quartz" }],
  finishing: [{ type: "Paint" }],
  install: { type: "Hourly Rate" },
}

describe("pricing snapshots", () => {
  it("captures only pricing rows used by the quote", () => {
    expect(buildPricingSnapshotForRooms([room], pricing)).toEqual({
      woodwork: { "Base Cabinet": 100 },
      construction: { Standard: 0.1 },
      wood: { Maple: 0.2 },
      upgrades: { "Glass Doors": 50 },
      countertops: { Quartz: 200 },
      finishing: { Paint: 30 },
      installType: { "Hourly Rate": 125 },
    })
  })

  it("rebuilds pricing tables from a saved snapshot", () => {
    const restored = pricingSnapshotToTables({
      woodwork: { "Base Cabinet": 80 },
      construction: { Standard: 0.15 },
      installType: { "Hourly Rate": 100 },
    }, pricing)

    expect(restored.woodwork[0].price).toBe(80)
    expect(restored.construction[0].premium).toBe(0.15)
    expect(restored.installType[0].rate).toBe(100)
  })

  it("detects price changes for used rows", () => {
    const changes = detectPricingChanges(
      { woodwork: { "Base Cabinet": 100 }, installType: { "Hourly Rate": 125 } },
      { woodwork: { "Base Cabinet": 120 }, installType: { "Hourly Rate": 150 } },
    )

    expect(changes).toEqual([
      { key: "woodwork", label: "Cabinetry", name: "Base Cabinet", oldValue: 100, newValue: 120 },
      { key: "installType", label: "Installation", name: "Hourly Rate", oldValue: 125, newValue: 150 },
    ])
    expect(displayPriceValue(changes[1])).toBe("$125.00/hr -> $150.00/hr")
  })
})
