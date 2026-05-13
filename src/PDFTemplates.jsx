// PDFTemplates.jsx — @react-pdf/renderer v4 components for EWP Quote App
// Generates true vector PDFs (selectable text, no rasterisation)

import React from 'react'
import {
  Document, Page, View, Text, Image, StyleSheet, Font, pdf
} from '@react-pdf/renderer'

// Display-only ID formatter — converts legacy EWPyyyymmddHHmmss → B-yymmdd-hhmm
const fmtId = (id = '') => {
  if (!id) return id
  if (id.startsWith('EWP') && id.length >= 13) {
    const s = id.slice(3)
    return `B-${s.slice(2,4)}${s.slice(4,6)}${s.slice(6,8)}-${s.slice(8,10)}${s.slice(10,12)}`
  }
  return id
}

// Logo: must be an absolute URL so @react-pdf/image uses fetchRemoteFile (fetch API)
// instead of fetchLocalFile (Node fs) which fails in the browser.
const LOGO_SRC = typeof window !== 'undefined'
  ? `${window.location.origin}/favicon-512_dark.png`
  : '/favicon-512_dark.png'

// Built-in PDF standard fonts — no registration needed, no network fetch.
// IMPORTANT: never combine these with fontWeight; use the explicit Bold variant instead.
const FONT_SANS    = 'Helvetica'
const FONT_SANS_BD = 'Helvetica-Bold'
const FONT_SERIF   = 'Times-Roman'
const FONT_SERIF_BD= 'Times-Bold'

// ── COLOUR PALETTE ─────────────────────────────────────────────────────────
const C = {
  ivory:       '#FAF7F2',
  ivoryMid:    '#F2EDE4',
  border:      '#DDD5C8',
  border2:     '#EDE6DC',
  stone:       '#8C7355',
  ink:         '#2A2118',
  body:        '#3D3228',
  muted:       '#9B8E82',
  amount:      '#5A3E1A',
  tableHdr:    '#5A4E42',
  grandBg:     '#E8E0D4',
  grandBorder: '#C8B89A',
  grandAccent: '#6B5030',
  grandText:   '#1A120A',
  grandVal:    '#3D2408',
  white:       '#FFFFFF',
}

