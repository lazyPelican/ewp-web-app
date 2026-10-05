const findRow = (rows = [], name) => rows.find(row => row.name?.trim() === name?.trim())

export function installationFootage(room = {}, pricing = {}) {
  const finishingEnabled = !Array.isArray(room.sections) || room.sections.includes('finishing')
  const entered = finishingEnabled ? (room.finishing || []).reduce((sum, item) => sum + (Number(item.lf) || 0), 0) : 0
  if (entered > 0) return { lf: entered, source: 'Entered finishing LF' }
  const lf = (room.cabinetry || []).reduce((sum, item) => {
    const product = findRow(pricing.woodwork, item.product)
    return sum + (Number(product?.finLF) || 0) * (Number(item.qty) || 0)
  }, 0)
  return { lf, source: 'Cabinetry estimate' }
}

export function installationDetails(install = {}, cabTotal = 0, pricing = {}, room = {}) {
  const method = install.method || (install.type === 'Hourly Rate' ? 'hourly' : install.type === 'No Install' ? 'none' : 'percentage')
  const footage = installationFootage(room, pricing)
  if (install.method && Array.isArray(room.sections) && !room.sections.includes('install')) {
    return { ...footage, method, rate: 0, base: 0, total: 0, valid: true }
  }
  if (method === 'none' || (!install.type && method !== 'per_lf')) {
    return { ...footage, method, rate: 0, base: 0, total: 0, valid: true }
  }
  const row = findRow(method === 'per_lf' ? pricing.installPerLF : pricing.installType, install.type)
  const rate = Number(row?.rate) || 0
  const base = method === 'per_lf' ? footage.lf * rate : method === 'hourly' ? (Number(install.metric) || 0) * rate : cabTotal * rate
  const total = Math.ceil((base * (1 + (Number(install.adjPct) || 0) / 100)) / 5) * 5
  return { ...footage, method, rate, base, total, valid: method !== 'per_lf' || (!!row && Number.isFinite(Number(row.rate)) && rate > 0 && footage.lf > 0) }
}

export function installationIssue(room, pricing) {
  if (room.install?.method !== 'per_lf' || (Array.isArray(room.sections) && !room.sections.includes('install'))) return null
  const details = installationDetails(room.install, 0, pricing, room)
  if (!room.install.type) return 'Select an installation rate category.'
  if (!details.rate || !details.valid && details.lf > 0) return 'The installation category needs a valid rate greater than zero.'
  if (details.lf <= 0) return 'Installation requires positive linear footage.'
  return null
}
