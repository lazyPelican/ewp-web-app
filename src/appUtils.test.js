import { describe, expect, it } from "vitest"
import {
  calcCabinetry,
  calcUpgrades,
  calcCountertops,
  calcFinishing,
  calcInstall,
  calcTotal,
} from "./appUtils.js"

const pricing = {
  woodwork: [{ name: "Base Cabinet", price: 100, finLF: 2 }],
  construction: [{ name: "Standard", premium: 0.1 }],
  wood: [{ name: "Maple", premium: 0.2 }],
  upgrades: [{ name: "Glass Doors", price: 50 }],
  countertops: [{ name: "Quartz", price: 200 }],
  finishing: [{ name: "Paint", pricePerLF: 30 }],
  installType: [
    { name: "No Install", rate: 0 },
    { name: "Standard Install", rate: 0.2 },
    { name: "Hourly Rate", rate: 125 },
  ],
}

describe("pricing calculations", () => {
  it("calculates cabinetry with construction and wood premiums", () => {
    const total = calcCabinetry([
      { product: "Base Cabinet", construction: "Standard", wood: "Maple", qty: "2", adjPct: "10" },
    ], pricing)

    expect(total).toBeCloseTo(290.4)
  })

  it("calculates all quote sections from an explicit pricing table", () => {
    expect(calcUpgrades([{ upgrade: "Glass Doors", qty: "2", adjPct: "0" }], pricing)).toBe(100)
    expect(calcCountertops([{ product: "Quartz", qty: "3", adjPct: "10" }], pricing)).toBe(660)
    expect(calcFinishing([{ type: "Paint", lf: "5", adjPct: "20" }], pricing)).toBe(180)
    expect(calcInstall({ type: "Hourly Rate", metric: "4", adjPct: "0" }, 0, pricing)).toBe(500)
  })

  it("calculates project total with delivery and tax", () => {
    const project = {
      project: {
        noDelivery: false,
        deliveryAmount: "100",
        taxEnabled: true,
        taxRate: "10",
      },
      rooms: [{
        cabinetry: [{ product: "Base Cabinet", construction: "Standard", wood: "Maple", qty: "1", adjPct: "0" }],
        upgrades: [{ upgrade: "Glass Doors", qty: "1", adjPct: "0" }],
        countertops: [{ product: "Quartz", qty: "1", adjPct: "0" }],
        finishing: [{ type: "Paint", lf: "1", adjPct: "0" }],
        install: { type: "Standard Install", metric: "", adjPct: "0" },
      }],
    }

    expect(calcTotal(project, pricing)).toBeCloseTo(596.2)
  })
})