// ── STYLE SHEET ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: FONT_SANS,
    fontSize: 9,
    color: C.body,
    paddingTop: 28,
    paddingBottom: 28,
    paddingLeft: 34,
    paddingRight: 34,
    backgroundColor: C.white,
  },

  // Header
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: C.ivory,
    borderBottom: `2 solid ${C.stone}`,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 14,
    paddingRight: 14,
    marginBottom: 8,
  },
  coLogo: { width: 42, height: 42 },
  coBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  coName: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 22,
    color: C.ink,
    letterSpacing: 0.3,
  },
  coTag: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 3,
  },
  docType: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 13,
    color: C.stone,
    letterSpacing: 1.5,
    textAlign: 'right',
  },
  docId: {
    fontFamily: FONT_SANS,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.8,
    marginTop: 4,
    textAlign: 'right',
  },
  docDate: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
    letterSpacing: 0.5,
    marginTop: 2,
    textAlign: 'right',
  },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    border: `1 solid ${C.border}`,
    borderLeft: `3 solid ${C.stone}`,
    marginBottom: 10,
    backgroundColor: C.ivory,
  },
  ic: {
    width: '50%',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    borderRight: `1 solid ${C.border}`,
    borderBottom: `1 solid ${C.border}`,
  },
  icEven: { borderRight: 'none' },
  icLbl: {
    fontFamily: FONT_SANS_BD,
    fontSize: 6,
    color: C.stone,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  icVal: {
    fontFamily: FONT_SANS,
    fontSize: 9.5,
    color: C.ink,
  },

  // Section label
  sec: {
    fontFamily: FONT_SANS_BD,
    fontSize: 7,
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    backgroundColor: C.ivoryMid,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    borderTop: `1.5 solid ${C.stone}`,
    borderLeft: `1 solid ${C.border}`,
    borderRight: `1 solid ${C.border}`,
  },

  // Table
  tblWrap: {
    border: `1 solid ${C.border}`,
    borderTop: 'none',
  },
  tRow: {
    flexDirection: 'row',
    borderBottom: `1 solid ${C.border2}`,
  },
  tRowAlt: {
    backgroundColor: C.ivory,
  },
  tRowHdr: {
    backgroundColor: C.ivoryMid,
    borderBottom: `1 solid ${C.border}`,
  },
  tCell: {
    fontFamily: FONT_SANS,
    fontSize: 8,
    color: C.body,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
  },
  tCellHdr: {
    fontFamily: FONT_SANS_BD,
    fontSize: 6,
    color: C.tableHdr,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 4,
    paddingRight: 4,
  },
  tCellR: { textAlign: 'right' },
  tCellAmt: {
    textAlign: 'right',
    color: C.amount,
  },
  tCellMuted: {
    color: C.muted,
    fontStyle: 'italic',
  },
  tBorderL: { borderLeft: `1 solid ${C.border}` },
  tBorderL2: { borderLeft: `1 solid ${C.border2}` },

  // Sub bar (section total)
  subBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.ivory,
    borderLeft: `1 solid ${C.border}`,
    borderRight: `1 solid ${C.border}`,
    borderBottom: `1 solid ${C.border}`,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 8,
    paddingRight: 8,
    marginBottom: 5,
  },
  subBarLbl: {
    fontFamily: FONT_SANS_BD,
    fontSize: 6.5,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subBarVal: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 11,
    color: C.ink,
  },

  // Totals strip (4-column)
  totalsStrip: {
    flexDirection: 'row',
    backgroundColor: C.ivoryMid,
    border: `1 solid ${C.border}`,
    borderTop: `2 solid ${C.stone}`,
    marginTop: 4,
    marginBottom: 0,
  },
  ts: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    borderRight: `1 solid ${C.border}`,
  },
  tsLast: { borderRight: 'none' },
  tsLbl: {
    fontFamily: FONT_SANS,
    fontSize: 6,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  tsVal: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 12,
    color: C.ink,
  },

  // Grand total bar
  grandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.grandBg,
    border: `1 solid ${C.grandBorder}`,
    borderLeft: `5 solid ${C.grandAccent}`,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 14,
    paddingRight: 14,
  },
  grandBarStandalone: {
    borderTop: `2 solid ${C.grandAccent}`,
    marginTop: 6,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 16,
    paddingRight: 16,
  },
  grandBarSmall: {
    backgroundColor: C.ivory,
    border: `1 solid ${C.border}`,
    borderLeft: `3 solid ${C.stone}`,
    marginTop: 3,
  },
  gl: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 12,
    color: C.grandText,
    letterSpacing: 0.8,
  },
  glStandalone: { fontSize: 13 },
  glSmall: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 9,
    color: C.stone,
  },
  gs: {
    fontFamily: FONT_SANS,
    fontSize: 6.5,
    color: C.muted,
    marginTop: 2,
  },
  gv: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 20,
    color: C.grandVal,
  },
  gvStandalone: { fontSize: 22 },
  gvSmall: {
    fontFamily: FONT_SERIF_BD,
    fontSize: 11,
    color: C.stone,
  },

  // Footer
  footer: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
    textAlign: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTop: `1 solid ${C.border}`,
    letterSpacing: 0.3,
  },

  // Signature blocks
  sigGrid: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  sigBlock: { flex: 1 },
  sigTitle: {
    fontFamily: FONT_SANS_BD,
    fontSize: 7,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 3,
  },
  sigLine: {
    borderBottom: `1 solid ${C.ink}`,
    height: 22,
    marginBottom: 3,
  },
  sigSubLine: {
    borderBottom: `1 solid ${C.border}`,
    height: 14,
    marginBottom: 2,
  },
  sigSubLbl: {
    fontFamily: FONT_SANS,
    fontSize: 7,
    color: C.muted,
  },
  gap: { height: 4 },
})

// ── HELPERS ────────────────────────────────────────────────────────────────
const fmtN = (n) =>
  n == null
    ? '$0.00'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const fmtD = (d) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return new Date(+y, +m - 1, +day).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Truncate long strings so PDF cells never overflow their column
