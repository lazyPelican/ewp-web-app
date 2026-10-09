const money = value => Math.round((value + Number.EPSILON) * 100) / 100

export function quoteTotals(project = {}, roomsTotal = 0) {
  const delivery = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
  const subtotal = roomsTotal + delivery
  const hasTax = project.installationType ? project.installationType === 'contractor' : !!project.taxEnabled
  const taxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
  const tax = hasTax ? subtotal * (taxRate / 100) : 0
  const originalGrandTotal = subtotal + tax
  const result = { roomsTotal, delivery, subtotal, hasTax, taxRate, tax, originalGrandTotal, discountEnabled: false, discountAmount: 0, discountPercent: 0, grandTotal: originalGrandTotal, error: null }
  const discount = project.discount
  if (!discount?.enabled) return result
  result.discountEnabled = true
  if (discount.enabled !== true || !['amount', 'percent', 'target'].includes(discount.mode)) {
    return { ...result, error: 'Select a valid discount method.' }
  }
  const value = Number(discount.value)
  if (!['number', 'string'].includes(typeof discount.value) || String(discount.value).trim() === '' || !Number.isFinite(value) || value < 0) {
    return { ...result, error: 'Enter a valid discount value of zero or greater.' }
  }
  const originalCents = Math.round(originalGrandTotal * 100)
  if (discount.mode === 'percent' && value > 100) return { ...result, error: 'Discount percentage cannot exceed 100%.' }
  if (discount.mode !== 'percent' && value > money(originalGrandTotal)) {
    return { ...result, error: discount.mode === 'target' ? 'Target price cannot exceed the original grand total.' : 'Discount cannot exceed the original grand total.' }
  }
  const discountCents = discount.mode === 'percent' ? Math.round(originalCents * value / 100)
    : discount.mode === 'target' ? originalCents - Math.round(value * 100) : Math.round(value * 100)
  const discountAmount = discountCents / 100
  return {
    ...result,
    discountAmount,
    discountPercent: originalCents > 0 ? discountCents / originalCents * 100 : 0,
    grandTotal: (originalCents - discountCents) / 100,
  }
}

export function assertQuoteTotals(project, roomsTotal) {
  const totals = quoteTotals(project, roomsTotal)
  if (totals.error) throw new Error(totals.error)
  return totals
}
