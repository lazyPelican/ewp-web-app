import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const findByName = (rows: any[] = [], name: string) =>
  rows.find(r => r?.name === name) || rows.find(r => r?.name?.trim() === (name || '').trim())

const calcCabinetry = (items: any[] = [], pricing: any) =>
  items.reduce((sum, item) => {
    if (!item.product) return sum
    const prod = findByName(pricing.woodwork, item.product)
    const con = findByName(pricing.construction, item.construction)
    const wood = findByName(pricing.wood, item.wood)
    if (!prod) return sum
    const qty = parseFloat(item.qty) || 0
    const adjPct = parseFloat(item.adjPct) || 0
    const stdPrice = Number(prod.price || 0) * (1 + Number(con?.premium || 0)) * (1 + Number(wood?.premium || 0))
    return sum + stdPrice * qty * (1 + adjPct / 100)
  }, 0)

const calcUpgrades = (items: any[] = [], pricing: any) =>
  items.reduce((sum, item) => {
    if (!item.upgrade) return sum
    const upg = findByName(pricing.upgrades, item.upgrade)
    if (!upg) return sum
    const qty = parseFloat(item.qty) || 0
    const adjPct = parseFloat(item.adjPct) || 0
    return sum + Number(upg.price || 0) * qty * (1 + adjPct / 100)
  }, 0)

const calcCountertops = (items: any[] = [], pricing: any) =>
  items.reduce((sum, item) => {
    if (!item.product) return sum
    const ctp = findByName(pricing.countertops || [], item.product)
    if (!ctp) return sum
    const qty = parseFloat(item.qty) || 0
    const adjPct = parseFloat(item.adjPct) || 0
    return sum + Number(ctp.price || 0) * qty * (1 + adjPct / 100)
  }, 0)

const calcFinishing = (items: any[] = [], pricing: any) =>
  items.reduce((sum, item) => {
    if (!item.type) return sum
    const fin = findByName(pricing.finishing, item.type)
    if (!fin) return sum
    const lf = parseFloat(item.lf) || 0
    const adjPct = parseFloat(item.adjPct) || 0
    return sum + Number(fin.pricePerLF || 0) * lf * (1 + adjPct / 100)
  }, 0)

const calcInstall = (installData: any = {}, cabTotal: number, pricing: any) => {
  if (!installData.type || installData.type === 'No Install') return 0
  const inst = findByName(pricing.installType, installData.type)
  if (!inst) return 0
  const adjPct = parseFloat(installData.adjPct) || 0
  const base = installData.type === 'Hourly Rate'
    ? Number(inst.rate || 0) * (parseFloat(installData.metric) || 0)
    : cabTotal * Number(inst.rate || 0)
  return Math.ceil((base * (1 + adjPct / 100)) / 5) * 5
}

const calcTotal = (project: any, rooms: any[] = [], pricing: any) => {
  const roomsTotal = rooms.reduce((sum, room) => {
    const cab = calcCabinetry(room.cabinetry || [], pricing)
    return sum
      + cab
      + calcUpgrades(room.upgrades || [], pricing)
      + calcCountertops(room.countertops || [], pricing)
      + calcFinishing(room.finishing || [], pricing)
      + calcInstall(room.install || {}, cab, pricing)
  }, 0)
  const delivery = project.noDelivery ? 0 : (parseFloat(project.deliveryAmount) || 0)
  const subtotal = roomsTotal + delivery
  const taxEnabled = project.installationType ? project.installationType === 'contractor' : project.taxEnabled
  const taxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
  return subtotal + (taxEnabled ? subtotal * (taxRate / 100) : 0)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { project, rooms, pricing, clientTotal } = await req.json()
    if (!project || !Array.isArray(rooms) || !pricing) {
      throw new Error('Missing required fields: project, rooms, pricing')
    }

    const serverTotal = calcTotal(project, rooms, pricing)
    const totalMatches = clientTotal == null || Math.abs(Number(clientTotal) - serverTotal) < 0.01

    return new Response(JSON.stringify({
      valid: totalMatches,
      serverTotal,
      clientTotal: clientTotal == null ? null : Number(clientTotal),
      delta: clientTotal == null ? null : Number(clientTotal) - serverTotal,
    }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: totalMatches ? 200 : 409,
    })
  } catch (err) {
    return new Response(JSON.stringify({ valid: false, error: (err as Error).message }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