const trunc = (str, max = 40) => {
  const s = String(str ?? '')
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── SHARED LAYOUT COMPONENTS ───────────────────────────────────────────────

function PageHeader({ docType, docId, docDate }) {
  return (
    <View style={s.hdr} fixed>
      <View style={s.coBrand}>
        <Image style={s.coLogo} src={LOGO_SRC} />
        <View>
          <Text style={s.coName}>Engstrom Wood Products</Text>
          <Text style={s.coTag}>Custom Cabinetry  ·  Fine Woodworking  ·  Precision Installation</Text>
        </View>
      </View>
      <View>
        <Text style={s.docType}>{docType}</Text>
        <Text style={s.docId}>{docId}</Text>
        {docDate && <Text style={s.docDate}>{docDate}</Text>}
      </View>
    </View>
  )
}

function InfoStrip({ cells }) {
  // cells = [{ label, value }, ...]  — rendered 2-per-row
  return (
    <View style={s.infoStrip}>
      {cells.map((cell, i) => (
        <View
          key={i}
          style={[
            s.ic,
            i % 2 === 1 ? s.icEven : {},
            i >= cells.length - 2 ? { borderBottom: 'none' } : {},
          ]}
        >
          <Text style={s.icLbl}>{cell.label}</Text>
          <Text style={s.icVal}>{trunc(cell.value, 48) || '—'}</Text>
        </View>
      ))}
    </View>
  )
}

function SectionLabel({ label }) {
  return <Text style={s.sec}>{label}</Text>
}

function SubBar({ label, value }) {
  return (
    <View style={s.subBar}>
      <Text style={s.subBarLbl}>{label}</Text>
      <Text style={s.subBarVal}>{fmtN(value)}</Text>
    </View>
  )
}

function GrandBar({ label, sub, value, standalone = false, small = false }) {
  return (
    <View style={[
      s.grandBar,
      standalone ? s.grandBarStandalone : {},
      small ? s.grandBarSmall : {},
    ]}>
      <View>
        <Text style={[s.gl, standalone ? s.glStandalone : {}, small ? s.glSmall : {}]}>{label}</Text>
        {sub ? <Text style={s.gs}>{sub}</Text> : null}
      </View>
      <Text style={[s.gv, standalone ? s.gvStandalone : {}, small ? s.gvSmall : {}]}>{fmtN(value)}</Text>
    </View>
  )
}

function TotalsStrip4({ cab, upg, fin, inst }) {
  const items = [
    { label: 'Cabinetry', value: cab },
    { label: 'Upgrades', value: upg },
    { label: 'Finishing', value: fin },
    { label: 'Installation', value: inst },
  ]
  return (
    <View style={s.totalsStrip}>
      {items.map((item, i) => (
        <View key={i} style={[s.ts, i === 3 ? s.tsLast : {}]}>
          <Text style={s.tsLbl}>{item.label}</Text>
          <Text style={s.tsVal}>{fmtN(item.value)}</Text>
        </View>
      ))}
    </View>
  )
}

function PdfFooter({ preparedBy }) {
  return (
    <Text style={s.footer}>
      {`This estimate is valid for 30 days from the bid date. All prices subject to final measurement verification.${preparedBy ? `  |  Prepared by ${preparedBy}` : ''}  |  Engstrom Wood Products`}
    </Text>
  )
}

// ── TABLE HELPERS ──────────────────────────────────────────────────────────

// colDefs: [{ w: '22%', label: 'Product Type', right: false }, ...]
function TableHeader({ colDefs }) {
  return (
    <View style={[s.tRow, s.tRowHdr]}>
      {colDefs.map((col, i) => (
        <View key={i} style={[{ width: col.w }, i > 0 ? s.tBorderL : {}]}>
          <Text style={[s.tCellHdr, col.right ? s.tCellR : {}]}>{col.label}</Text>
        </View>
      ))}
    </View>
  )
}

function TableRow({ colDefs, cells, isEven }) {
  // cells: [{ val, right, amt, muted }]
  return (
    <View style={[s.tRow, isEven ? s.tRowAlt : {}]}>
      {colDefs.map((col, i) => {
        const cell = cells[i] || {}
        return (
          <View key={i} style={[{ width: col.w }, i > 0 ? s.tBorderL2 : {}]}>
            <Text style={[
              s.tCell,
              cell.right ? s.tCellR : {},
              cell.amt ? s.tCellAmt : {},
              cell.muted ? s.tCellMuted : {},
            ]}>
              {cell.val ?? ''}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function EmptyRow({ colCount, label }) {
  return (
    <View style={[s.tRow]}>
      <View style={{ flex: 1 }}>
        <Text style={[s.tCell, s.tCellMuted]}>{label}</Text>
      </View>
    </View>
  )
}

// ── INTERNAL SUMMARY PAGE ──────────────────────────────────────────────────

function InternalSummaryPage({
  project, roomTotals,
  grandCab, grandUpg, grandFin, grandInst,
  delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy,
}) {
  const roomTableCols = [
    { w: '28%', label: 'Room' },
    { w: '14%', label: 'Cabinetry', right: true },
    { w: '14%', label: 'Upgrades', right: true },
    { w: '14%', label: 'Finishing', right: true },
    { w: '15%', label: 'Installation', right: true },
    { w: '15%', label: 'Room Total', right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={s.page}>
      <PageHeader
        docType="QUOTE — INTERNAL USE"
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
      />

      <InfoStrip cells={[
        { label: 'Project Name', value: project.name },
        { label: 'Address', value: project.address },
        { label: 'Bid Date', value: fmtD(project.bidDate) },
        { label: 'Contact', value: project.contactName },
        { label: 'Phone', value: project.contactPhone },
        { label: 'Email', value: project.email },
      ]} />

      <SectionLabel label="Room Breakdown" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={roomTableCols} />
        {roomTotals.map((r, i) => (
          <TableRow
            key={i}
            colDefs={roomTableCols}
            isEven={i % 2 === 1}
            cells={[
              { val: trunc(r.name || `Room ${i + 1}`, 36) },
              { val: fmtN(r.cab), right: true },
              { val: fmtN(r.upg), right: true },
              { val: fmtN(r.fin), right: true },
              { val: fmtN(r.inst), right: true },
              { val: fmtN(r.total), amt: true },
            ]}
          />
        ))}
      </View>

      <View wrap={false}>
        <SubBar
          label={`Project Totals — all ${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''} combined`}
          value={grandCab + grandUpg + grandFin + grandInst}
        />

        {delivery > 0 && (
          <GrandBar
            label="Delivery"
            sub={project.deliveryNotes ? trunc(project.deliveryNotes, 80) : undefined}
            value={delivery}
            standalone
            small
          />
        )}

        {(project.installationType ? project.installationType === "contractor" : project.taxEnabled) && (
          <GrandBar
            label={`Estimated Tax (${pdfTaxRate}%)`}
            sub={`Applied to project subtotal${delivery > 0 ? ' including delivery' : ''}`}
            value={pdfTaxAmt}
            standalone
            small
          />
        )}

        <GrandBar
          label="Grand Total"
          sub={[
            `All rooms · ${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''}`,
            fmtD(project.bidDate),
            delivery > 0 ? 'incl. delivery' : '',
            (project.installationType ? project.installationType === "contractor" : project.taxEnabled) ? `incl. ${pdfTaxRate}% tax` : '',
          ].filter(Boolean).join('  ·  ')}
          value={grandTotal}
          standalone
        />

        {/* Signature blocks */}
        <View style={s.sigGrid}>
          <View style={s.sigBlock}>
            <Text style={s.sigTitle}>Client Acceptance</Text>
            <View style={s.sigLine} />
            <View style={s.sigSubLine} />
            <Text style={s.sigSubLbl}>Printed Name</Text>
            <View style={[s.sigSubLine, { marginTop: 10 }]} />
            <Text style={s.sigSubLbl}>Date</Text>
          </View>
          <View style={s.sigBlock}>
            <Text style={s.sigTitle}>Authorized by Engstrom Wood Products</Text>
            <View style={s.sigLine} />
            <View style={s.sigSubLine} />
            <Text style={s.sigSubLbl}>Printed Name</Text>
            <View style={[s.sigSubLine, { marginTop: 10 }]} />
            <Text style={s.sigSubLbl}>Date</Text>
          </View>
        </View>

        <PdfFooter preparedBy={preparedBy} />
      </View>
    </Page>
  )
}

// ── INTERNAL ROOM PAGE ─────────────────────────────────────────────────────

const HOURLY_RATE = 'Hourly Rate'

function InternalRoomPage({ project, room, roomIndex, totalRooms, rt, pricing, preparedBy }) {
  const cabItems = room.cabinetry.filter(i => i.product && parseFloat(i.qty) > 0)
  const upgItems = room.upgrades.filter(i => i.upgrade && parseFloat(i.qty) > 0)
  const finItems = room.finishing.filter(i => i.type && parseFloat(i.lf) > 0)
  const instDef  = pricing.installType?.find(i => i.name === room.install.type)

  const cabCols = [
    { w: '22%', label: 'Product Type' },
    { w: '14%', label: 'Construction' },
    { w: '11%', label: 'Wood Type' },
    { w: '6%',  label: 'Con%', right: true },
    { w: '6%',  label: 'Spec%', right: true },
    { w: '6%',  label: 'Qty', right: true },
    { w: '6%',  label: 'Fin.LF', right: true },
    { w: '12%', label: 'Std Price', right: true },
    { w: '17%', label: 'Mod. Total', right: true },
  ]

  const upgCols = [
    { w: '36%', label: 'Description' },
    { w: '8%',  label: 'Qty', right: true },
    { w: '12%', label: 'Unit $', right: true },
    { w: '12%', label: 'Price', right: true },
    { w: '8%',  label: '% Adj', right: true },
    { w: '12%', label: 'Total', right: true },
    { w: '12%', label: 'Notes' },
  ]

  const finCols = [
    { w: '30%', label: 'Type' },
    { w: '9%',  label: 'Lin.Ft', right: true },
    { w: '13%', label: 'Price/LF', right: true },
    { w: '13%', label: 'Subtotal', right: true },
    { w: '8%',  label: '% Adj', right: true },
    { w: '13%', label: 'Total', right: true },
    { w: '14%', label: 'Notes' },
  ]

  // Compute install display values
  const instMetric = room.install.type === HOURLY_RATE
    ? `${room.install.metric || '0'} hrs × $135.00/hr`
    : instDef ? `${(instDef.rate * 100).toFixed(0)}% of cabinetry` : '—'
  const instPrice = room.install.type === HOURLY_RATE
    ? fmtN((parseFloat(room.install.metric) || 0) * 135)
    : fmtN(instDef ? rt.cab * instDef.rate : 0)
  const instAdj = room.install.adjPct ? `${room.install.adjPct}%` : '0%'

  // Build cabinetry row cells
  const cabRowCells = cabItems.map(item => {
    const prod = pricing.woodwork?.find(w => w.name === item.product)
    const con  = pricing.construction?.find(c => c.name === item.construction)
    const wood = pricing.wood?.find(w => w.name === item.wood)
    const sp   = prod ? prod.price * (1 + (con?.premium || 0)) * (1 + (wood?.premium || 0)) : 0
    const qty  = parseFloat(item.qty) || 0
    const finLF = prod ? (prod.finLF * qty).toFixed(1) : '0.0'
    const adj  = parseFloat(item.adjPct) || 0
    const tot  = sp * qty * (1 + adj / 100)
    return [
      { val: trunc(item.product, 36) },
      { val: item.construction === 'Not Applicable' ? '—' : trunc(item.construction || '—', 22) },
      { val: item.wood === 'Not Applicable' ? '—' : trunc(item.wood || '—', 18) },
      { val: con?.premium ? `${(con.premium * 100).toFixed(0)}%` : '0%', right: true },
      { val: wood?.premium ? `${(wood.premium * 100).toFixed(0)}%` : '0%', right: true },
      { val: String(qty), right: true },
      { val: finLF, right: true },
      { val: fmtN(sp), right: true },
      { val: fmtN(tot), amt: true },
    ]
  })

  const upgRowCells = upgItems.map(item => {
    const upg = pricing.upgrades?.find(u => u.name === item.upgrade)
    const qty = parseFloat(item.qty) || 0
    const adj = parseFloat(item.adjPct) || 0
    const tot = (upg?.price || 0) * qty * (1 + adj / 100)
    return [
      { val: trunc(item.upgrade, 44) },
      { val: String(qty), right: true },
      { val: fmtN(upg?.price || 0), right: true },
      { val: fmtN((upg?.price || 0) * qty), right: true },
      { val: adj ? `${adj}%` : '—', right: true },
      { val: fmtN(tot), amt: true },
      { val: trunc(item.notes || '', 30) },
    ]
  })

  const finRowCells = finItems.map(item => {
    const fin = pricing.finishing?.find(f => f.name === item.type)
    const lf  = parseFloat(item.lf) || 0
    const adj = parseFloat(item.adjPct) || 0
    const sub2 = (fin?.pricePerLF || 0) * lf
    const tot  = sub2 * (1 + adj / 100)
    return [
      { val: trunc(item.type, 38) },
      { val: String(lf), right: true },
      { val: `${fmtN(fin?.pricePerLF || 0)}/LF`, right: true },
      { val: fmtN(sub2), right: true },
      { val: adj ? `${adj}%` : '—', right: true },
      { val: fmtN(tot), amt: true },
      { val: trunc(item.notes || '', 30) },
    ]
  })

  const instInfoCols = [
    { w: '25%', label: 'Install Type' },
    { w: '25%', label: 'Metric / Method' },
    { w: '25%', label: 'Base Price' },
    { w: '25%', label: '% Adjustment' },
  ]
  const instInfoCells = [
    { val: room.install.type || '—' },
    { val: instMetric },
    { val: instPrice, right: true },
    { val: instAdj, right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={s.page}>
      <PageHeader
        docType={`QUOTE — ${trunc(room.name || `Room ${roomIndex + 1}`, 30)}`}
        docId={`${fmtId(project.id)}  ·  ${trunc(project.name, 40)}`}
        docDate={fmtD(project.bidDate)}
      />

      <InfoStrip cells={[
        { label: 'Room', value: room.name || `Room ${roomIndex + 1}` },
        { label: 'Room', value: `${roomIndex + 1} of ${totalRooms}` },
        { label: 'Bid Date', value: fmtD(project.bidDate) },
        { label: 'Master Adj %', value: `${room.cabinetry[0]?.adjPct || '0'}%` },
      ]} />

      {/* Cabinetry */}
      <SectionLabel label="Cabinetry" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={cabCols} />
        {cabItems.length === 0
          ? <EmptyRow colCount={9} label="No cabinetry items entered" />
          : cabRowCells.map((cells, i) => (
              <TableRow key={i} colDefs={cabCols} cells={cells} isEven={i % 2 === 1} />
            ))
        }
      </View>
      <SubBar label="Cabinetry Total" value={rt.cab} />

      {/* Upgrades */}
      <SectionLabel label="Upgrades / Overrides" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={upgCols} />
        {upgItems.length === 0
          ? <EmptyRow colCount={7} label="No upgrades entered" />
          : upgRowCells.map((cells, i) => (
              <TableRow key={i} colDefs={upgCols} cells={cells} isEven={i % 2 === 1} />
            ))
        }
      </View>
      <SubBar label="Upgrades Total" value={rt.upg} />

      {/* Finishing */}
      <SectionLabel label="Finishing" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={finCols} />
        {finItems.length === 0
          ? <EmptyRow colCount={7} label="No finishing items entered" />
          : finRowCells.map((cells, i) => (
              <TableRow key={i} colDefs={finCols} cells={cells} isEven={i % 2 === 1} />
            ))
        }
      </View>
      <SubBar label="Finishing Total" value={rt.fin} />

      {/* Installation */}
      <SectionLabel label="Installation" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={instInfoCols} />
        <TableRow colDefs={instInfoCols} cells={instInfoCells} isEven={false} />
      </View>
      <SubBar label="Install Total" value={rt.inst} />

      <View wrap={false}>
        <TotalsStrip4 cab={rt.cab} upg={rt.upg} fin={rt.fin} inst={rt.inst} />
        <GrandBar
          label="Room Grand Total"
          sub={`${trunc(room.name || `Room ${roomIndex + 1}`, 30)}  ·  Room ${roomIndex + 1} of ${totalRooms}`}
          value={rt.total}
        />
        <PdfFooter preparedBy={preparedBy} />
      </View>
    </Page>
  )
}

// ── INTERNAL DOCUMENT ──────────────────────────────────────────────────────

function InternalPDFDoc({ project, rooms, roomTotals, grandCab, grandUpg, grandFin, grandInst, delivery, pdfTaxRate, pdfTaxAmt, grandTotal, pricing, preparedBy }) {
  return (
    <Document title={`${project.name || 'Estimate'} — Internal`} author="Engstrom Wood Products">
      <InternalSummaryPage
        project={project}
        roomTotals={roomTotals}
        grandCab={grandCab}
        grandUpg={grandUpg}
        grandFin={grandFin}
        grandInst={grandInst}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
      />
      {rooms.map((room, i) => (
        <InternalRoomPage
          key={i}
          project={project}
          room={room}
          roomIndex={i}
          totalRooms={rooms.length}
          rt={roomTotals[i]}
          pricing={pricing}
          preparedBy={preparedBy}
        />
      ))}
    </Document>
  )
}

// ── CUSTOMER SUMMARY PAGE ──────────────────────────────────────────────────

function CustomerSummaryPage({
  project, roomTotals,
  delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy,
}) {
  const roomTableCols = [
    { w: '40%', label: 'Room' },
    { w: '30%', label: 'Room Subtotal', right: true },
    { w: '30%', label: 'Room Total', right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={s.page}>
      <PageHeader
        docType="QUOTE"
        docId={fmtId(project.id)}
        docDate={fmtD(project.bidDate)}
      />

      <InfoStrip cells={[
        { label: 'Project Name', value: project.name },
        { label: 'Address', value: project.address },
        { label: 'Bid Date', value: fmtD(project.bidDate) },
        { label: 'Contact', value: project.contactName },
        { label: 'Phone', value: project.contactPhone },
        { label: 'Email', value: project.email },
      ]} />

      <SectionLabel label="Room Summary" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={roomTableCols} />
        {roomTotals.map((r, i) => (
          <TableRow
            key={i}
            colDefs={roomTableCols}
            isEven={i % 2 === 1}
            cells={[
              { val: trunc(r.name || `Room ${i + 1}`, 50) },
              { val: fmtN(r.total), right: true },
              { val: fmtN(r.total), amt: true },
            ]}
          />
        ))}
      </View>

      <View wrap={false}>
        <SubBar
          label={`Project Subtotal — ${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''}`}
          value={roomTotals.reduce((s, r) => s + r.total, 0)}
        />

        {delivery > 0 && (
          <GrandBar
            label="Delivery"
            sub={project.deliveryNotes ? trunc(project.deliveryNotes, 80) : undefined}
            value={delivery}
            standalone
            small
          />
        )}

        {(project.installationType ? project.installationType === "contractor" : project.taxEnabled) && (
          <GrandBar
            label={`Estimated Tax (${pdfTaxRate}%)`}
            sub={`Applied to project subtotal${delivery > 0 ? ' including delivery' : ''}`}
            value={pdfTaxAmt}
            standalone
            small
          />
        )}

        <GrandBar
          label="Grand Total"
          sub={[
            `${roomTotals.length} room${roomTotals.length !== 1 ? 's' : ''}`,
            fmtD(project.bidDate),
            delivery > 0 ? 'incl. delivery' : '',
            (project.installationType ? project.installationType === "contractor" : project.taxEnabled) ? `incl. ${pdfTaxRate}% tax` : '',
          ].filter(Boolean).join('  ·  ')}
          value={grandTotal}
          standalone
        />

        {/* Signature blocks */}
        <View style={s.sigGrid}>
          <View style={s.sigBlock}>
            <Text style={s.sigTitle}>Client Acceptance</Text>
            <View style={s.sigLine} />
            <View style={s.sigSubLine} />
            <Text style={s.sigSubLbl}>Printed Name</Text>
            <View style={[s.sigSubLine, { marginTop: 10 }]} />
            <Text style={s.sigSubLbl}>Date</Text>
          </View>
          <View style={s.sigBlock}>
            <Text style={s.sigTitle}>Authorized by Engstrom Wood Products</Text>
            <View style={s.sigLine} />
            <View style={s.sigSubLine} />
            <Text style={s.sigSubLbl}>Printed Name</Text>
            <View style={[s.sigSubLine, { marginTop: 10 }]} />
            <Text style={s.sigSubLbl}>Date</Text>
          </View>
        </View>

        <PdfFooter preparedBy={preparedBy} />
      </View>
    </Page>
  )
}

// ── CUSTOMER ROOM PAGE ─────────────────────────────────────────────────────

function CustomerRoomPage({ project, room, roomIndex, totalRooms, rt, preparedBy }) {
  const sections = [
    { label: 'Cabinetry', value: rt.cab },
    { label: 'Upgrades & Options', value: rt.upg },
    { label: 'Finishing', value: rt.fin },
    { label: 'Installation', value: rt.inst },
    ...(project.showDeliveryOnPdf ? [{ label: 'Delivery', value: null }] : []),
  ].filter(sec => sec.value > 0 || sec.value === null)

  const secCols = [
    { w: '60%', label: 'Section' },
    { w: '40%', label: 'Amount', right: true },
  ]

  return (
    <Page size="LETTER" orientation="landscape" style={s.page}>
      <PageHeader
        docType={`QUOTE — ${trunc(room.name || `Room ${roomIndex + 1}`, 30)}`}
        docId={`${fmtId(project.id)}  ·  ${trunc(project.name, 40)}`}
        docDate={fmtD(project.bidDate)}
      />

      <InfoStrip cells={[
        { label: 'Room', value: room.name || `Room ${roomIndex + 1}` },
        { label: 'Room', value: `${roomIndex + 1} of ${totalRooms}` },
        { label: 'Bid Date', value: fmtD(project.bidDate) },
        { label: 'Contact', value: project.contactName },
      ]} />

      <SectionLabel label="Room Cost Summary" />
      <View style={s.tblWrap}>
        <TableHeader colDefs={secCols} />
        {sections.map((sec, i) => (
          <TableRow
            key={i}
            colDefs={secCols}
            isEven={i % 2 === 1}
            cells={[
              { val: sec.label },
              { val: sec.value === null ? '$___' : fmtN(sec.value), amt: true },
            ]}
          />
        ))}
      </View>

      <View wrap={false}>
        <GrandBar
          label="Room Total"
          sub={`${trunc(room.name || `Room ${roomIndex + 1}`, 30)}  ·  Room ${roomIndex + 1} of ${totalRooms}`}
          value={rt.total}
          standalone
        />
        <PdfFooter preparedBy={preparedBy} />
      </View>
    </Page>
  )
}

// ── CUSTOMER DOCUMENT ──────────────────────────────────────────────────────

function CustomerPDFDoc({ project, rooms, roomTotals, delivery, pdfTaxRate, pdfTaxAmt, grandTotal, preparedBy }) {
  return (
    <Document title={`${project.name || 'Quote'} — Quote`} author="Engstrom Wood Products">
      <CustomerSummaryPage
        project={project}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
      />
      {rooms.map((room, i) => (
        <CustomerRoomPage
          key={i}
          project={project}
          room={room}
          roomIndex={i}
          totalRooms={rooms.length}
          rt={roomTotals[i]}
          preparedBy={preparedBy}
        />
      ))}
    </Document>
  )
}

// ── EXPORT FUNCTIONS ───────────────────────────────────────────────────────
// Called from App.jsx; calc functions + PRICING are passed in.

export async function exportPDFInternal(project, rooms, { calcCabinetry, calcUpgrades, calcFinishing, calcInstall, pricing, preparedBy }, onStatus) {
  onStatus('generating')
  try {
    const roomTotals = rooms.map(r => {
      const cab  = calcCabinetry(r.cabinetry)
      const upg  = calcUpgrades(r.upgrades)
      const fin  = calcFinishing(r.finishing)
      const inst = calcInstall(r.install, cab)
      return { name: r.name, cab, upg, fin, inst, total: cab + upg + fin + inst }
    })
    const grandCab  = roomTotals.reduce((s, r) => s + r.cab,  0)
    const grandUpg  = roomTotals.reduce((s, r) => s + r.upg,  0)
    const grandFin  = roomTotals.reduce((s, r) => s + r.fin,  0)
    const grandInst = roomTotals.reduce((s, r) => s + r.inst, 0)
    const delivery   = parseFloat(project.deliveryAmount) || 0
    const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
    const pdfTaxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
    const pdfSubtotal = grandCab + grandUpg + grandFin + grandInst + delivery
    const pdfTaxAmt  = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
    const grandTotal = pdfSubtotal + pdfTaxAmt

    const blob = await pdf(
      <InternalPDFDoc
        project={project}
        rooms={rooms}
        roomTotals={roomTotals}
        grandCab={grandCab}
        grandUpg={grandUpg}
        grandFin={grandFin}
        grandInst={grandInst}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        pricing={pricing}
        preparedBy={preparedBy}
      />
    ).toBlob()

    const safeName   = (project.name    || 'Estimate').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Estimate'
    const safeClient = (project.contactName || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
    const filePrefix = safeClient ? `${safeClient} — ${safeName}` : safeName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filePrefix} — Internal.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    onStatus('done')
  } catch (err) {
    console.error('PDF generation error (internal):', err)
    onStatus('error', err?.message || 'PDF generation failed.')
  }
}

export async function exportPDFCustomer(project, rooms, { calcCabinetry, calcUpgrades, calcFinishing, calcInstall, preparedBy }, onStatus) {
  onStatus('generating')
  try {
    const roomTotals = rooms.map(r => {
      const cab  = calcCabinetry(r.cabinetry)
      const upg  = calcUpgrades(r.upgrades)
      const fin  = calcFinishing(r.finishing)
      const inst = calcInstall(r.install, cab)
      return { name: r.name, cab, upg, fin, inst, total: cab + upg + fin + inst }
    })
    const delivery   = parseFloat(project.deliveryAmount) || 0
    const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
    const pdfTaxRate = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
    const pdfSubtotal = roomTotals.reduce((s, r) => s + r.total, 0) + delivery
    const pdfTaxAmt  = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
    const grandTotal = pdfSubtotal + pdfTaxAmt

    const blob = await pdf(
      <CustomerPDFDoc
        project={project}
        rooms={rooms}
        roomTotals={roomTotals}
        delivery={delivery}
        pdfTaxRate={pdfTaxRate}
        pdfTaxAmt={pdfTaxAmt}
        grandTotal={grandTotal}
        preparedBy={preparedBy}
      />
    ).toBlob()

    const safeName   = (project.name    || 'Quote').replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'Quote'
    const safeClient = (project.contactName || '').replace(/[^a-zA-Z0-9_\- ]/g, '').trim()
    const filePrefix = safeClient ? `${safeClient} — ${safeName}` : safeName
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filePrefix} — Quote.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 30000)
    onStatus('done')
  } catch (err) {
    console.error('PDF generation error (customer):', err)
    onStatus('error', err?.message || 'PDF generation failed.')
  }
}

// Returns the customer PDF as a Blob (no download) — used for email attachment.
export async function buildCustomerPDFBlob(project, rooms, { calcCabinetry, calcUpgrades, calcFinishing, calcInstall, preparedBy }) {
  const roomTotals = rooms.map(r => {
    const cab  = calcCabinetry(r.cabinetry)
    const upg  = calcUpgrades(r.upgrades)
    const fin  = calcFinishing(r.finishing)
    const inst = calcInstall(r.install, cab)
    return { name: r.name, cab, upg, fin, inst, total: cab + upg + fin + inst }
  })
  const delivery    = parseFloat(project.deliveryAmount) || 0
  const pdfTaxEnabled = project.installationType ? project.installationType === "contractor" : project.taxEnabled
  const pdfTaxRate  = project.installationType ? 8.53 : (parseFloat(project.taxRate) || 8)
  const pdfSubtotal = roomTotals.reduce((s, r) => s + r.total, 0) + delivery
  const pdfTaxAmt   = pdfTaxEnabled ? pdfSubtotal * (pdfTaxRate / 100) : 0
  const grandTotal  = pdfSubtotal + pdfTaxAmt

  return pdf(
    <CustomerPDFDoc
      project={project}
      rooms={rooms}
      roomTotals={roomTotals}
      delivery={delivery}
      pdfTaxRate={pdfTaxRate}
      pdfTaxAmt={pdfTaxAmt}
      grandTotal={grandTotal}
      preparedBy={preparedBy}
    />
  ).toBlob()
}
