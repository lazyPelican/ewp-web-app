import { calcCabinetry, calcUpgrades, calcCountertops, calcFinishing, calcInstall, calcTotal } from './appUtils.js'

export function quickBooksSummary(project, rooms, pricing) {
  let wood = 0, finishing = 0, installation = 0
  for (const room of rooms) {
    const cab = calcCabinetry(room.cabinetry, pricing)
    wood += cab + calcUpgrades(room.upgrades, pricing) + calcCountertops(room.countertops || [], pricing)
    finishing += calcFinishing(room.finishing, pricing)
    installation += calcInstall(room.install, cab, pricing, room)
  }
  const delivery = project.noDelivery ? 0 : (Number(project.deliveryAmount) || 0)
  const lines = [
    { name: 'Wood Products', description: 'All cabinets, upgrades and countertops', amount: wood },
    { name: 'Finishing', description: 'Finishing Costs', amount: finishing },
    { name: 'Installation', description: 'Install Costs', amount: installation },
    { name: 'Delivery', description: 'Delivery Costs', amount: delivery },
  ]
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const grandTotal = calcTotal({ project, rooms }, pricing)
  const hasTax = project.installationType ? project.installationType === 'contractor' : project.taxEnabled
  return { lines, subtotal, tax: grandTotal - subtotal, grandTotal, hasTax }
}
