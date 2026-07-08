import { DEFAULT_PRICING } from "./pricing.js"

export const clonePricing = (pricing) => JSON.parse(JSON.stringify(pricing || DEFAULT_PRICING))

export const priceValueFor = (row, key) => {
  if (!row) return null
  if (key === "finishing") return Number(row.pricePerLF || 0)
  if (key === "construction" || key === "wood") return Number(row.premium || 0)
  if (key === "installType") return Number(row.rate || 0)
  return Number(row.price || 0)
}

export const pricingLabelFor = (key) => ({
  woodwork: "Cabinetry",
  upgrades: "Upgrades",
  countertops: "Countertops",
  finishing: "Finishing",
  construction: "Construction premium",
  wood: "Wood premium",
  installType: "Installation",
}[key] || key)

export const buildPricingSnapshotForRooms = (roomsList, pricing = DEFAULT_PRICING) => {
  const names = {
    woodwork: new Set(),
    construction: new Set(),
    wood: new Set(),
    upgrades: new Set(),
    countertops: new Set(),
    finishing: new Set(),
    installType: new Set(),
  }

  ;(roomsList || []).forEach(room => {
    ;(room.cabinetry || []).forEach(item => {
      if (item.product) names.woodwork.add(item.product)
      if (item.construction) names.construction.add(item.construction)
      if (item.wood) names.wood.add(item.wood)
    })
    ;(room.upgrades || []).forEach(item => item.upgrade && names.upgrades.add(item.upgrade))
    ;(room.countertops || []).forEach(item => item.product && names.countertops.add(item.product))
    ;(room.finishing || []).forEach(item => item.type && names.finishing.add(item.type))
    if (room.install?.type) names.installType.add(room.install.type)
  })

  const snapshot = {}
  Object.entries(names).forEach(([key, usedNames]) => {
    snapshot[key] = {}
    usedNames.forEach(name => {
      const row = (pricing[key] || []).find(r => r.name === name || r.name?.trim() === name?.trim())
      if (row) snapshot[key][name] = priceValueFor(row, key)
    })
  })
  return snapshot
}

export const pricingSnapshotToTables = (snapshot, basePricing = DEFAULT_PRICING) => {
  if (!snapshot) return clonePricing(basePricing)
  const pricing = clonePricing(basePricing)
  Object.entries(snapshot).forEach(([key, rows]) => {
    pricing[key] = (pricing[key] || []).map(row => {
      if (!row?.name || rows[row.name] == null) return row
      if (key === "finishing") return { ...row, pricePerLF: rows[row.name] }
      if (key === "construction" || key === "wood") return { ...row, premium: rows[row.name] }
      if (key === "installType") return { ...row, rate: rows[row.name] }
      return { ...row, price: rows[row.name] }
    })
  })
  return pricing
}

export const detectPricingChanges = (savedSnapshot, currentSnapshot) => {
  if (!savedSnapshot || !currentSnapshot) return []
  const changes = []
  Object.entries(savedSnapshot).forEach(([key, rows]) => {
    Object.entries(rows || {}).forEach(([name, oldValue]) => {
      const newValue = currentSnapshot[key]?.[name]
      if (newValue == null) return
      if (Math.abs(Number(oldValue) - Number(newValue)) > 0.0001) {
        changes.push({ key, label: pricingLabelFor(key), name, oldValue: Number(oldValue), newValue: Number(newValue) })
      }
    })
  })
  return changes
}

export const displayPriceValue = (change) => {
  const money = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
  if (change.key === "installType" && change.name === "Hourly Rate") {
    return `${money(change.oldValue)}/hr -> ${money(change.newValue)}/hr`
  }
  if (change.key === "construction" || change.key === "wood" || change.key === "installType") {
    return `${(change.oldValue * 100).toFixed(2).replace(/\.00$/, "")}% -> ${(change.newValue * 100).toFixed(2).replace(/\.00$/, "")}%`
  }
  return `${money(change.oldValue)} -> ${money(change.newValue)}`
}
