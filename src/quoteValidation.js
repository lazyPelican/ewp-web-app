import { isValidEmail } from "./sanitize.js"

const isFiniteNumberString = (value, { min = -Infinity, max = Infinity } = {}) => {
  if (value === "" || value == null) return true
  const n = Number(value)
  return Number.isFinite(n) && n >= min && n <= max
}

const asArray = (value) => Array.isArray(value) ? value : []

export function validateQuotePayload(project, rooms) {
  const errors = []

  if (!project || typeof project !== "object") errors.push("Project data is missing.")
  if (!Array.isArray(rooms)) errors.push("Rooms data must be a list.")
  if (project?.email && !isValidEmail(project.email)) errors.push("Client email is invalid.")
  if (project?.billingEmail && !isValidEmail(project.billingEmail)) errors.push("Billing email is invalid.")
  if (!isFiniteNumberString(project?.deliveryAmount, { min: 0 })) errors.push("Delivery amount must be a valid positive number.")
  if (!isFiniteNumberString(project?.taxRate, { min: 0, max: 100 })) errors.push("Tax rate must be between 0 and 100.")

  asArray(rooms).forEach((room, roomIndex) => {
    const prefix = `Room ${roomIndex + 1}`
    asArray(room?.cabinetry).forEach((item, itemIndex) => {
      if (!isFiniteNumberString(item?.qty, { min: 0 })) errors.push(`${prefix} cabinetry line ${itemIndex + 1} quantity is invalid.`)
      if (!isFiniteNumberString(item?.adjPct, { min: -100, max: 1000 })) errors.push(`${prefix} cabinetry line ${itemIndex + 1} adjustment is invalid.`)
    })
    asArray(room?.upgrades).forEach((item, itemIndex) => {
      if (!isFiniteNumberString(item?.qty, { min: 0 })) errors.push(`${prefix} upgrade line ${itemIndex + 1} quantity is invalid.`)
      if (!isFiniteNumberString(item?.adjPct, { min: -100, max: 1000 })) errors.push(`${prefix} upgrade line ${itemIndex + 1} adjustment is invalid.`)
    })
    asArray(room?.countertops).forEach((item, itemIndex) => {
      if (!isFiniteNumberString(item?.qty, { min: 0 })) errors.push(`${prefix} countertop line ${itemIndex + 1} quantity is invalid.`)
      if (!isFiniteNumberString(item?.adjPct, { min: -100, max: 1000 })) errors.push(`${prefix} countertop line ${itemIndex + 1} adjustment is invalid.`)
    })
    asArray(room?.finishing).forEach((item, itemIndex) => {
      if (!isFiniteNumberString(item?.lf, { min: 0 })) errors.push(`${prefix} finishing line ${itemIndex + 1} linear feet is invalid.`)
      if (!isFiniteNumberString(item?.adjPct, { min: -100, max: 1000 })) errors.push(`${prefix} finishing line ${itemIndex + 1} adjustment is invalid.`)
    })
    if (!isFiniteNumberString(room?.install?.metric, { min: 0 })) errors.push(`${prefix} install metric is invalid.`)
    if (!isFiniteNumberString(room?.install?.adjPct, { min: -100, max: 1000 })) errors.push(`${prefix} install adjustment is invalid.`)
  })

  return {
    ok: errors.length === 0,
    errors,
  }
}
